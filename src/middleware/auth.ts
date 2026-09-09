import type { preHandlerHookHandler } from 'fastify'

export const authenticate: preHandlerHookHandler = async (request) => {
  await request.jwtVerify()
}
