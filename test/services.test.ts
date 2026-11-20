import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals'
import {
  app,
  authHeaders,
  condominiumService,
  condominiumServices,
  resetMocks,
  scheduleService,
} from './support/app.ts'

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

  it('retorna somente os horários disponíveis para a data e o fuso enviados', async () => {
    const amenity = {
      id: 2,
      condominium_id: 1,
      name: 'Piscina',
      reservation_hours: 2,
      available_from: '08:00:00',
      available_until: '22:00:00',
      can_schedule: true,
    }
    condominiumServices.findAmenityById.mockResolvedValueOnce(amenity)
    scheduleService.findAvailableSlots.mockResolvedValueOnce([{
      time: '13:00',
      reservation_date: new Date('2026-11-18T16:00:00.000Z'),
      reservation_end: new Date('2026-11-18T18:00:00.000Z'),
    }])

    const response = await app.inject({
      method: 'GET',
      url: '/condominium/1/amenities/2/availability?date=2026-11-18&timezoneOffsetMinutes=180',
      headers: authHeaders(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      date: '2026-11-18',
      availableSlots: [{ time: '13:00' }],
    })
    expect(scheduleService.findAvailableSlots).toHaveBeenCalledWith(
      amenity,
      '2026-11-18',
      180,
    )
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
      payload: {
        name: 'Piscina',
        reservation_hours: 2,
        available_from: '08:00',
        available_until: '22:00',
        can_schedule: true,
      },
    })
    expect(response.statusCode).toBe(201)
    expect(condominiumServices.createAmenity).toHaveBeenCalledWith(1, {
      name: 'Piscina',
      reservation_hours: 2,
      available_from: '08:00',
      available_until: '22:00',
      can_schedule: true,
    })
  })

  it('bloqueia alterações de amenities para moradores', async () => {
    const headers = authHeaders([{ condominiumId: 1, userId: 1, role: 'morador' }])
    const createResponse = await app.inject({
      method: 'POST',
      url: '/condominium/1/amenities',
      headers,
      payload: {
        name: 'Piscina',
        reservation_hours: 2,
        available_from: '08:00',
        available_until: '22:00',
        can_schedule: true,
      },
    })
    const updateResponse = await app.inject({
      method: 'PATCH',
      url: '/condominium/1/amenities/2',
      headers,
      payload: { name: 'Academia' },
    })
    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: '/condominium/1/amenities/2',
      headers,
    })

    expect(createResponse.statusCode).toBe(403)
    expect(updateResponse.statusCode).toBe(403)
    expect(deleteResponse.statusCode).toBe(403)
    expect(condominiumServices.createAmenity).not.toHaveBeenCalled()
    expect(condominiumServices.updateAmenity).not.toHaveBeenCalled()
    expect(condominiumServices.deleteAmenity).not.toHaveBeenCalled()
  })

  it('rejeita serviço com dados inválidos', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/condominium/1/amenities',
      payload: { name: '', reservation_hours: 0 },
      headers: authHeaders(),
    })
    expect(response.statusCode).toBe(400)
    expect(condominiumServices.createAmenity).not.toHaveBeenCalled()
  })

  it('rejeita horários com minutos ao criar ou atualizar uma amenity', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/condominium/1/amenities',
      headers: authHeaders(),
      payload: {
        name: 'Piscina',
        reservation_hours: 2,
        available_from: '08:30',
        available_until: '22:00',
        can_schedule: true,
      },
    })
    const updateResponse = await app.inject({
      method: 'PATCH',
      url: '/condominium/1/amenities/2',
      headers: authHeaders(),
      payload: { available_until: '22:30' },
    })

    expect(createResponse.statusCode).toBe(400)
    expect(updateResponse.statusCode).toBe(400)
    expect(condominiumServices.createAmenity).not.toHaveBeenCalled()
    expect(condominiumServices.updateAmenity).not.toHaveBeenCalled()
  })

  it('atualiza amenity', async () => {
    const response = await app.inject({ method: 'PATCH', url: '/condominium/1/amenities/2', headers: authHeaders(), payload: { name: 'Academia' } })
    expect(response.statusCode).toBe(200)
    expect(condominiumServices.updateAmenity).toHaveBeenCalledWith(2, 1, {
      name: 'Academia',
    })
  })

  it('remove amenity', async () => {
    const response = await app.inject({ method: 'DELETE', url: '/condominium/1/amenities/2', headers: authHeaders() })
    expect(response.statusCode).toBe(204)
    expect(condominiumServices.deleteAmenity).toHaveBeenCalledWith(2, 1)
  })
})
