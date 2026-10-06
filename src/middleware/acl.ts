import type { preHandlerHookHandler } from 'fastify'
import { ALL_ROLES, type CondominiumMembership, type Role } from '../auth/roles.ts'

export type AclRoute = {
  url: string
  type: 'public' | 'private'
  roles: readonly Role[]
}

export const ACL = {
  root: { url: '/', type: 'public', roles: [] },
  user: {
    register: { url: '/user/register', type: 'public', roles: [] },
    verify: { url: '/user/verify', type: 'public', roles: [] },
    resendVerification: { url: '/user/resend-verification', type: 'public', roles: [] },
    login: { url: '/user/login', type: 'public', roles: [] },
  },
  main: {
    chat: {
      url: '/main/chat',
      type: 'private',
      roles: ALL_ROLES,
    },
  },
  condominium: {
    list: { url: '/condominium', type: 'private', roles: ALL_ROLES },
    findById: { url: '/condominium/:condominiumId', type: 'private', roles: ALL_ROLES },
    create: { url: '/condominium', type: 'private', roles: ALL_ROLES },
    update: { url: '/condominium/:condominiumId', type: 'private', roles: ALL_ROLES },
    remove: { url: '/condominium/:condominiumId', type: 'private', roles: ALL_ROLES },
    listUsers: { url: '/condominium/:condominiumId/users', type: 'private', roles: ALL_ROLES },
    addUser: { url: '/condominium/:condominiumId/users', type: 'private', roles: ["sindico"] },
    removeUser: { url: '/condominium/:condominiumId/users/:userId/:role', type: 'private', roles: ["sindico"] },
    listAmenitys: { url: '/condominium/:condominiumId/amenitys', type: 'private', roles: ALL_ROLES },
    findAmenity: { url: '/condominium/:condominiumId/amenitys/:amenityId', type: 'private', roles: ALL_ROLES },
    createAmenity: { url: '/condominium/:condominiumId/amenitys', type: 'private', roles: ALL_ROLES },
    updateAmenity: { url: '/condominium/:condominiumId/amenitys/:amenityId', type: 'private', roles: ALL_ROLES },
    removeAmenity: { url: '/condominium/:condominiumId/amenitys/:amenityId', type: 'private', roles: ALL_ROLES },
    listSchedules: { url: '/condominium/:condominiumId/schedules', type: 'private', roles: ALL_ROLES },
    createSchedule: { url: '/condominium/:condominiumId/schedules', type: 'private', roles: ['morador', 'sindico'] },
    updateSchedule: { url: '/condominium/:condominiumId/schedules/:scheduleId', type: 'private', roles: ALL_ROLES },
    deleteSchedule: { url: '/condominium/:condominiumId/schedules/:scheduleId', type: 'private', roles: ALL_ROLES },
  },
} as const

export const acl = (route: AclRoute): preHandlerHookHandler => async (request, reply) => {
  if (route.type === 'public') {
    return
  }

  const params = request.params as { condominiumId?: string } | undefined
  const body = request.body as { condominiumId?: number; condominiumIds?: number[] } | undefined
  const rawCondominiumId = params?.condominiumId ?? body?.condominiumId
  const condominiumId = rawCondominiumId === undefined ? undefined : Number(rawCondominiumId)

  if (condominiumId !== undefined) {
    if (!Number.isInteger(condominiumId) || condominiumId < 1) {
      return reply.code(400).send({ message: 'Id do condominio invalido' })
    }
  }

  const authenticatedRequest = request as typeof request & {
    user?: { condominiums: CondominiumMembership[] }
  }
  const hasPermission = authenticatedRequest.user?.condominiums.some((membership: CondominiumMembership) => (
    (condominiumId === undefined || membership.condominiumId === condominiumId)
    && route.roles.includes(membership.role)
  ))

  if (!hasPermission) {
    return reply.code(403).send({ message: 'Usuario sem permissao' })
  }
}
