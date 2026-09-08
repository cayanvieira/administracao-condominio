import { type FastifyReply, type FastifyInstance } from 'fastify'
import { z } from 'zod'
import Services from '../services/index.ts'
import { AccountServiceError } from '../services/account/index.ts'
import { isValidCpfOrCnpj, normalizeDocument } from '../utils/document.ts'

const Service = new Services()

const accountInput = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(2).max(150),
  document: z.string()
    .trim()
    .refine(isValidCpfOrCnpj, 'CPF ou CNPJ invalido')
    .transform(normalizeDocument),
})

const emailAndCodeInput = z.object({
  email: z.string().trim().email(),
  code: z.string().regex(/^\d{5}$/),
})

const emailInput = z.object({ email: z.string().trim().email() })

const sendError = (reply: FastifyReply, error: unknown) => {
  if (error instanceof AccountServiceError) {
    return reply.code(error.statusCode).send({ message: error.message })
  }
  console.error(error)
  return reply.code(500).send({ message: 'Erro interno do servidor' })
}

const Routers = (server: FastifyInstance) => {
  server.post('/register', async (request, reply) => {
    const parsed = accountInput.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados de cadastro invalidos', errors: parsed.error.flatten() })
    }

    try {
      const account = await Service.Account.createAccount(parsed.data)
      return reply.code(201).send({ message: 'Cadastro criado. Verifique seu email para ativar a conta.', account })
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.get('/verify', async (request, reply) => {
    const parsed = emailAndCodeInput.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Email ou codigo de verificacao invalidos' })
    }

    try {
      const account = await Service.Account.verifyAccount(parsed.data.email, parsed.data.code)
      return reply.send({ message: 'Conta ativada com sucesso', account })
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.post('/resend-verification', async (request, reply) => {
    const parsed = emailInput.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Email invalido' })
    }

    try {
      await Service.Account.resendVerification(parsed.data.email)
      return reply.send({ message: 'Email de verificacao reenviado' })
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.post('/login', async (request, reply) => {
    const parsed = z.object({ email: z.string().trim().email(), password: z.string().min(1) }).safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Email ou password invalidos' })
    }

    try {
      return reply.send(await Service.Account.login(parsed.data.email, parsed.data.password))
    } catch (error) {
      return sendError(reply, error)
    }
  })
}

export default Routers