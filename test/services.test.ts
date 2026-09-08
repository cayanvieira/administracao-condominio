import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals'
import { app, condominiumService, condominiumServices, resetMocks } from './support/app.ts'

beforeAll(async () => {
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(resetMocks)

describe('rotas de serviços do condomínio', () => {
  it('lista serviços', async () => {
    const response = await app.inject({ method: 'GET', url: '/condominium/1/services' })
    expect(response.statusCode).toBe(200)
    expect(condominiumServices.findAllServices).toHaveBeenCalledWith(1)
  })

  it('consulta serviços somente depois de validar o condomínio', async () => {
    await app.inject({ method: 'GET', url: '/condominium/7/services' })
    expect(condominiumService.findById).toHaveBeenCalledWith(7)
    expect(condominiumServices.findAllServices).toHaveBeenCalledWith(7)
  })

  it('consulta serviço', async () => {
    const response = await app.inject({ method: 'GET', url: '/condominium/1/services/2' })
    expect(response.statusCode).toBe(200)
    expect(condominiumServices.findServiceById).toHaveBeenCalledWith(2, 1)
  })

  it('retorna 404 para serviço inexistente no condomínio', async () => {
    condominiumServices.findServiceById.mockResolvedValueOnce(undefined)
    const response = await app.inject({ method: 'GET', url: '/condominium/1/services/999' })
    expect(response.statusCode).toBe(404)
  })

  it('cria serviço', async () => {
    const response = await app.inject({
      method: 'POST', url: '/condominium/1/services',
      payload: { name: 'Piscina', minimum_hours: 2, can_schedule: true },
    })
    expect(response.statusCode).toBe(201)
    expect(condominiumServices.createService).toHaveBeenCalledWith(1, {
      name: 'Piscina', minimum_hours: 2, can_schedule: true,
    })
  })

  it('rejeita serviço com dados inválidos', async () => {
    const response = await app.inject({
      method: 'POST', url: '/condominium/1/services', payload: { name: '', minimum_hours: 0 },
    })
    expect(response.statusCode).toBe(400)
    expect(condominiumServices.createService).not.toHaveBeenCalled()
  })

  it('atualiza serviço', async () => {
    const response = await app.inject({ method: 'PATCH', url: '/condominium/1/services/2', payload: { name: 'Academia' } })
    expect(response.statusCode).toBe(200)
    expect(condominiumServices.updateService).toHaveBeenCalledWith(2, 1, {
      name: 'Academia', can_schedule: true,
    })
  })

  it('remove serviço', async () => {
    const response = await app.inject({ method: 'DELETE', url: '/condominium/1/services/2' })
    expect(response.statusCode).toBe(204)
    expect(condominiumServices.deleteService).toHaveBeenCalledWith(2, 1)
  })
})
