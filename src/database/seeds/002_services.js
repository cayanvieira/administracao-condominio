export async function seed(knex) {
  await knex('services').del()

  await knex('services').insert([
    { name: 'Salão de Festas', minimum_hours: 4, can_schedule: true },
    { name: 'Churrasqueira', minimum_hours: 3, can_schedule: true },
    { name: 'Academia', minimum_hours: 1, can_schedule: true },
    { name: 'Piscina', minimum_hours: 2, can_schedule: true },
    { name: 'Sala de Reuniões', minimum_hours: 2, can_schedule: false }
  ])
}
