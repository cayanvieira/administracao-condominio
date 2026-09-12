import { type FastifyInstance, type FastifyReply } from 'fastify'
import { z } from 'zod'
import Services from '../services/index.ts'
import { CondominiumServiceError } from '../services/condominium/index.ts'
import { ACL, acl } from '../middleware/acl.ts'
import { authenticate } from '../middleware/auth.ts'

const Service = new Services()

const condominiumIdParam = z.object({ condominiumId: z.coerce.number().int().positive() })
const userLinkParam = z.object({
  condominiumId: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
  role: z.enum(['sindico', 'morador', 'funcionario']),
})
const condominiumInput = z.object({
  name: z.string().trim().min(1).max(150),
  cnpj: z.string().trim().max(18).nullable().default(null),
  address: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(20).nullable().default(null),
})
const condominiumUpdate = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  cnpj: z.string().trim().max(18).nullable().optional(),
  address: z.string().trim().min(1).max(255).optional(),
  email: z.string().trim().email().max(255).optional(),
  phone: z.string().trim().max(20).nullable().optional(),
})
const userInput = z.object({
  userId: z.number().int().positive(),
  role: z.enum(['sindico', 'morador', 'funcionario']),
})
const serviceInput = z.object({
  name: z.string().trim().min(1).max(150),
  minimum_hours: z.number().int().positive(),
  can_schedule: z.boolean().default(true),
})
const serviceUpdate = serviceInput.partial()

const sendError = (reply: FastifyReply, error: unknown) => {
  if (error instanceof CondominiumServiceError) {
    return reply.code(error.statusCode).send({ message: error.message })
  }
  console.error(error)
  return reply.code(500).send({ message: 'Erro interno do servidor' })
}

const Routers = (server: FastifyInstance) => {
  server.get('/', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.list)] }, async (_request, reply) => {
    try {
      return reply.send(await Service.Condominium.findAll())
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.get('/:condominiumId', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.findById)] }, async (request, reply) => {
    const parsed = condominiumIdParam.safeParse(request.params)
    if (!parsed.success) return reply.code(400).send({ message: 'Id do condominio invalido' })

    try {
      return reply.send(await Service.Condominium.findById(parsed.data.condominiumId))
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.post('/', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.create)] }, async (request, reply) => {
    const parsed = condominiumInput.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ message: 'Dados do condominio invalidos', errors: parsed.error.flatten() })

    try {
      return reply.code(201).send(await Service.Condominium.create(parsed.data))
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.patch('/:condominiumId', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.update)] }, async (request, reply) => {
    const parsedId = condominiumIdParam.safeParse(request.params)
    const parsedBody = condominiumUpdate.safeParse(request.body)
    if (!parsedId.success || !parsedBody.success) return reply.code(400).send({ message: 'Dados do condominio invalidos' })

    try {
      return reply.send(await Service.Condominium.update(parsedId.data.condominiumId, parsedBody.data))
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.delete('/:condominiumId', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.remove)] }, async (request, reply) => {
    const parsed = condominiumIdParam.safeParse(request.params)
    if (!parsed.success) return reply.code(400).send({ message: 'Id do condominio invalido' })

    try {
      await Service.Condominium.delete(parsed.data.condominiumId)
      return reply.code(204).send()
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.get('/:condominiumId/users', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.listUsers)] }, async (request, reply) => {
    const parsed = condominiumIdParam.safeParse(request.params)
    if (!parsed.success) return reply.code(400).send({ message: 'Id do condominio invalido' })

    try {
      return reply.send(await Service.Condominium.findUsers(parsed.data.condominiumId))
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.post('/:condominiumId/users', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.addUser)] }, async (request, reply) => {
    const parsedId = condominiumIdParam.safeParse(request.params)
    const parsedBody = userInput.safeParse(request.body)
    if (!parsedId.success || !parsedBody.success) return reply.code(400).send({ message: 'Dados do vinculo invalidos' })

    try {
      return reply.code(201).send(await Service.Condominium.addUser(
        parsedId.data.condominiumId,
        parsedBody.data.userId,
        parsedBody.data.role,
      ))
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.delete('/:condominiumId/users/:userId/:role', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.removeUser)] }, async (request, reply) => {
    const parsed = userLinkParam.safeParse(request.params)
    if (!parsed.success) return reply.code(400).send({ message: 'Dados do vinculo invalidos' })

    try {
      await Service.Condominium.removeUser(parsed.data.condominiumId, parsed.data.userId, parsed.data.role)
      return reply.code(204).send()
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.get('/:condominiumId/services', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.listServices)] }, async (request, reply) => {
    const parsed = condominiumIdParam.safeParse(request.params)
    if (!parsed.success) return reply.code(400).send({ message: 'Id do condominio invalido' })

    try {
      await Service.Condominium.findById(parsed.data.condominiumId)
      return reply.send(await Service.CondominiumAmenitysServices.findAllServices(parsed.data.condominiumId))
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.get('/:condominiumId/services/:serviceId', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.findService)] }, async (request, reply) => {
    const parsed = z.object({
      condominiumId: z.coerce.number().int().positive(),
      serviceId: z.coerce.number().int().positive(),
    }).safeParse(request.params)
    if (!parsed.success) return reply.code(400).send({ message: 'Ids invalidos' })

    try {
      await Service.Condominium.findById(parsed.data.condominiumId)
      const service = await Service.CondominiumAmenitysServices.findServiceById(parsed.data.serviceId, parsed.data.condominiumId)
      if (!service) return reply.code(404).send({ message: 'Servico nao encontrado' })
      return reply.send(service)
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.post('/:condominiumId/services', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.createService)] }, async (request, reply) => {
    const parsedId = condominiumIdParam.safeParse(request.params)
    const parsedBody = serviceInput.safeParse(request.body)
    if (!parsedId.success || !parsedBody.success) return reply.code(400).send({ message: 'Dados do servico invalidos' })

    try {
      await Service.Condominium.findById(parsedId.data.condominiumId)
      return reply.code(201).send(await Service.CondominiumAmenitysServices.createService(parsedId.data.condominiumId, parsedBody.data))
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.patch('/:condominiumId/services/:serviceId', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.updateService)] }, async (request, reply) => {
    const parsed = z.object({
      condominiumId: z.coerce.number().int().positive(),
      serviceId: z.coerce.number().int().positive(),
    }).safeParse(request.params)
    const parsedBody = serviceUpdate.safeParse(request.body)
    if (!parsed.success || !parsedBody.success) return reply.code(400).send({ message: 'Dados do servico invalidos' })

    try {
      await Service.Condominium.findById(parsed.data.condominiumId)
      const service = await Service.CondominiumAmenitysServices.updateService(parsed.data.serviceId, parsed.data.condominiumId, parsedBody.data)
      if (!service) return reply.code(404).send({ message: 'Servico nao encontrado' })
      return reply.send(service)
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.delete('/:condominiumId/services/:serviceId', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.removeService)] }, async (request, reply) => {
    const parsed = z.object({
      condominiumId: z.coerce.number().int().positive(),
      serviceId: z.coerce.number().int().positive(),
    }).safeParse(request.params)
    if (!parsed.success) return reply.code(400).send({ message: 'Ids invalidos' })

    try {
      await Service.Condominium.findById(parsed.data.condominiumId)
      const deleted = await Service.CondominiumAmenitysServices.deleteService(parsed.data.serviceId, parsed.data.condominiumId)
      if (!deleted) return reply.code(404).send({ message: 'Servico nao encontrado' })
      return reply.code(204).send()
    } catch (error) {
      return sendError(reply, error)
    }
  })
}

export default Routers
