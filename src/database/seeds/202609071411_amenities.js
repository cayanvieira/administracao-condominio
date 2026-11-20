export async function seed(knex) {
  await knex('amenities').del()

  const condominiums = await knex('condominiums').select('id').orderBy('id')
  if (condominiums.length < 2) {
    throw new Error('Condominios necessarios para o seed de servicos nao encontrados')
  }

  await knex('amenities').insert([
    { condominium_id: condominiums[0].id, name: 'Salão de Festas', reservation_hours: 4, can_schedule: true },
    { condominium_id: condominiums[0].id, name: 'Churrasqueira', reservation_hours: 3, can_schedule: true },
    { condominium_id: condominiums[0].id, name: 'Academia', reservation_hours: 1, can_schedule: true },
    { condominium_id: condominiums[1].id, name: 'Piscina', reservation_hours: 2, can_schedule: true },
    { condominium_id: condominiums[1].id, name: 'Sala de Reuniões', reservation_hours: 2, can_schedule: false }
  ])
}