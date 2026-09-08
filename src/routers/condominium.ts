import { type FastifyInstance, type FastifyReply } from 'fastify'
import { z } from 'zod'
import Services from '../services/index.ts'
import { CondominiumServiceError } from '../services/condominium/index.ts'

const Service = new Services()

const idParam = z.object({ id: z.coerce.number().int().positive() })
const userLinkParam = z.object({
  id: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
  role: z.enum(['sindico', 'morador', 'funcionario']),
})
const condominiumInput = z.object({
  name: z.string().trim().min(1).max(150),
  cnpj: z.string().trim().max(18).nullable().optional(),
  address: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(20).nullable().optional(),
})
const condominiumUpdate = condominiumInput.partial()
const userInput = z.object({
  userId: z.number().int().positive(),
  role: z.enum(['sindico', 'morador', 'funcionario']),
})

const sendError = (reply: FastifyReply, error: unknown) => {
  if (error instanceof CondominiumServiceError) {
    return reply.code(error.statusCode).send({ message: error.message })
  }
  console.error(error)
  return reply.code(500).send({ message: 'Erro interno do servidor' })
}

const Routers = (server: FastifyInstance) => {
  server.get('/', async (_request, reply) => {
    try {
      return reply.send(await Service.Condominium.findAll())
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.get('/:id', async (request, reply) => {
    const parsed = idParam.safeParse(request.params)
    if (!parsed.success) return reply.code(400).send({ message: 'Id do condominio invalido' })

    try {
      return reply.send(await Service.Condominium.findById(parsed.data.id))
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.post('/', async (request, reply) => {
    const parsed = condominiumInput.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ message: 'Dados do condominio invalidos', errors: parsed.error.flatten() })

    try {
      return reply.code(201).send(await Service.Condominium.create(parsed.data))
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.patch('/:id', async (request, reply) => {
    const parsedId = idParam.safeParse(request.params)
    const parsedBody = condominiumUpdate.safeParse(request.body)
    if (!parsedId.success || !parsedBody.success) return reply.code(400).send({ message: 'Dados do condominio invalidos' })

    try {
      return reply.send(await Service.Condominium.update(parsedId.data.id, parsedBody.data))
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.delete('/:id', async (request, reply) => {
    const parsed = idParam.safeParse(request.params)
    if (!parsed.success) return reply.code(400).send({ message: 'Id do condominio invalido' })

    try {
      await Service.Condominium.delete(parsed.data.id)
      return reply.code(204).send()
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.get('/:id/users', async (request, reply) => {
    const parsed = idParam.safeParse(request.params)
    if (!parsed.success) return reply.code(400).send({ message: 'Id do condominio invalido' })

    try {
      return reply.send(await Service.Condominium.findUsers(parsed.data.id))
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.post('/:id/users', async (request, reply) => {
    const parsedId = idParam.safeParse(request.params)
    const parsedBody = userInput.safeParse(request.body)
    if (!parsedId.success || !parsedBody.success) return reply.code(400).send({ message: 'Dados do vinculo invalidos' })

    try {
      return reply.code(201).send(await Service.Condominium.addUser(
        parsedId.data.id,
        parsedBody.data.userId,
        parsedBody.data.role,
      ))
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.delete('/:id/users/:userId/:role', async (request, reply) => {
    const parsed = userLinkParam.safeParse(request.params)
    if (!parsed.success) return reply.code(400).send({ message: 'Dados do vinculo invalidos' })

    try {
      await Service.Condominium.removeUser(parsed.data.id, parsed.data.userId, parsed.data.role)
      return reply.code(204).send()
    } catch (error) {
      return sendError(reply, error)
    }
  })
}

export default Routers
