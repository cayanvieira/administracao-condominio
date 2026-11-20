import type { Knex } from 'knex'

export type AnnouncementRole = 'sindico' | 'funcionario'

type AnnouncementRow = {
  id: number
  condominium_id: number
  title: string
  message: string
  created_at: Date | string
  expiration_date: Date | string | null
  theme: string | null
  important: boolean
  active: boolean
  create_by_user_id: number | null
  role: AnnouncementRole
  author_name: string | null
}

export type Announcement = {
  id: number
  condominiumId: number
  title: string
  message: string
  createDate: string
  expirationDate: string | null
  theme: string | null
  important: boolean
  active: boolean
  createByUserId: number | null
  role: AnnouncementRole
  authorName: string | null
}

export type CreateAnnouncementInput = {
  condominiumId: number
  title: string
  message: string
  expirationDate?: Date | null
  theme?: string | null
  important: boolean
}

export class AnnouncementsService {
  private readonly database: Knex

  constructor(database: Knex) {
    this.database = database
  }

  async findByCondominiumId(condominiumId: number, includeInactive = false): Promise<Announcement[]> {
    const query = this.announcementQuery()
      .where('announcements.condominium_id', condominiumId)
    if (!includeInactive) {
      query.where('announcements.active', true)
    }

    const rows = await query
      .orderBy('announcements.important', 'desc')
      .orderBy('announcements.created_at', 'desc') as AnnouncementRow[]

    return rows.map((row) => this.toAnnouncement(row))
  }

  async create(
    input: CreateAnnouncementInput,
    createByUserId: number,
    role: AnnouncementRole,
  ): Promise<Announcement> {
    const [created] = await this.database<AnnouncementRow>('announcements')
      .insert({
        condominium_id: input.condominiumId,
        title: input.title,
        message: input.message,
        expiration_date: input.expirationDate ?? null,
        theme: input.theme ?? null,
        important: input.important,
        create_by_user_id: createByUserId,
        role,
      })
      .returning('*')

    if (!created) {
      throw new Error('O aviso foi salvo, mas não foi possível recuperá-lo.')
    }

    const announcement = await this.announcementQuery()
      .where('announcements.id', created.id)
      .first() as AnnouncementRow | undefined

    if (!announcement) {
      throw new Error('O aviso foi salvo, mas não foi possível recuperá-lo.')
    }

    return this.toAnnouncement(announcement)
  }

  async deactivate(id: number, condominiumId: number): Promise<boolean> {
    const updatedRows = await this.database('announcements')
      .where({ id, condominium_id: condominiumId })
      .update({
        active: false,
        updated_at: this.database.fn.now(),
      })
      .returning('id')

    return updatedRows.length > 0
  }

  private announcementQuery() {
    return this.database<AnnouncementRow>('announcements')
      .leftJoin('users', 'users.id', 'announcements.create_by_user_id')
      .select({
        id: 'announcements.id',
        condominium_id: 'announcements.condominium_id',
        title: 'announcements.title',
        message: 'announcements.message',
        created_at: 'announcements.created_at',
        expiration_date: 'announcements.expiration_date',
        theme: 'announcements.theme',
        important: 'announcements.important',
        active: 'announcements.active',
        create_by_user_id: 'announcements.create_by_user_id',
        role: 'announcements.role',
        author_name: 'users.name',
      })
  }

  private toAnnouncement(row: AnnouncementRow): Announcement {
    return {
      id: row.id,
      condominiumId: row.condominium_id,
      title: row.title,
      message: row.message,
      createDate: new Date(row.created_at).toISOString(),
      expirationDate: row.expiration_date === null
        ? null
        : new Date(row.expiration_date).toISOString(),
      theme: row.theme,
      important: row.important,
      active: row.active,
      createByUserId: row.create_by_user_id,
      role: row.role,
      authorName: row.author_name,
    }
  }
}
