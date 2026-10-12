export async function seed(knex) {
  await knex('schedules').del()

  const users = await knex('users').select('id')
  const amenities = await knex('amenities').select('id')

  const schedules = []

  for (let i = 0; i < 5; i++) {
    const user = users[i % users.length]
    const amenity = amenities[i % amenities.length]

    schedules.push({
      user_id: user.id,
      amenity_id: amenity.id,
      reservation_date: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
      scheduled_at: new Date().toISOString(),
      active: true
    })
  }

  await knex('schedules').insert(schedules)
}