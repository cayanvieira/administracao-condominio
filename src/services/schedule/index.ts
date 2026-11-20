import type { Knex } from 'knex'

export type Schedule = {
  id: number
  user_id: number
  createdByUserId: number | null
  editByUserId: number | null
  amenity_id: number
  reservation_date: Date
  reservation_end: Date
  scheduled_at: Date
  active: boolean
  created_at: Date
  updated_at: Date
}

export type CreateSchedule = Pick<
  Schedule,
  'user_id' | 'createdByUserId' | 'amenity_id' | 'reservation_date'
> & { timezoneOffsetMinutes?: number }
export type UpdateSchedule = Partial<
  Pick<Schedule, 'user_id' | 'reservation_date' | 'reservation_end' | 'active' | 'editByUserId'>
> & { timezoneOffsetMinutes?: number }
export type ScheduleWriteResult =
  | { status: 'saved'; schedule: Schedule }
  | { status: 'conflict' }
  | { status: 'outside-availability' }
  | { status: 'past' }
  | { status: 'not-found' }
export type AvailableReservationSlot = {
  time: string
  reservation_date: Date
  reservation_end: Date
}
export type AvailableReservationDate = {
  date: string
  availableSlots: AvailableReservationSlot[]
}

const HOUR_IN_MILLISECONDS = 60 * 60 * 1000
const MINUTE_IN_MILLISECONDS = 60 * 1000

const timeToMinutes = (value: string): number => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/.exec(value)
  if (!match) throw new Error('O horário configurado para a área é inválido.')
  return Number(match[1]) * 60 + Number(match[2])
}

const parseDateOnly = (value: string): Date => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('A data selecionada é inválida.')
  }
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.toISOString().slice(0, 10) !== value) {
    throw new Error('A data selecionada é inválida.')
  }
  return date
}

const dateAtLocalMinute = (date: Date, minutes: number, timezoneOffsetMinutes: number): Date =>
  new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0,
    minutes,
  ) + timezoneOffsetMinutes * MINUTE_IN_MILLISECONDS)

export function parseLocalDateTime(
  value: string,
  timezoneOffsetMinutes: number,
  requireWholeHour = false,
): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d+))?)?(?:Z|([+-])(\d{2}):?(\d{2}))?$/.exec(value)
  if (
    !match
    || !Number.isInteger(timezoneOffsetMinutes)
    || Math.abs(timezoneOffsetMinutes) > 840
  ) {
    return undefined
  }

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue = '00', fraction = ''] = match
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)
  const hour = Number(hourValue)
  const minute = Number(minuteValue)
  const second = Number(secondValue)
  const milliseconds = Number((fraction + '000').slice(0, 3))
  const calendarDate = new Date(Date.UTC(year, month - 1, day))
  if (
    calendarDate.toISOString().slice(0, 10) !== `${yearValue}-${monthValue}-${dayValue}`
    || (requireWholeHour && (minute !== 0 || second !== 0 || /[1-9]/.test(fraction)))
  ) {
    return undefined
  }

  calendarDate.setUTCHours(hour, minute, second, milliseconds)
  return new Date(calendarDate.getTime() + timezoneOffsetMinutes * MINUTE_IN_MILLISECONDS)
}

const reservationEndWithinAvailability = (
  start: Date,
  durationMilliseconds: number,
  availableFrom: string,
  availableUntil: string,
  timezoneOffsetMinutes: number,
): Date | undefined => {
  if (!Number.isInteger(timezoneOffsetMinutes) || Math.abs(timezoneOffsetMinutes) > 840) {
    throw new Error('O fuso horário enviado é inválido.')
  }

  const localStart = new Date(start.getTime() - timezoneOffsetMinutes * MINUTE_IN_MILLISECONDS)
  if (
    Number.isNaN(localStart.getTime())
    || localStart.getUTCSeconds() !== 0
    || localStart.getUTCMilliseconds() !== 0
  ) {
    return undefined
  }

  const startMinutes = localStart.getUTCHours() * 60 + localStart.getUTCMinutes()
  const endMinutes = startMinutes + durationMilliseconds / MINUTE_IN_MILLISECONDS
  const availableFromMinutes = timeToMinutes(availableFrom)
  const availableUntilMinutes = timeToMinutes(availableUntil)

  if (
    availableUntilMinutes <= availableFromMinutes
    || startMinutes % 60 !== 0
    || startMinutes < availableFromMinutes
    || endMinutes > availableUntilMinutes
    || endMinutes > 24 * 60
  ) {
    return undefined
  }

  return new Date(start.getTime() + durationMilliseconds)
}

