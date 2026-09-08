import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals'
import { app, resetMocks, scheduleGraph } from './support/app.ts'

beforeAll(async () => {
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(resetMocks)

describe('rotas básicas e chat', () => {
  it('responde na raiz', async () => {
    const response = await app.inject({ method: 'GET', url: '/' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ message: 'Servidor Fastify funcionando!!' })
  })

  it('executa o chat com usuário e condomínio', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/main/chat',
      payload: { question: 'Quero reservar a piscina', userId: 1, condominiumId: 1 },
    })
    expect(response.statusCode).toBe(200)
    expect(scheduleGraph.handleQuestion).toHaveBeenCalledWith(
      'Quero reservar a piscina', 1, 1, undefined,
    )
  })

  it('exige usuário e condomínio no chat', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/main/chat',
      payload: { question: 'Quero reservar a piscina' },
    })
    expect(response.statusCode).toBe(400)
    expect(scheduleGraph.handleQuestion).not.toHaveBeenCalled()
  })
})
