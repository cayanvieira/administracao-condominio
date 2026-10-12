import type { Knex } from 'knex'

export type Schedule = {
  id: number
  user_id: number
  amenity_id: number
  reservation_date: Date
  scheduled_at: Date
  active: boolean
  created_at: Date
  updated_at: Date
}

export type CreateSchedule = Pick<Schedule, 'user_id' | 'amenity_id' | 'reservation_date'>
export type UpdateSchedule = Partial<Pick<Schedule, 'user_id' | 'amenity_id' | 'reservation_date' | 'active'>>

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
    return this.database<Schedule>('schedules')
      .where({ amenity_id: amenityId, active: true })
      .where('reservation_date', '>=', start)
      .where('reservation_date', '<', endExclusive)
      .select('*')
  }

  async findScheduleByDate(date: Date , amenityId: number): Promise<Schedule[]> {
    const targetDate = new Date(date) 
    const hours = targetDate.getHours() // Ensure the date is in the correct format
    const start = new Date(targetDate)
    start.setHours(hours, 0, 0, 0)

    const end = new Date(targetDate)
    end.setHours((hours + 2), 59, 59, 999)

    return this.database<Schedule>('schedules')
      .whereBetween('reservation_date', [start.toISOString(), end.toISOString()])
      .where({ amenity_id: amenityId, active: true })
      .select('*')
  }

  async findScheduleByUserAndDate(
    userId: number,
    amenityId: number,
    date: Date,
  ): Promise<Schedule | undefined> {
    const schedules = await this.findScheduleByDate(date, amenityId)

    return schedules.find((schedule) => schedule.user_id === userId)
  }

  async createSchedule(schedule: CreateSchedule): Promise<Schedule> {
    const [createdSchedule] = await this.database<Schedule>('schedules')
      .insert(schedule)
      .returning('*')

    return createdSchedule
  }

  async updateSchedule(
    id: number,
    schedule: UpdateSchedule,
  ): Promise<Schedule | undefined> {
    const [updatedSchedule] = await this.database<Schedule>('schedules')
      .where({ id })
      .update({
        ...schedule,
        updated_at: new Date(),
      })
      .returning('*')

    return updatedSchedule
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
