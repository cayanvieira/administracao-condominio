import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals'
import { accountService, app, resetMocks } from './support/app.ts'

beforeAll(async () => {
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(resetMocks)

describe('rotas de autenticação', () => {
  it('registra uma conta', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/user/register',
      payload: { name: 'Ana Silva', email: 'ana@example.com', password: 'SenhaSegura123!', document: '52998224725' },
    })
    expect(response.statusCode).toBe(201)
    expect(accountService.createAccount).toHaveBeenCalled()
  })

  it('valida cadastro inválido', async () => {
    const response = await app.inject({ method: 'POST', url: '/user/register', payload: {} })
    expect(response.statusCode).toBe(400)
  })

  it.each([
    ['sem número', 'SenhaSegura!'],
    ['sem símbolo', 'SenhaSegura123'],
    ['sem maiúscula', 'senhasegura123!'],
    ['sem minúscula', 'SENHASEGURA123!'],
  ])('rejeita senha %s', async (_description, password) => {
    const response = await app.inject({
      method: 'POST',
      url: '/user/register',
      payload: { name: 'Ana Silva', email: 'ana@example.com', password, document: '52998224725' },
    })
    expect(response.statusCode).toBe(400)
    expect(accountService.createAccount).not.toHaveBeenCalled()
  })

  it('verifica a conta', async () => {
    const response = await app.inject({ method: 'GET', url: '/user/verify?email=ana@example.com&code=12345' })
    expect(response.statusCode).toBe(200)
    expect(accountService.verifyAccount).toHaveBeenCalledWith('ana@example.com', '12345')
  })

  it('reenvia a verificação', async () => {
    const response = await app.inject({
      method: 'POST', url: '/user/resend-verification', payload: { email: 'ana@example.com' },
    })
    expect(response.statusCode).toBe(200)
    expect(accountService.resendVerification).toHaveBeenCalledWith('ana@example.com')
  })

  it('realiza login', async () => {
    const response = await app.inject({
      method: 'POST', url: '/user/login', payload: { email: 'ana@example.com', password: 'SenhaSegura123!' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().token).toBe('token')
  })

  it('rejeita login inválido', async () => {
    const response = await app.inject({
      method: 'POST', url: '/user/login', payload: { email: 'email-invalido', password: '' },
    })
    expect(response.statusCode).toBe(400)
    expect(accountService.login).not.toHaveBeenCalled()
  })

  it('rejeita código de verificação inválido', async () => {
    const response = await app.inject({
      method: 'GET', url: '/user/verify?email=ana@example.com&code=1234',
    })
    expect(response.statusCode).toBe(400)
    expect(accountService.verifyAccount).not.toHaveBeenCalled()
  })
})
