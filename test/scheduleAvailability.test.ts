import knex from 'knex'
import { afterAll, describe, expect, it, jest } from '@jest/globals'
import {
  parseLocalDateTime,
  ScheduleService,
  type Schedule,
} from '../src/services/schedule/index.ts'

const database = knex({ client: 'pg' })

afterAll(async () => {
  await database.destroy()
})

describe('disponibilidade de reservas', () => {
  it('converte hora local em UTC e aceita somente início em hora cheia', () => {
    expect(parseLocalDateTime('2099-08-12T13:00:00.000Z', 180, true)?.toISOString())
      .toBe('2099-08-12T16:00:00.000Z')
    expect(parseLocalDateTime('2099-08-12T13:30:00.000Z', 180, true)).toBeUndefined()
  })

  it('gera horários por hora, respeita a faixa e remove sobreposições', async () => {
    const service = new ScheduleService(database)
    const reservations: Schedule[] = [{
      id: 1,
      user_id: 7,
      createdByUserId: 7,
      editByUserId: null,
      amenity_id: 3,
      reservation_date: new Date('2099-08-12T16:00:00.000Z'),
      reservation_end: new Date('2099-08-12T18:00:00.000Z'),
      scheduled_at: new Date('2099-08-01T12:00:00.000Z'),
      active: true,
      created_at: new Date('2099-08-01T12:00:00.000Z'),
      updated_at: new Date('2099-08-01T12:00:00.000Z'),
    }]
    const lookup = jest.spyOn(service, 'findActiveSchedulesByAmenityBetweenDates')
      .mockResolvedValue(reservations)

    const slots = await service.findAvailableSlots({
      id: 3,
      reservation_hours: 2,
      available_from: '08:00:00',
      available_until: '18:00:00',
    }, '2099-08-12', 180)

    expect(slots.map((slot) => slot.time)).toEqual([
      '08:00',
      '09:00',
      '10:00',
      '11:00',
      '15:00',
      '16:00',
    ])
    expect(slots.every((slot) => new Date(slot.reservation_date).getUTCMinutes() === 0)).toBe(true)
    expect(lookup).toHaveBeenCalledWith(
      3,
      new Date('2099-08-12T03:00:00.000Z'),
      new Date('2099-08-13T03:00:00.000Z'),
    )
    lookup.mockRestore()
  })

  it('consulta um intervalo de dias uma vez e mantém datas com slots livres', async () => {
    const service = new ScheduleService(database)
    const reservations: Schedule[] = [{
      id: 1,
      user_id: 7,
      createdByUserId: 7,
      editByUserId: null,
      amenity_id: 3,
      reservation_date: new Date('2099-08-12T19:00:00.000Z'),
      reservation_end: new Date('2099-08-12T21:00:00.000Z'),
      scheduled_at: new Date('2099-08-01T12:00:00.000Z'),
      active: true,
      created_at: new Date('2099-08-01T12:00:00.000Z'),
      updated_at: new Date('2099-08-01T12:00:00.000Z'),
    }]
    const lookup = jest.spyOn(service, 'findActiveSchedulesByAmenityBetweenDates')
      .mockResolvedValue(reservations)

    const dailyAvailability = await service.findAvailableSlotsForDateRange({
      id: 3,
      reservation_hours: 2,
      available_from: '08:00:00',
      available_until: '18:00:00',
    }, ['2099-08-12', '2099-08-13'], 180)

    expect(dailyAvailability.map(({ date, availableSlots }) => [date, availableSlots.length]))
      .toEqual([['2099-08-12', 7], ['2099-08-13', 9]])
    expect(lookup).toHaveBeenCalledTimes(1)
    expect(lookup).toHaveBeenCalledWith(
      3,
      new Date('2099-08-12T03:00:00.000Z'),
      new Date('2099-08-14T03:00:00.000Z'),
    )
    lookup.mockRestore()
  })
})
