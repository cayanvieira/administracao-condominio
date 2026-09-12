import type { Knex } from 'knex'

export type Condominium = {
  id: number
  name: string
  cnpj: string | null
  address: string
  email: string
  phone: string | null
  created_at: Date
  updated_at: Date
}

export type CreateCondominium = Pick<Condominium, 'name' | 'cnpj' | 'address' | 'email' | 'phone'>
export type UpdateCondominium = Partial<CreateCondominium>

export type CondominiumRole = 'sindico' | 'morador' | 'funcionario'

export type CondominiumUser = {
  id: number
  condominium_id: number
  user_id: number
  name: string
  document: string
  email: string | null
  role: CondominiumRole
  created_at: Date
  updated_at: Date
}

export class CondominiumServiceError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
  }
}

export class CondominiumService {
  private readonly database: Knex

  constructor(database: Knex) {
    this.database = database
  }

  async findAll(): Promise<Condominium[]> {
    return this.database<Condominium>('condominiums').select('*').orderBy('name')
  }

  async findById(id: number): Promise<Condominium> {
    const condominium = await this.database<Condominium>('condominiums').where({ id }).first()
    if (!condominium) {
      throw new CondominiumServiceError('Condominio nao encontrado', 404)
    }
    return condominium
  }

  async create(input: CreateCondominium): Promise<Condominium> {
    try {
      const [condominium] = await this.database<Condominium>('condominiums')
        .insert(input)
        .returning('*')
      return condominium
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new CondominiumServiceError('CNPJ ja cadastrado', 409)
      }
      throw error
    }
  }

  async update(id: number, input: UpdateCondominium): Promise<Condominium> {
    await this.findById(id)

    try {
      const [condominium] = await this.database<Condominium>('condominiums')
        .where({ id })
        .update({ ...input, updated_at: this.database.fn.now() })
        .returning('*')
      return condominium
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new CondominiumServiceError('CNPJ ja cadastrado', 409)
      }
      throw error
    }
  }

  async delete(id: number): Promise<void> {
    const deletedRows = await this.database<Condominium>('condominiums').where({ id }).del()
    if (deletedRows === 0) {
      throw new CondominiumServiceError('Condominio nao encontrado', 404)
    }
  }

  async findUsers(condominiumId: number): Promise<CondominiumUser[]> {
    await this.findById(condominiumId)
    return this.database('condominium_users')
      .join('users', 'users.id', 'condominium_users.user_id')
      .where('condominium_users.condominium_id', condominiumId)
      .select(
        'condominium_users.id',
        'condominium_users.condominium_id',
        'users.id as user_id',
        'users.name',
        'users.document',
        'users.email',
        'condominium_users.role',
        'condominium_users.created_at',
        'condominium_users.updated_at',
      )
      .orderBy('users.name') as Promise<CondominiumUser[]>
  }

  async findUserRole(condominiumId: number, userId: number): Promise<string | undefined> {
    const link = await this.database('condominium_users')
      .where({ condominium_id: condominiumId, user_id: userId })
      .select('role')
      .first()

    return link?.role
  }

  async addUser(condominiumId: number, userId: number, role: string): Promise<CondominiumUser> {
    await this.findById(condominiumId)
    const user = await this.database('users').where({ id: userId }).first()
    if (!user) {
      throw new CondominiumServiceError('Usuario nao encontrado', 404)
    }

    try {
      const [link] = await this.database('condominium_users')
        .insert({ condominium_id: condominiumId, user_id: userId, role })
        .returning('*')
      return { ...user, ...link, user_id: user.id }
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new CondominiumServiceError('Usuario ja vinculado a este condominio', 409)
      }
      throw error
    }
  }

  async removeUser(condominiumId: number, userId: number, role: CondominiumRole): Promise<void> {
    const deletedRows = await this.database('condominium_users')
      .where({ condominium_id: condominiumId, user_id: userId, role })
      .del()
    if (deletedRows === 0) {
      throw new CondominiumServiceError('Vinculo nao encontrado', 404)
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505')
  }
}
