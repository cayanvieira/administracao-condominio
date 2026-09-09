import fastifyJwt from '@fastify/jwt'
import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const jwtPlugin: FastifyPluginAsync = fp(async (server) => {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_SECRET nao configurado')
  }

  await server.register(fastifyJwt, {
    secret,
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
  })
})

export default jwtPlugin
