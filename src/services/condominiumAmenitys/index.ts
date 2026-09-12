import type { Knex } from 'knex'

export type CondominiumAmenity = {
  id: number
  condominium_id: number
  name: string
  minimum_hours: number
  can_schedule: boolean
  created_at: Date
  updated_at: Date
}

export type CreateCondominiumAmenity = Pick<
  CondominiumAmenity,
  'name' | 'minimum_hours' | 'can_schedule'
>
export type UpdateCondominiumAmenity = Partial<CreateCondominiumAmenity>

export class CondominiumAmenitysService {
  private readonly database: Knex

  constructor(database: Knex) {
    this.database = database
  }

  async findAllAmenitys(): Promise<CondominiumAmenity[]> {
    return this.database<CondominiumAmenity>('amenitys')
      .select('*')
  }

  async findAllAmenitysByCondominiumIds(condominiumIds: number[]): Promise<CondominiumAmenity[]> {
    if (condominiumIds.length === 0) return []

    return this.database<CondominiumAmenity>('amenitys')
      .whereIn('condominium_id', condominiumIds)
      .select('*')
  }

  async findAmenityById(id: number, condominiumId: number): Promise<CondominiumAmenity | undefined> {
    return this.database<CondominiumAmenity>('amenitys').where({ id, condominium_id: condominiumId }).first()
  }

  async createAmenity(condominiumId: number, amenity: CreateCondominiumAmenity): Promise<CondominiumAmenity> {
    const [createdService] = await this.database<CondominiumAmenity>('amenitys')
      .insert({ ...amenity, condominium_id: condominiumId })
      .returning('*')

    return createdService
  }

  async updateAmenity(
    id: number,
    condominiumId: number,
    amenity: UpdateCondominiumAmenity,
  ): Promise<CondominiumAmenity | undefined> {
    const [updatedService] = await this.database<CondominiumAmenity>('amenitys')
      .where({ id, condominium_id: condominiumId })
      .update({ ...amenity, updated_at: this.database.fn.now() })
      .returning('*')

    return updatedService
  }

  async deleteAmenity(id: number, condominiumId: number): Promise<boolean> {
    const deletedRows = await this.database<CondominiumAmenity>('amenitys')
      .where({ id, condominium_id: condominiumId })
      .del()

    return deletedRows > 0
  }
}