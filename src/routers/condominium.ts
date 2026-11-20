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
  unit: z.string().trim().min(1).max(50).nullable().optional(),
})
const timeInput = z.string().regex(/^(?:[01]\d|2[0-3]):00$/)
const amenityFields = z.object({
  name: z.string().trim().min(1).max(150),
  reservation_hours: z.number().int().positive(),
  available_from: timeInput,
  available_until: timeInput,
  can_schedule: z.boolean(),
})
const amenityInput = amenityFields.extend({
  available_from: timeInput.default('00:00'),
  available_until: timeInput.default('23:00'),
  can_schedule: z.boolean().default(true),
}).refine(
  (amenity) => toMinutes(amenity.available_from) < toMinutes(amenity.available_until),
  { message: 'O horário final deve ser posterior ao horário inicial', path: ['available_until'] },
)
const amenityUpdate = amenityFields.partial()

const amenityAvailabilityQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezoneOffsetMinutes: z.coerce.number().int().min(-840).max(840).default(0),
})

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

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
      const { userId, role, unit } = parsedBody.data
      const linkedUser = unit === undefined
        ? await Service.Condominium.addUser(parsedId.data.condominiumId, userId, role)
        : await Service.Condominium.addUser(parsedId.data.condominiumId, userId, role, unit)
      return reply.code(201).send(linkedUser)
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

  server.get('/:condominiumId/amenities', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.listAmenities)] }, async (request, reply) => {
    const parsed = condominiumIdParam.safeParse(request.params)
    if (!parsed.success) return reply.code(400).send({ message: 'Id do condominio invalido' })

    try {
      await Service.Condominium.findById(parsed.data.condominiumId)
      return reply.send(await Service.CondominiumAmenities.findAllAmenitiesByCondominiumIds([parsed.data.condominiumId]))
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.get('/:condominiumId/amenities/:amenityId', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.findAmenity)] }, async (request, reply) => {
    const parsed = z.object({
      condominiumId: z.coerce.number().int().positive(),
      amenityId: z.coerce.number().int().positive(),
    }).safeParse(request.params)
    if (!parsed.success) return reply.code(400).send({ message: 'Ids invalidos' })

    try {
      await Service.Condominium.findById(parsed.data.condominiumId)
      const amenity = await Service.CondominiumAmenities.findAmenityById(parsed.data.amenityId, parsed.data.condominiumId)
      if (!amenity) return reply.code(404).send({ message: 'Servico nao encontrado' })
      return reply.send(amenity)
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.get('/:condominiumId/amenities/:amenityId/availability', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.findAmenity)] }, async (request, reply) => {
    const parsedParams = z.object({
      condominiumId: z.coerce.number().int().positive(),
      amenityId: z.coerce.number().int().positive(),
    }).safeParse(request.params)
    const parsedQuery = amenityAvailabilityQuery.safeParse(request.query)
    if (!parsedParams.success || !parsedQuery.success) {
      return reply.code(400).send({ message: 'Data ou ids invalidos' })
    }

    const { condominiumId, amenityId } = parsedParams.data
    const { date, timezoneOffsetMinutes } = parsedQuery.data
    const [year, month, day] = date.split('-').map(Number)
    const parsedDate = new Date(Date.UTC(year, month - 1, day))
    if (parsedDate.toISOString().slice(0, 10) !== date) {
      return reply.code(400).send({ message: 'Data invalida' })
    }

    try {
      await Service.Condominium.findById(condominiumId)
      const amenity = await Service.CondominiumAmenities.findAmenityById(amenityId, condominiumId)
      if (!amenity) return reply.code(404).send({ message: 'Servico nao encontrado' })
      if (!amenity.can_schedule) return reply.code(422).send({ message: 'Este servico nao aceita reservas' })
      if (toMinutes(amenity.available_until) <= toMinutes(amenity.available_from)) {
        return reply.code(422).send({ message: 'Horario de disponibilidade invalido' })
      }

      const availableSlots = await Service.Schedule.findAvailableSlots(
        amenity,
        date,
        timezoneOffsetMinutes,
      )
      return reply.send({ date, availableSlots })
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.post('/:condominiumId/amenities', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.createAmenity)] }, async (request, reply) => {
    const parsedId = condominiumIdParam.safeParse(request.params)
    const parsedBody = amenityInput.safeParse(request.body)
    if (!parsedId.success || !parsedBody.success) return reply.code(400).send({ message: 'Dados do servico invalidos' })

    try {
      await Service.Condominium.findById(parsedId.data.condominiumId)
      return reply.code(201).send(await Service.CondominiumAmenities.createAmenity(parsedId.data.condominiumId, parsedBody.data))
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.patch('/:condominiumId/amenities/:amenityId', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.updateAmenity)] }, async (request, reply) => {
    const parsed = z.object({
      condominiumId: z.coerce.number().int().positive(),
      amenityId: z.coerce.number().int().positive(),
    }).safeParse(request.params)
    const parsedBody = amenityUpdate.safeParse(request.body)
    if (!parsed.success || !parsedBody.success) return reply.code(400).send({ message: 'Dados do servico invalidos' })

    try {
      await Service.Condominium.findById(parsed.data.condominiumId)
      const currentAmenity = await Service.CondominiumAmenities.findAmenityById(
        parsed.data.amenityId,
        parsed.data.condominiumId,
      )
      if (!currentAmenity) return reply.code(404).send({ message: 'Amenity nao encontrado' })
      const availableFrom = parsedBody.data.available_from ?? currentAmenity.available_from
      const availableUntil = parsedBody.data.available_until ?? currentAmenity.available_until
      if (toMinutes(availableFrom) >= toMinutes(availableUntil)) {
        return reply.code(400).send({ message: 'O horário final deve ser posterior ao horário inicial' })
      }
      const amenity = await Service.CondominiumAmenities.updateAmenity(parsed.data.amenityId, parsed.data.condominiumId, parsedBody.data)
      if (!amenity) return reply.code(404).send({ message: 'Amenity nao encontrado' })
      return reply.send(amenity)
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.delete('/:condominiumId/amenities/:amenityId', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.removeAmenity)] }, async (request, reply) => {
    const parsed = z.object({
      condominiumId: z.coerce.number().int().positive(),
      amenityId: z.coerce.number().int().positive(),
    }).safeParse(request.params)
    if (!parsed.success) return reply.code(400).send({ message: 'Ids invalidos' })

    try {
      await Service.Condominium.findById(parsed.data.condominiumId)
      const deleted = await Service.CondominiumAmenities.deleteAmenity(parsed.data.amenityId, parsed.data.condominiumId)
      if (!deleted) return reply.code(404).send({ message: 'Amenity nao encontrado' })
      return reply.code(204).send()
    } catch (error) {
      return sendError(reply, error)
    }
  })
}

export default Routers