export function getTimezoneOffsetMinutesFromIso(value: string): number {
  const match = /([+-])(\d{2}):?(\d{2})$/.exec(value)
  if (!match) return 0
  const minutes = Number(match[2]) * 60 + Number(match[3])
  return match[1] === '+' ? -minutes : minutes
}

export function formatLocalDateTime(value: Date, timezoneOffsetMinutes: number): string {
  if (!Number.isInteger(timezoneOffsetMinutes) || Math.abs(timezoneOffsetMinutes) > 840) {
    throw new Error('O fuso horário enviado é inválido.')
  }
  const localDate = new Date(value.getTime() - timezoneOffsetMinutes * MINUTE_IN_MILLISECONDS)
  const absoluteOffset = Math.abs(timezoneOffsetMinutes)
  const sign = timezoneOffsetMinutes >= 0 ? '-' : '+'
  const offsetHours = Math.floor(absoluteOffset / 60).toString().padStart(2, '0')
  const offsetMinutes = (absoluteOffset % 60).toString().padStart(2, '0')
  return `${localDate.toISOString().slice(0, 19)}${sign}${offsetHours}:${offsetMinutes}`
}

export function getLocalDateString(value: Date, timezoneOffsetMinutes: number): string {
  const localDate = new Date(value.getTime() - timezoneOffsetMinutes * MINUTE_IN_MILLISECONDS)
  return [
    localDate.getUTCFullYear().toString().padStart(4, '0'),
    (localDate.getUTCMonth() + 1).toString().padStart(2, '0'),
    localDate.getUTCDate().toString().padStart(2, '0'),
  ].join('-')
}

export class ScheduleService {
  private readonly database: Knex

  constructor(database: Knex) {
    this.database = database
  }

  async findAllSchedules(): Promise<Schedule[]> {
    return this.database<Schedule>('schedules').select('*')
  }

  async findScheduleById(id: number): Promise<Schedule | undefined> {
    return this.database<Schedule>('schedules').where({ id }).first()
  }

  async findSchedulesByUser(userId: number): Promise<Schedule[]> {
    return this.database<Schedule>('schedules').where({ user_id: userId }).select('*')
  }

  async findSchedulesByCondominium(
    condominiumId: number,
    filters: { userId?: number, active?: boolean, from?: Date } = {},
  ): Promise<(Schedule & { amenity_name: string, user_name: string })[]> {
    const query = this.database<Schedule>('schedules')
      .join('amenities', 'amenities.id', 'schedules.amenity_id')
      .join('users', 'users.id', 'schedules.user_id')
      .where('amenities.condominium_id', condominiumId)
      .select('schedules.*', 'amenities.name as amenity_name', 'users.name as user_name')
      .orderBy('schedules.reservation_date')

    if (filters.userId !== undefined) {
      query.where('schedules.user_id', filters.userId)
    }
    if (filters.active !== undefined) {
      query.where('schedules.active', filters.active)
    }
    if (filters.from !== undefined) {
      query.where('schedules.reservation_date', '>=', filters.from)
    }

    return query
  }

  async findSchedulesByAmenity(amenityId: number): Promise<Schedule[]> {
    return this.database<Schedule>('schedules').where({ amenity_id: amenityId }).select('*')
  }

  async findActiveSchedulesByAmenityBetweenDates(
    amenityId: number,
    start: Date,
    endExclusive: Date,
  ): Promise<Schedule[]> {
    return this.findConflictingSchedules(amenityId, start, endExclusive)
  }

  async findAvailableSlots(
    amenity: {
      id: number
      reservation_hours: number
      available_from: string
      available_until: string
    },
    dateValue: string,
    timezoneOffsetMinutes: number,
  ): Promise<AvailableReservationSlot[]> {
    const [availability] = await this.findAvailableSlotsForDateRange(
      amenity,
      [dateValue],
      timezoneOffsetMinutes,
    )
    return availability?.availableSlots ?? []
  }

