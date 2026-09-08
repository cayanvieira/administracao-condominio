import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals'
import { app, condominiumService, resetMocks } from './support/app.ts'

beforeAll(async () => {
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(resetMocks)

describe('rotas de condomínios', () => {
  it('lista condomínios', async () => {
    const response = await app.inject({ method: 'GET', url: '/condominium' })
    expect(response.statusCode).toBe(200)
    expect(condominiumService.findAll).toHaveBeenCalled()
  })

  it('consulta um condomínio', async () => {
    const response = await app.inject({ method: 'GET', url: '/condominium/1' })
    expect(response.statusCode).toBe(200)
    expect(condominiumService.findById).toHaveBeenCalledWith(1)
  })

  it('rejeita id de condomínio inválido', async () => {
    const response = await app.inject({ method: 'GET', url: '/condominium/abc' })
    expect(response.statusCode).toBe(400)
    expect(condominiumService.findById).not.toHaveBeenCalled()
  })

  it('cria um condomínio', async () => {
    const response = await app.inject({
      method: 'POST', url: '/condominium',
      payload: { name: 'Residencial', address: 'Rua A, 10', email: 'contato@example.com' },
    })
    expect(response.statusCode).toBe(201)
  })

  it('atualiza um condomínio', async () => {
    const response = await app.inject({ method: 'PATCH', url: '/condominium/1', payload: { name: 'Novo Nome' } })
    expect(response.statusCode).toBe(200)
    expect(condominiumService.update).toHaveBeenCalledWith(1, { name: 'Novo Nome' })
  })

  it('remove um condomínio', async () => {
    const response = await app.inject({ method: 'DELETE', url: '/condominium/1' })
    expect(response.statusCode).toBe(204)
  })

  it('lista usuários do condomínio', async () => {
    const response = await app.inject({ method: 'GET', url: '/condominium/1/users' })
    expect(response.statusCode).toBe(200)
  })

  it('vincula usuário ao condomínio', async () => {
    const response = await app.inject({
      method: 'POST', url: '/condominium/1/users', payload: { userId: 2, role: 'sindico' },
    })
    expect(response.statusCode).toBe(201)
    expect(condominiumService.addUser).toHaveBeenCalledWith(1, 2, 'sindico')
  })

  it('permite duas roles para o mesmo usuário no condomínio', async () => {
    await app.inject({ method: 'POST', url: '/condominium/1/users', payload: { userId: 2, role: 'morador' } })
    await app.inject({ method: 'POST', url: '/condominium/1/users', payload: { userId: 2, role: 'funcionario' } })
    expect(condominiumService.addUser).toHaveBeenNthCalledWith(1, 1, 2, 'morador')
    expect(condominiumService.addUser).toHaveBeenNthCalledWith(2, 1, 2, 'funcionario')
  })

  it('rejeita role inválida no vínculo', async () => {
    const response = await app.inject({
      method: 'POST', url: '/condominium/1/users', payload: { userId: 2, role: 'admin' },
    })
    expect(response.statusCode).toBe(400)
    expect(condominiumService.addUser).not.toHaveBeenCalled()
  })

  it('remove uma role do usuário no condomínio', async () => {
    const response = await app.inject({ method: 'DELETE', url: '/condominium/1/users/2/sindico' })
    expect(response.statusCode).toBe(204)
    expect(condominiumService.removeUser).toHaveBeenCalledWith(1, 2, 'sindico')
  })
})
