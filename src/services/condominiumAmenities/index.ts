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

export class CondominiumAmenitiesService {
  private readonly database: Knex

  constructor(database: Knex) {
    this.database = database
  }

  async findAllAmenities(): Promise<CondominiumAmenity[]> {
    return this.database<CondominiumAmenity>('amenities')
      .select('*')
  }

  async findAllAmenitiesByCondominiumIds(condominiumIds: number[]): Promise<CondominiumAmenity[]> {
    if (condominiumIds.length === 0) return []

    return this.database<CondominiumAmenity>('amenities')
      .whereIn('condominium_id', condominiumIds)
      .join('condominiums', 'amenities.condominium_id', 'condominiums.id')
      .select('amenities.*', 'condominiums.name as condominium_name')
  }
     

  async findAmenityById(id: number, condominiumId: number): Promise<CondominiumAmenity | undefined> {
    return this.database<CondominiumAmenity>('amenities').where({ id, condominium_id: condominiumId }).first()
  }

  async createAmenity(condominiumId: number, amenity: CreateCondominiumAmenity): Promise<CondominiumAmenity> {
    const [createdAmenity] = await this.database<CondominiumAmenity>('amenities')
      .insert({ ...amenity, condominium_id: condominiumId })
      .returning('*')

    return createdAmenity
  }

  async updateAmenity(
    id: number,
    condominiumId: number,
    amenity: UpdateCondominiumAmenity,
  ): Promise<CondominiumAmenity | undefined> {
    const [updatedAmenity] = await this.database<CondominiumAmenity>('amenities')
      .where({ id, condominium_id: condominiumId })
      .update({ ...amenity, updated_at: this.database.fn.now() })
      .returning('*')

    return updatedAmenity
  }

  async deleteAmenity(id: number, condominiumId: number): Promise<boolean> {
    const deletedRows = await this.database<CondominiumAmenity>('amenities')
      .where({ id, condominium_id: condominiumId })
      .del()

    return deletedRows > 0
  }
}