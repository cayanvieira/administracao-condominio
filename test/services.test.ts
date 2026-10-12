import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals'
import { app, authHeaders, condominiumService, condominiumServices, resetMocks } from './support/app.ts'

beforeAll(async () => {
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(resetMocks)

describe('rotas de amenities do condomínio', () => {
  it('lista amenities', async () => {
    const response = await app.inject({ method: 'GET', url: '/condominium/1/amenities', headers: authHeaders() })
    expect(response.statusCode).toBe(200)
    expect(condominiumServices.findAllAmenitiesByCondominiumIds).toHaveBeenCalledWith([1])
  })

  it('consulta serviços somente depois de validar o condomínio', async () => {
    await app.inject({
      method: 'GET',
      url: '/condominium/7/amenities',
      headers: authHeaders([{ condominiumId: 7, userId: 1, role: 'sindico' }]),
    })
    expect(condominiumService.findById).toHaveBeenCalledWith(7)
    expect(condominiumServices.findAllAmenitiesByCondominiumIds).toHaveBeenCalledWith([7])
  })

  it('consulta amenity', async () => {
    const response = await app.inject({ method: 'GET', url: '/condominium/1/amenities/2', headers: authHeaders() })
    expect(response.statusCode).toBe(200)
    expect(condominiumServices.findAmenityById).toHaveBeenCalledWith(2, 1)
  })

  it('retorna 404 para serviço inexistente no condomínio', async () => {
    condominiumServices.findAmenityById.mockResolvedValueOnce(undefined)
    const response = await app.inject({ method: 'GET', url: '/condominium/1/amenities/999', headers: authHeaders() })
    expect(response.statusCode).toBe(404)
  })

  it('cria amenity', async () => {
    const response = await app.inject({
      method: 'POST', url: '/condominium/1/amenities',
      headers: authHeaders(),
      payload: { name: 'Piscina', minimum_hours: 2, can_schedule: true },
    })
    expect(response.statusCode).toBe(201)
    expect(condominiumServices.createAmenity).toHaveBeenCalledWith(1, {
      name: 'Piscina', minimum_hours: 2, can_schedule: true,
    })
  })

  it('rejeita serviço com dados inválidos', async () => {
    const response = await app.inject({
      method: 'POST', url: '/condominium/1/amenities', payload: { name: '', minimum_hours: 0 },
      headers: authHeaders(),
    })
    expect(response.statusCode).toBe(400)
    expect(condominiumServices.createAmenity).not.toHaveBeenCalled()
  })

  it('atualiza amenity', async () => {
    const response = await app.inject({ method: 'PATCH', url: '/condominium/1/amenities/2', headers: authHeaders(), payload: { name: 'Academia' } })
    expect(response.statusCode).toBe(200)
    expect(condominiumServices.updateAmenity).toHaveBeenCalledWith(2, 1, {
      name: 'Academia', can_schedule: true,
    })
  })

  it('remove amenity', async () => {
    const response = await app.inject({ method: 'DELETE', url: '/condominium/1/amenities/2', headers: authHeaders() })
    expect(response.statusCode).toBe(204)
    expect(condominiumServices.deleteAmenity).toHaveBeenCalledWith(2, 1)
  })
})
