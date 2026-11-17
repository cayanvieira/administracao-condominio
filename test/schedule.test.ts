import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals'
import {
  app,
  authHeaders,
  condominiumService,
  scheduleService,
  resetMocks,
} from './support/app.ts'

beforeAll(async () => {
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(resetMocks)

describe('reservas do condomínio', () => {
  const reservationDate = '2026-11-18T18:00:00.000Z'

  it('registra como responsável o usuário que fez a própria reserva', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/condominium/1/schedules',
      headers: authHeaders([{ condominiumId: 1, userId: 1, role: 'morador' }]),
      payload: { amenityId: 1, reservationDate },
    })

    expect(response.statusCode).toBe(201)
    expect(scheduleService.createSchedule).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 1,
      createdByUserId: 1,
      amenity_id: 1,
    }))
  })

  it('permite ao síndico reservar para um membro e registra o síndico como responsável', async () => {
    condominiumService.findUsers.mockResolvedValueOnce([
      { user_id: 2, role: 'funcionario' },
    ])

    const response = await app.inject({
      method: 'POST',
      url: '/condominium/1/schedules',
      headers: authHeaders([{ condominiumId: 1, userId: 1, role: 'sindico' }]),
      payload: { amenityId: 1, reservationDate, forUserId: 2 },
    })

    expect(response.statusCode).toBe(201)
    expect(scheduleService.createSchedule).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 2,
      createdByUserId: 1,
      amenity_id: 1,
    }))
  })

  it('impede o morador de reservar para outro membro', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/condominium/1/schedules',
      headers: authHeaders([{ condominiumId: 1, userId: 1, role: 'morador' }]),
      payload: { amenityId: 1, reservationDate, forUserId: 2 },
    })

    expect(response.statusCode).toBe(403)
    expect(scheduleService.createSchedule).not.toHaveBeenCalled()
  })

  it('impede reservar para um usuário que não está vinculado ao condomínio', async () => {
    condominiumService.findUsers.mockResolvedValueOnce([
      { user_id: 1, role: 'sindico' },
    ])

    const response = await app.inject({
      method: 'POST',
      url: '/condominium/1/schedules',
      headers: authHeaders([{ condominiumId: 1, userId: 1, role: 'sindico' }]),
      payload: { amenityId: 1, reservationDate, forUserId: 2 },
    })

    expect(response.statusCode).toBe(404)
    expect(scheduleService.createSchedule).not.toHaveBeenCalled()
  })

  it('registra o usuário que editou a reserva', async () => {
    scheduleService.findScheduleById.mockResolvedValueOnce({ id: 5, user_id: 1, amenity_id: 1 })

    const response = await app.inject({
      method: 'PATCH',
      url: '/condominium/1/schedules/5',
      headers: authHeaders([{ condominiumId: 1, userId: 2, role: 'morador' }]),
      payload: { active: false },
    })

    expect(response.statusCode).toBe(200)
    expect(scheduleService.updateSchedule).toHaveBeenCalledWith(5, {
      active: false,
      editByUserId: 1,
    })
  })

  it('registra o síndico que editou a reserva de outro membro', async () => {
    scheduleService.findScheduleById.mockResolvedValueOnce({ id: 5, user_id: 2, amenity_id: 1 })

    const response = await app.inject({
      method: 'PATCH',
      url: '/condominium/1/schedules/5',
      headers: authHeaders([{ condominiumId: 1, userId: 1, role: 'sindico' }]),
      payload: { active: false },
    })

    expect(response.statusCode).toBe(200)
    expect(scheduleService.updateSchedule).toHaveBeenCalledWith(5, {
      active: false,
      editByUserId: 1,
    })
  })

  it('rejeita a edição quando o horário selecionado já está ocupado', async () => {
    scheduleService.findScheduleById.mockResolvedValueOnce({ id: 5, user_id: 1, amenity_id: 1 })
    scheduleService.findScheduleByDate.mockResolvedValueOnce([{ id: 6 }])

    const response = await app.inject({
      method: 'PATCH',
      url: '/condominium/1/schedules/5',
      headers: authHeaders([{ condominiumId: 1, userId: 1, role: 'morador' }]),
      payload: { reservationDate: reservationDate },
    })

    expect(response.statusCode).toBe(409)
    expect(scheduleService.updateSchedule).not.toHaveBeenCalled()
  })
})
