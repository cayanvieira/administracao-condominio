export async function seed(knex) {
  await knex('schedules').del()

  const users = await knex('users').select('id')
  const amenities = await knex('amenities').select('id', 'reservation_hours')

  const schedules = []

  for (let i = 0; i < 5; i++) {
    const user = users[i % users.length]
    const amenity = amenities[i % amenities.length]
    const reservationDate = new Date(Date.now() + (i + 1) * 86400000)

    schedules.push({
      user_id: user.id,
      amenity_id: amenity.id,
      reservation_date: reservationDate.toISOString(),
      reservation_end: new Date(
        reservationDate.getTime() + amenity.reservation_hours * 60 * 60 * 1000,
      ).toISOString(),
      scheduled_at: new Date().toISOString(),
      active: true
    })
  }

  await knex('schedules').insert(schedules)
}