  async findAvailableSlotsForDateRange(
    amenity: {
      id: number
      reservation_hours: number
      available_from: string
      available_until: string
    },
    dateValues: string[],
    timezoneOffsetMinutes: number,
  ): Promise<AvailableReservationDate[]> {
    if (dateValues.length === 0) return []
    const dates = dateValues.map(parseDateOnly)
    if (!Number.isInteger(amenity.reservation_hours) || amenity.reservation_hours <= 0) {
      throw new Error('A duração configurada para a área é inválida.')
    }
    if (!Number.isInteger(timezoneOffsetMinutes) || Math.abs(timezoneOffsetMinutes) > 840) {
      throw new Error('O fuso horário enviado é inválido.')
    }

    const availableFromMinutes = timeToMinutes(amenity.available_from)
    const availableUntilMinutes = timeToMinutes(amenity.available_until)
    if (availableUntilMinutes <= availableFromMinutes) {
      throw new Error('O horário configurado para a área é inválido.')
    }

    const dayStart = dateAtLocalMinute(dates[0], 0, timezoneOffsetMinutes)
    const dayEnd = dateAtLocalMinute(dates[dates.length - 1], 24 * 60, timezoneOffsetMinutes)
    const reservations = await this.findActiveSchedulesByAmenityBetweenDates(
      amenity.id,
      dayStart,
      dayEnd,
    )
    const durationMilliseconds = amenity.reservation_hours * HOUR_IN_MILLISECONDS
    const durationMinutes = amenity.reservation_hours * 60
    const now = Date.now()

    return dates.map((date, index) => {
      const availableSlots: AvailableReservationSlot[] = []
      for (let hour = 0; hour < 24; hour += 1) {
        const startMinutes = hour * 60
        const endMinutes = startMinutes + durationMinutes
        if (
          startMinutes < availableFromMinutes
          || endMinutes > availableUntilMinutes
          || endMinutes > 24 * 60
        ) {
          continue
        }

        const reservationDate = dateAtLocalMinute(date, startMinutes, timezoneOffsetMinutes)
        const reservationEnd = new Date(reservationDate.getTime() + durationMilliseconds)
        if (reservationDate.getTime() <= now) continue

        const hasConflict = reservations.some((reservation) => (
          new Date(reservation.reservation_date) < reservationEnd
          && new Date(reservation.reservation_end) > reservationDate
        ))
        if (!hasConflict) {
          availableSlots.push({
            time: `${hour.toString().padStart(2, '0')}:00`,
            reservation_date: reservationDate,
            reservation_end: reservationEnd,
          })
        }
      }

      return { date: dateValues[index], availableSlots }
    })
  }

  async findConflictingSchedules(
    amenityId: number,
    start: Date,
    endExclusive: Date,
    ignoreScheduleId?: number,
  ): Promise<Schedule[]> {
    const query = this.database<Schedule>('schedules')
      .where({ amenity_id: amenityId, active: true })
      .where('reservation_date', '<', endExclusive)
      .where('reservation_end', '>', start)

    if (ignoreScheduleId !== undefined) {
      query.whereNot('id', ignoreScheduleId)
    }

    return query.select('*')
  }

  async findScheduleByUserAndDate(
    userId: number,
    amenityId: number,
    date: Date,
  ): Promise<Schedule | undefined> {
    return this.database<Schedule>('schedules')
      .where({
        user_id: userId,
        amenity_id: amenityId,
        active: true,
      })
      .where('reservation_date', date)
      .first()
  }

