import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { type SignOptions } from 'jsonwebtoken'
import { randomInt } from 'node:crypto'
import { type Knex } from 'knex'
import { EmailService } from '../email/index.ts'

type Account = {
  id: number
  user_id: number
  password: string
  active: boolean
  verification_code: string | null
  verification_expires_at: Date | null
  verified_at: Date | null
}

type UserWithAccount = {
  account_id: number
  user_id: number
  email: string
  password: string
  active: boolean
  verification_code: string | null
  verification_expires_at: Date | null
  verified_at: Date | null
  name: string
  document: string
  created_at: Date
  updated_at: Date
}

type PublicAccount = Omit<UserWithAccount, 'password' | 'verification_code' | 'verification_expires_at'>

export type CreateAccount = {
  email: string
  password: string
  name: string
  document: string,
}

export class AccountServiceError extends Error {
  readonly statusCode: number

  constructor(
    message: string,
    statusCode: number,
  ) {
    super(message)
    this.statusCode = statusCode
  }
}

export class AccountService {
  private readonly database: Knex
  private readonly emailService: EmailService

  constructor(database: Knex, emailService: EmailService) {
    this.database = database
    this.emailService = emailService
  }

  async createAccount(input: CreateAccount): Promise<PublicAccount> {
   
    let result: {account: PublicAccount, verificationCode: string}

    try {
        result = await this.database.transaction(async (transaction) => {
            const existingUser = await transaction('users')
            .where('email', input.email)
            .orWhere('document', input.document)
            .first()

            if (existingUser) {
            throw new AccountServiceError('Email ou documento ja cadastrado', 409)
            }

            const [user] = await transaction('users').insert({
            name: input.name,
            document: input.document,
            email: input.email,
            }).returning('*')
            const verificationCode = this.generateVerificationCode()
            const [createdAccount] = await transaction<Account>('accounts')
            .insert({
                user_id: user.id,
                password: await bcrypt.hash(input.password, 12),
                verification_code: verificationCode,
                verification_expires_at: this.verificationExpiration(),
            })
            .returning('*')

            
            const account = await this.getPublicAccount(transaction, createdAccount.id)
            return {account, verificationCode}
        })
    } catch (error) {
      if (error instanceof AccountServiceError) {
        throw error
      }
      console.error(error)
      throw new AccountServiceError('Nao foi possivel criar a conta', 503)
    }
    
    const { account, verificationCode } = result

    try{
        await this.sendVerificationEmail(account.email, account.name, verificationCode)
        return account
    }catch(error){
        console.error(error)
        throw new AccountServiceError('Nao foi possivel enviar o email de verificacao', 503)
    }
  }

  async verifyAccount(email: string, code: string): Promise<PublicAccount> {
    const account = await this.findUserWithAccount(email)

    if (account.active) {
      return this.toPublicAccount(account)
    }
    if (
      account.verification_code !== code ||
      !account.verification_expires_at ||
      new Date(account.verification_expires_at).getTime() < Date.now()
    ) {
      throw new AccountServiceError('Codigo de verificacao invalido ou expirado', 400)
    }

    const [verifiedAccount] = await this.database<Account>('accounts')
      .where({ id: account.account_id })
      .update({
        active: true,
        verification_code: null,
        verification_expires_at: null,
        verified_at: this.database.fn.now(),
      })
      .returning('*')

    return this.toPublicAccount({ ...account, ...verifiedAccount })
  }

  async resendVerification(email: string): Promise<void> {
    const account = await this.findUserWithAccount(email)

    if (account.active) {
      throw new AccountServiceError('Conta ja esta ativa', 400)
    }

    const verificationCode = this.generateVerificationCode()
    await this.database<Account>('accounts').where({ id: account.account_id }).update({
      verification_code: verificationCode,
      verification_expires_at: this.verificationExpiration(),
    })
    await this.sendVerificationEmail(account.email, account.name, verificationCode)
  }

  async login(email: string, password: string): Promise<{ token: string; account: PublicAccount }> {
    let account: UserWithAccount
    try {
      account = await this.findUserWithAccount(email)
    } catch (error) {
      if (error instanceof AccountServiceError && error.statusCode === 404) {
        throw new AccountServiceError('Email ou password invalidos', 401)
      }
      throw error
    }

    if (!(await bcrypt.compare(password, account.password))) {
      throw new AccountServiceError('Email ou password invalidos', 401)
    }
    if (!account.active) {
      throw new AccountServiceError('Conta ainda nao foi verificada', 403)
    }

    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new AccountServiceError('JWT_SECRET nao configurado', 500)
    }

    return {
      token: jwt.sign({ sub: account.account_id, userId: account.user_id, name: account.name, email: account.email }, secret, {
        expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as SignOptions['expiresIn'],
      }),
      account: this.toPublicAccount(account),
    }
  }

  private async sendVerificationEmail(email: string, name: string, code: string): Promise<void> {
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:3001'}/user/verify?email=${encodeURIComponent(email)}&code=${code}`
    await this.emailService.send({
      to: email,
      subject: 'Verifique sua conta',
      text: `Ola ${name}. Seu codigo de verificacao e ${code}. Acesse: ${verificationUrl}`,
      html: `<p>Ola ${name}.</p><p>Seu codigo de verificacao e <strong>${code}</strong>.</p><p><a href="${verificationUrl}">Ativar minha conta</a></p>`,
    })
  }

  private generateVerificationCode(): string {
    return String(randomInt(10000, 100000))
  }

  private verificationExpiration(): Date {
    return new Date(Date.now() + 15 * 60 * 1000)
  }

  private async findUserWithAccount(email: string): Promise<UserWithAccount> {
    const account = await this.database<Account>('accounts')
      .join('users', 'users.id', 'accounts.user_id')
      .where('users.email', email.toLowerCase() )
      .select(
        'accounts.id as account_id',
        'accounts.user_id',
        'accounts.password',
        'accounts.active',
        'accounts.verification_code',
        'accounts.verification_expires_at',
        'accounts.verified_at',
        'users.email',
        'users.name',
        'users.document',
        'users.created_at',
        'users.updated_at',
      )
      .first()

    if (!account) {
      throw new AccountServiceError('Usuario nao encontrado', 404)
    }
    return account as unknown as UserWithAccount
  }

  private async getPublicAccount(transaction: Knex, accountId: number): Promise<PublicAccount> {
    const account = await transaction<Account>('accounts')
      .join('users', 'users.id', 'accounts.user_id')
      .where('accounts.id', accountId)
      .select(
        'accounts.id as account_id',
        'accounts.user_id',
        'accounts.password',
        'accounts.active',
        'accounts.verification_code',
        'accounts.verification_expires_at',
        'accounts.verified_at',
        'users.email',
        'users.name',
        'users.document',
        'users.created_at',
        'users.updated_at',
      )
      .first()
    return this.toPublicAccount(account as unknown as UserWithAccount)
  }

  private toPublicAccount(account: UserWithAccount): PublicAccount {
    const { password: _password, verification_code: _code, verification_expires_at: _expires, ...publicAccount } = account
    return publicAccount
  }
}