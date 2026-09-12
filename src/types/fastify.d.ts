import type { CondominiumMembership } from '../auth/roles.ts'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: number
      userId: number
      name: string
      email: string
      condominiums: CondominiumMembership[]
    }
    user: {
      sub: number
      userId: number
      name: string
      email: string
      condominiums: CondominiumMembership[]
    }
  }
}
