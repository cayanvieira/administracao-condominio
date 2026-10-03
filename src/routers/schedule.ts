import { type FastifyInstance, type FastifyReply } from 'fastify'
import { z } from 'zod'
import Services from '../services/index.ts'
import { CondominiumServiceError } from '../services/condominium/index.ts'
import { ACL, acl } from '../middleware/acl.ts'
import { authenticate } from '../middleware/auth.ts'
import type { Role } from '../auth/roles.ts'

const Service = new Services()

const condominiumIdParam = z.object({ condominiumId: z.coerce.number().int().positive() })
const scheduleParam = z.object({
  condominiumId: z.coerce.number().int().positive(),
  scheduleId: z.coerce.number().int().positive(),
})
const scheduleListQuery = z.object({
  userId: z.coerce.number().int().positive().optional(),
  active: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  from: z.coerce.date().optional(),
})
const scheduleInput = z.object({
  serviceId: z.number().int().positive(),
  reservationDate: z.coerce.date(),
})
const scheduleUpdate = z.object({
  reservationDate: z.coerce.date().optional(),
  active: z.boolean().optional(),
}).refine((body) => body.reservationDate !== undefined || body.active !== undefined, {
  message: 'Nenhum campo para atualizar',
})

const sendError = (reply: FastifyReply, error: unknown) => {
  if (error instanceof CondominiumServiceError) {
    return reply.code(error.statusCode).send({ message: error.message })
  }
  console.error(error)
  return reply.code(500).send({ message: 'Erro interno do servidor' })
}

const rolesInCondominium = (memberships: { condominiumId: number, role: Role }[], condominiumId: number): Role[] =>
  memberships.filter((membership) => membership.condominiumId === condominiumId).map((membership) => membership.role)

const hasConflict = async (reservationDate: Date, serviceId: number, ignoreScheduleId?: number): Promise<boolean> => {
  const conflicts = await Service.Schedule.findScheduleByDate(reservationDate, serviceId)
  return conflicts.some((conflict) => conflict.id !== ignoreScheduleId)
}

const findScheduleInCondominium = async (scheduleId: number, condominiumId: number) => {
  const schedule = await Service.Schedule.findScheduleById(scheduleId)
  if (!schedule) return undefined

  const amenity = await Service.CondominiumAmenitys.findAmenityById(schedule.service_id, condominiumId)
  return amenity ? schedule : undefined
}

const Routers = (server: FastifyInstance) => {
  server.get('/:condominiumId/schedules', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.listSchedules)] }, async (request, reply) => {
    const parsedId = condominiumIdParam.safeParse(request.params)
    const parsedQuery = scheduleListQuery.safeParse(request.query)
    if (!parsedId.success || !parsedQuery.success) return reply.code(400).send({ message: 'Parametros invalidos' })

    const { condominiumId } = parsedId.data
    const { userId, active, from } = parsedQuery.data
    const isSindico = rolesInCondominium(request.user.condominiums, condominiumId).includes('sindico')

    try {
      return reply.send(await Service.Schedule.findSchedulesByCondominium(condominiumId, {
        userId: isSindico ? userId : request.user.userId,
        active,
        from,
      }))
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.post('/:condominiumId/schedules', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.createSchedule)] }, async (request, reply) => {
    const parsedId = condominiumIdParam.safeParse(request.params)
    const parsedBody = scheduleInput.safeParse(request.body)
    if (!parsedId.success || !parsedBody.success) return reply.code(400).send({ message: 'Dados da reserva invalidos' })

    const { condominiumId } = parsedId.data
    const { serviceId, reservationDate } = parsedBody.data

    try {
      const amenity = await Service.CondominiumAmenitys.findAmenityById(serviceId, condominiumId)
      if (!amenity) return reply.code(404).send({ message: 'Amenity nao encontrado' })
      if (!amenity.can_schedule) return reply.code(422).send({ message: 'Este amenity nao aceita reservas' })
      if (await hasConflict(reservationDate, serviceId)) return reply.code(409).send({ message: 'Horario indisponivel' })

      const schedule = await Service.Schedule.createSchedule({
        user_id: request.user.userId,
        service_id: serviceId,
        reservation_date: reservationDate,
      })
      return reply.code(201).send(schedule)
    } catch (error) {
      return sendError(reply, error)
    }
  })

  server.patch('/:condominiumId/schedules/:scheduleId', { onRequest: [authenticate], preHandler: [acl(ACL.condominium.updateSchedule)] }, async (request, reply) => {
    const parsedParams = scheduleParam.safeParse(request.params)
    const parsedBody = scheduleUpdate.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) return reply.code(400).send({ message: 'Dados da reserva invalidos' })

    const { condominiumId, scheduleId } = parsedParams.data
    const { reservationDate, active } = parsedBody.data

    try {
      const schedule = await findScheduleInCondominium(scheduleId, condominiumId)
      if (!schedule) return reply.code(404).send({ message: 'Reserva nao encontrada' })

      const isOwner = schedule.user_id === request.user.userId
      const isSindico = rolesInCondominium(request.user.condominiums, condominiumId).includes('sindico')
      if (!isOwner && !isSindico) return reply.code(403).send({ message: 'Usuario sem permissao' })

      if (reservationDate && await hasConflict(reservationDate, schedule.service_id, scheduleId)) {
        return reply.code(409).send({ message: 'Horario indisponivel' })
      }

      const updated = await Service.Schedule.updateSchedule(scheduleId, {
        ...(reservationDate && { reservation_date: reservationDate }),
        ...(active !== undefined && { active }),
      })
      return reply.send(updated)
    } catch (error) {
      return sendError(reply, error)
    }
  })
}

export default Routers
