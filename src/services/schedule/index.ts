import type { Knex } from 'knex'

export type Schedule = {
  id: number
  user_id: number
  service_id: number
  reservation_date: Date
  booked_at: Date
  created_at: Date
  updated_at: Date
}

export type CreateSchedule = Pick<Schedule, 'user_id' | 'service_id' | 'reservation_date'>
export type UpdateSchedule = Partial<CreateSchedule>

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

  async findSchedulesByService(serviceId: number): Promise<Schedule[]> {
    return this.database<Schedule>('schedules').where({ service_id: serviceId }).select('*')
  }

  async findScheduleByDate(date: Date , serviceId: number): Promise<Schedule[]> {
    const targetDate = new Date(date) 
    const hours = targetDate.getHours() // Ensure the date is in the correct format
    const start = new Date(targetDate)
    start.setHours(hours, 0, 0, 0)

    const end = new Date(targetDate)
    end.setHours((hours + 2), 59, 59, 999)

    return this.database<Schedule>('schedules')
      .whereBetween('reservation_date', [start.toISOString(), end.toISOString()])
      .where({ service_id: serviceId })
      .select('*')
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
      .update(schedule)
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
