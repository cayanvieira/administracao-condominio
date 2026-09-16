import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals'
import { app, authHeaders, resetMocks, scheduleGraph } from './support/app.ts'

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
      headers: authHeaders(),
      payload: { question: 'Quero reservar a piscina', userId: 1, condominiumIds: [1] },
    })
    expect(response.statusCode).toBe(200)
    expect(scheduleGraph.handleQuestion).toHaveBeenCalledWith(
      'Quero reservar a piscina', 1, [1], undefined,
    )
  })

  it('rejeita chat sem autenticação', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/main/chat',
      payload: { question: 'Quero reservar a piscina', userId: 1, condominiumId: 1 },
    })
    expect(response.statusCode).toBe(401)
    expect(scheduleGraph.handleQuestion).not.toHaveBeenCalled()
  })

  it('rejeita token sem roles', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/main/chat',
      headers: {
        authorization: `Bearer ${app.jwt.sign({
          sub: 1,
          userId: 1,
          name: 'Ana Silva',
          email: 'ana@example.com',
          roles: [],
          condominiums: [],
        })}`,
      },
      payload: { question: 'Quero reservar a piscina', userId: 1, condominiumIds: [1] },
    })
    expect(response.statusCode).toBe(403)
    expect(scheduleGraph.handleQuestion).not.toHaveBeenCalled()
  })

  it('exige usuário e condomínio no chat', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/main/chat',
      headers: authHeaders(),
      payload: { question: 'Quero reservar a piscina' },
    })
    expect(response.statusCode).toBe(400)
    expect(scheduleGraph.handleQuestion).not.toHaveBeenCalled()
  })
})
