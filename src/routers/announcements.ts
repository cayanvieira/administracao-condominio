import { type FastifyInstance, type FastifyReply } from 'fastify'
import { z } from 'zod'
import Services from '../services/index.ts'
import { ACL, acl } from '../middleware/acl.ts'
import { authenticate } from '../middleware/auth.ts'

const Service = new Services()
const announcementQuery = z.object({
  condominiumId: z.coerce.number().int().positive(),
  includeInactive: z.enum(['true', 'false']).optional().transform((value) => value === 'true'),
})
const announcementIdParams = z.object({
  announcementId: z.coerce.number().int().positive(),
})
const announcementDeactivationInput = z.object({
  condominiumId: z.number().int().positive(),
})
const announcementInput = z.object({
  condominiumId: z.number().int().positive(),
  title: z.string().trim().min(1).max(150),
  message: z.string().trim().min(1).max(10000),
  expirationDate: z.string().datetime({ offset: true }).nullable().optional(),
  theme: z.string().trim().max(40).nullable().optional(),
  important: z.boolean().default(false),
})

const sendError = (reply: FastifyReply, error: unknown) => {
  console.error('Erro ao processar avisos:', error)
  return reply.code(500).send({ message: 'Erro interno do servidor' })
}

const Routers = (server: FastifyInstance) => {
  server.get(
    '/',
    { onRequest: [authenticate], preHandler: [acl(ACL.announcements.list)] },
    async (request, reply) => {
      const parsed = announcementQuery.safeParse(request.query)
      if (!parsed.success) {
        return reply.code(400).send({ message: 'Condominio invalido', errors: parsed.error.flatten() })
      }

      if (parsed.data.includeInactive) {
        const canManageAnnouncements = request.user.condominiums.some((membership) =>
          membership.condominiumId === parsed.data.condominiumId
          && (membership.role === 'sindico' || membership.role === 'funcionario'),
        )
        if (!canManageAnnouncements) {
          return reply.code(403).send({ message: 'Usuario sem permissao' })
        }
      }

      try {
        const announcements = await Service.Announcements.findByCondominiumId(
          parsed.data.condominiumId,
          parsed.data.includeInactive ?? false,
        )
        return reply.send(announcements)
      } catch (error) {
        return sendError(reply, error)
      }
    },
  )

  server.post(
    '/',
    { onRequest: [authenticate], preHandler: [acl(ACL.announcements.create)] },
    async (request, reply) => {
      const parsed = announcementInput.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ message: 'Dados do aviso invalidos', errors: parsed.error.flatten() })
      }

      const membership = request.user.condominiums.find((item) =>
        item.condominiumId === parsed.data.condominiumId
        && (item.role === 'sindico' || item.role === 'funcionario'),
      )
      if (!membership || (membership.role !== 'sindico' && membership.role !== 'funcionario')) {
        return reply.code(403).send({ message: 'Usuario sem permissao' })
      }

      try {
        const announcement = await Service.Announcements.create(
          {
            ...parsed.data,
            expirationDate: parsed.data.expirationDate
              ? new Date(parsed.data.expirationDate)
              : null,
          },
          request.user.userId,
          membership.role,
        )
        return reply.code(201).send(announcement)
      } catch (error) {
        return sendError(reply, error)
      }
    },
  )

  server.patch(
    '/:announcementId/deactivate',
    { onRequest: [authenticate], preHandler: [acl(ACL.announcements.deactivate)] },
    async (request, reply) => {
      const parsedParams = announcementIdParams.safeParse(request.params)
      const parsedBody = announcementDeactivationInput.safeParse(request.body)
      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({ message: 'Dados invalidos para desativar aviso' })
      }

      try {
        const deactivated = await Service.Announcements.deactivate(
          parsedParams.data.announcementId,
          parsedBody.data.condominiumId,
        )
        if (!deactivated) {
          return reply.code(404).send({ message: 'Aviso nao encontrado' })
        }
        return reply.send({ id: parsedParams.data.announcementId, active: false })
      } catch (error) {
        return sendError(reply, error)
      }
    },
  )
}

export default Routers
