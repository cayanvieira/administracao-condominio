import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals'
import { accountService, app, authHeaders, condominiumService, resetMocks } from './support/app.ts'

beforeAll(async () => {
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(resetMocks)

describe('rotas de condomínios', () => {
  it('lista condomínios', async () => {
    const response = await app.inject({ method: 'GET', url: '/condominium', headers: authHeaders() })
    expect(response.statusCode).toBe(200)
    expect(condominiumService.findAll).toHaveBeenCalled()
  })

  it('consulta um condomínio', async () => {
    const response = await app.inject({ method: 'GET', url: '/condominium/1', headers: authHeaders() })
    expect(response.statusCode).toBe(200)
    expect(condominiumService.findById).toHaveBeenCalledWith(1)
  })

  it('rejeita id de condomínio inválido', async () => {
    const response = await app.inject({ method: 'GET', url: '/condominium/abc', headers: authHeaders() })
    expect(response.statusCode).toBe(400)
    expect(condominiumService.findById).not.toHaveBeenCalled()
  })

  it('cria um condomínio', async () => {
    const response = await app.inject({
      method: 'POST', url: '/condominium',
      headers: authHeaders(),
      payload: { name: 'Residencial', address: 'Rua A, 10', email: 'contato@example.com' },
    })
    expect(response.statusCode).toBe(201)
  })

  it('atualiza um condomínio', async () => {
    const response = await app.inject({ method: 'PATCH', url: '/condominium/1', headers: authHeaders(), payload: { name: 'Novo Nome' } })
    expect(response.statusCode).toBe(200)
    expect(condominiumService.update).toHaveBeenCalledWith(1, { name: 'Novo Nome' })
  })

  it('remove um condomínio', async () => {
    const response = await app.inject({ method: 'DELETE', url: '/condominium/1', headers: authHeaders() })
    expect(response.statusCode).toBe(204)
  })

  it('lista usuários do condomínio', async () => {
    const response = await app.inject({ method: 'GET', url: '/condominium/1/users', headers: authHeaders() })
    expect(response.statusCode).toBe(200)
  })

  it('vincula usuário ao condomínio', async () => {
    const response = await app.inject({
      method: 'POST', url: '/condominium/1/users', payload: { userId: 2, role: 'sindico' },
      headers: authHeaders(),
    })
    expect(response.statusCode).toBe(201)
    expect(condominiumService.addUser).toHaveBeenCalledWith(1, 2, 'sindico')
  })

  it('permite adicionar morador somente para usuário sindico autenticado pelo login', async () => {
    accountService.login
      .mockResolvedValueOnce({
        token: app.jwt.sign({
          sub: 1,
          userId: 1,
          name: 'Morador',
          email: 'morador@example.com',
          roles: ['morador'],
          condominiums: [{ condominiumId: 1, role: 'morador' }],
        }),
        account: { id: 1 },
      })
      .mockResolvedValueOnce({
        token: app.jwt.sign({
          sub: 2,
          userId: 2,
          name: 'Sindico',
          email: 'sindico@example.com',
          roles: ['sindico'],
          condominiums: [{ condominiumId: 1, role: 'sindico' }],
        }),
        account: { id: 2 },
      })

    const moradorLogin = await app.inject({
      method: 'POST',
      url: '/user/login',
      payload: { email: 'morador@example.com', password: 'SenhaSegura123!' },
    })
    const moradorToken = moradorLogin.json().token

    const moradorResponse = await app.inject({
      method: 'POST',
      url: '/condominium/1/users',
      headers: { authorization: `Bearer ${moradorToken}` },
      payload: { userId: 3, role: 'morador' },
    })

    expect(moradorResponse.statusCode).toBe(403)
    expect(condominiumService.addUser).not.toHaveBeenCalled()

    const sindicoLogin = await app.inject({
      method: 'POST',
      url: '/user/login',
      payload: { email: 'sindico@example.com', password: 'SenhaSegura123!' },
    })
    const sindicoToken = sindicoLogin.json().token

    const sindicoResponse = await app.inject({
      method: 'POST',
      url: '/condominium/1/users',
      headers: { authorization: `Bearer ${sindicoToken}` },
      payload: { userId: 3, role: 'morador' },
    })

    expect(sindicoResponse.statusCode).toBe(201)
    expect(condominiumService.addUser).toHaveBeenCalledWith(1, 3, 'morador')
  })

  it('permite duas roles para o mesmo usuário no condomínio', async () => {
    await app.inject({ method: 'POST', url: '/condominium/1/users', headers: authHeaders(), payload: { userId: 2, role: 'morador' } })
    await app.inject({ method: 'POST', url: '/condominium/1/users', headers: authHeaders(), payload: { userId: 2, role: 'funcionario' } })
    expect(condominiumService.addUser).toHaveBeenNthCalledWith(1, 1, 2, 'morador')
    expect(condominiumService.addUser).toHaveBeenNthCalledWith(2, 1, 2, 'funcionario')
  })

  it('rejeita role inválida no vínculo', async () => {
    const response = await app.inject({
      method: 'POST', url: '/condominium/1/users', payload: { userId: 2, role: 'admin' },
      headers: authHeaders(),
    })
    expect(response.statusCode).toBe(400)
    expect(condominiumService.addUser).not.toHaveBeenCalled()
  })

  it('remove uma role do usuário no condomínio', async () => {
    const response = await app.inject({ method: 'DELETE', url: '/condominium/1/users/2/sindico', headers: authHeaders() })
    expect(response.statusCode).toBe(204)
    expect(condominiumService.removeUser).toHaveBeenCalledWith(1, 2, 'sindico')
  })
})
