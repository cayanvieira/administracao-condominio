export async function seed(knex) {
  await knex('schedules').del()

  const users = await knex('users').select('id')
  const services = await knex('amenitys').select('id')

  const schedules = []

  for (let i = 0; i < 5; i++) {
    const user = users[i % users.length]
    const service = services[i % services.length]

    schedules.push({
      user_id: user.id,
      service_id: service.id,
      reservation_date: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
      scheduled_at: new Date().toISOString(),
      active: true
    })
  }

  await knex('schedules').insert(schedules)
}