  async createScheduleIfAvailable(schedule: CreateSchedule): Promise<ScheduleWriteResult> {
    return this.database.transaction(async (transaction) => {
      const amenity = await transaction('amenities')
        .where({ id: schedule.amenity_id })
        .forUpdate()
        .first()

      if (!amenity) {
        return { status: 'not-found' }
      }

      const reservationHours = Number(amenity.reservation_hours)
      if (!Number.isInteger(reservationHours) || reservationHours <= 0) {
        throw new Error('A duração configurada para a área é inválida.')
      }

      const reservationStart = new Date(schedule.reservation_date)
      if (Number.isNaN(reservationStart.getTime())) {
        throw new Error('A data da reserva é inválida.')
      }
      if (reservationStart.getTime() <= Date.now()) {
        return { status: 'past' }
      }

      const reservationEnd = reservationEndWithinAvailability(
        reservationStart,
        reservationHours * HOUR_IN_MILLISECONDS,
        amenity.available_from,
        amenity.available_until,
        schedule.timezoneOffsetMinutes ?? 0,
      )
      if (!reservationEnd) return { status: 'outside-availability' }
      const service = new ScheduleService(transaction)
      const conflicts = await service.findConflictingSchedules(
        schedule.amenity_id,
        reservationStart,
        reservationEnd,
      )

      if (conflicts.length > 0) {
        return { status: 'conflict' }
      }

      const [createdSchedule] = await transaction<Schedule>('schedules')
        .insert({
          user_id: schedule.user_id,
          createdByUserId: schedule.createdByUserId,
          amenity_id: schedule.amenity_id,
          reservation_date: reservationStart,
          reservation_end: reservationEnd,
        })
        .returning('*')

      if (!createdSchedule) {
        throw new Error('A reserva não foi salva.')
      }

      return { status: 'saved', schedule: createdSchedule }
    })
  }

  async updateScheduleIfAvailable(
    id: number,
    schedule: UpdateSchedule,
  ): Promise<ScheduleWriteResult> {
    return this.database.transaction(async (transaction) => {
      const current = await transaction<Schedule>('schedules').where({ id }).first()
      if (!current) {
        return { status: 'not-found' }
      }

      const amenity = await transaction('amenities')
        .where({ id: current.amenity_id })
        .forUpdate()
        .first()
      if (!amenity) {
        return { status: 'not-found' }
      }

      const lockedCurrent = await transaction<Schedule>('schedules')
        .where({ id })
        .forUpdate()
        .first()
      if (!lockedCurrent) {
        return { status: 'not-found' }
      }

      const { timezoneOffsetMinutes = 0, ...scheduleUpdate } = schedule
      const update = { ...scheduleUpdate }
      const reservationStart = update.reservation_date ?? lockedCurrent.reservation_date
      if (Number.isNaN(new Date(reservationStart).getTime())) {
        throw new Error('A data da reserva é inválida.')
      }
      if (
        (update.reservation_date !== undefined || (update.active === true && !lockedCurrent.active))
        && new Date(reservationStart).getTime() <= Date.now()
      ) {
        return { status: 'past' }
      }
      const duration = new Date(lockedCurrent.reservation_end).getTime()
        - new Date(lockedCurrent.reservation_date).getTime()
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('A duração salva para a reserva é inválida.')
      }
      if (update.reservation_date) {
        update.reservation_end = new Date(reservationStart.getTime() + duration)
      }
      const remainsActive = update.active ?? lockedCurrent.active

      if (remainsActive) {
        const validEnd = reservationEndWithinAvailability(
          reservationStart,
          duration,
          amenity.available_from,
          amenity.available_until,
          timezoneOffsetMinutes,
        )
        if (!validEnd) return { status: 'outside-availability' }
        update.reservation_end = validEnd

        const service = new ScheduleService(transaction)
        const conflicts = await service.findConflictingSchedules(
          lockedCurrent.amenity_id,
          reservationStart,
          validEnd,
          id,
        )
        if (conflicts.length > 0) {
          return { status: 'conflict' }
        }
      }

      const [updatedSchedule] = await transaction<Schedule>('schedules')
        .where({ id })
        .update({
          ...update,
          updated_at: transaction.fn.now(),
        })
        .returning('*')

      if (!updatedSchedule) {
        return { status: 'not-found' }
      }

      return { status: 'saved', schedule: updatedSchedule }
    })
  }

  async deleteSchedule(id: number): Promise<boolean> {
    const deletedRows = await this.database<Schedule>('schedules').where({ id }).del()

    return deletedRows > 0
  }
}

export type Book = Schedule
export type CreateBook = CreateSchedule
export type UpdateBook = UpdateSchedule
export class BookService extends ScheduleService {}
