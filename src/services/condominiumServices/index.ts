import type { Knex } from 'knex'

export type CondominiumService = {
  id: number
  name: string
  minimum_hours: number
  can_book: boolean
  created_at: Date
  updated_at: Date
}

export type CreateCondominiumService = Pick<
  CondominiumService,
  'name' | 'minimum_hours' | 'can_book'
>
export type UpdateCondominiumService = Partial<CreateCondominiumService>

export class CondominiumServices {
  private readonly database: Knex

  constructor(database: Knex) {
    this.database = database
  }

  async findAllServices(): Promise<CondominiumService[]> {
    return this.database<CondominiumService>('services').select('*')
  }

  async findServiceById(id: number): Promise<CondominiumService | undefined> {
    return this.database<CondominiumService>('services').where({ id }).first()
  }

  async createService(service: CreateCondominiumService): Promise<CondominiumService> {
    const [createdService] = await this.database<CondominiumService>('services')
      .insert(service)
      .returning('*')

    return createdService
  }

  async updateService(
    id: number,
    service: UpdateCondominiumService,
  ): Promise<CondominiumService | undefined> {
    const [updatedService] = await this.database<CondominiumService>('services')
      .where({ id })
      .update(service)
      .returning('*')

    return updatedService
  }

  async deleteService(id: number): Promise<boolean> {
    const deletedRows = await this.database<CondominiumService>('services')
      .where({ id })
      .del()

    return deletedRows > 0
  }
}