import type { Knex } from 'knex'

export type CondominiumService = {
  id: number
  condominium_id: number
  name: string
  minimum_hours: number
  can_schedule: boolean
  created_at: Date
  updated_at: Date
}

export type CreateCondominiumService = Pick<
  CondominiumService,
  'name' | 'minimum_hours' | 'can_schedule'
>
export type UpdateCondominiumService = Partial<CreateCondominiumService>

export class CondominiumServices {
  private readonly database: Knex

  constructor(database: Knex) {
    this.database = database
  }

  async findAllServices(condominiumId: number): Promise<CondominiumService[]> {
    return this.database<CondominiumService>('services')
      .where({ condominium_id: condominiumId })
      .select('*')
  }

  async findServiceById(id: number, condominiumId: number): Promise<CondominiumService | undefined> {
    return this.database<CondominiumService>('services').where({ id, condominium_id: condominiumId }).first()
  }

  async createService(condominiumId: number, service: CreateCondominiumService): Promise<CondominiumService> {
    const [createdService] = await this.database<CondominiumService>('services')
      .insert({ ...service, condominium_id: condominiumId })
      .returning('*')

    return createdService
  }

  async updateService(
    id: number,
    condominiumId: number,
    service: UpdateCondominiumService,
  ): Promise<CondominiumService | undefined> {
    const [updatedService] = await this.database<CondominiumService>('services')
      .where({ id, condominium_id: condominiumId })
      .update({ ...service, updated_at: this.database.fn.now() })
      .returning('*')

    return updatedService
  }

  async deleteService(id: number, condominiumId: number): Promise<boolean> {
    const deletedRows = await this.database<CondominiumService>('services')
      .where({ id, condominium_id: condominiumId })
      .del()

    return deletedRows > 0
  }
}