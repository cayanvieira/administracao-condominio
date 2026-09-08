import bcrypt from 'bcryptjs'

export async function seed(knex) {
  await knex('accounts').del()

  const password = await bcrypt.hash('SenhaSegura123', 12)
  const users = await knex('users').select('id', 'email')

  await knex('accounts').insert(users.map((user) => ({
    user_id: user.id,
    senha: password,
    active: true,
    verified_at: knex.fn.now(),
  })))
}