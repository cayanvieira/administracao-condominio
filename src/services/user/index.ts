import {type  Knex } from 'knex'

export type User = {
  id: number
  name: string
  document: string
  role: string
  email: string | null
  created_at: Date
  updated_at: Date
}

export type CreateUser = Pick<User, 'name' | 'document' | 'role'>
export type UpdateUser = Partial<CreateUser>

export class UserService {
  private readonly database: Knex

  constructor(database: Knex) {
    this.database = database
  }

  async findAllUsers(): Promise<User[]> {
    return this.database<User>('users').select('*')
  }

  async findUserById(id: number): Promise<User> {
    const user = await this.database<User>('users').where({ id }).first()
    if (!user) {
      throw new Error('User not found')
    }
    return user
  }

  async createUser(user: CreateUser): Promise<User> {
    const [createdUser] = await this.database<User>('users')
      .insert(user)
      .returning('*')

    return createdUser
  }

  async updateUser(id: number, user: UpdateUser): Promise<User | undefined> {
    const [updatedUser] = await this.database<User>('users')
      .where({ id })
      .update(user)
      .returning('*')

    return updatedUser
  }

  async deleteUser(id: number): Promise<boolean> {
    const deletedRows = await this.database<User>('users').where({ id }).del()
    return deletedRows > 0
  }
}