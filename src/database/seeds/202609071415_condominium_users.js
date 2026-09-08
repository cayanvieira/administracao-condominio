export async function seed(knex) {
  await knex('condominium_users').del()

  const condominiums = await knex('condominiums').select('id', 'name').orderBy('id')
  const users = await knex('users').select('id', 'email').orderBy('id')

  const firstCondominium = condominiums.find((condominium) => condominium.name === 'Residencial das Palmeiras')
  const secondCondominium = condominiums.find((condominium) => condominium.name === 'Condominio Jardim Azul')
  const ana = users.find((user) => user.email === 'ana@example.com')
  const bruno = users.find((user) => user.email === 'bruno@example.com')
  const carla = users.find((user) => user.email === 'carla@example.com')
  const diego = users.find((user) => user.email === 'diego@example.com')
  const eduarda = users.find((user) => user.email === 'eduarda@example.com')

  if (!firstCondominium || !secondCondominium || !ana || !bruno || !carla || !diego || !eduarda) {
    throw new Error('Usuarios ou condominios necessarios para o seed nao encontrados')
  }

  await knex('condominium_users').insert([
    { condominium_id: firstCondominium.id, user_id: ana.id, role: 'morador' },
    { condominium_id: firstCondominium.id, user_id: ana.id, role: 'sindico' },
    { condominium_id: firstCondominium.id, user_id: bruno.id, role: 'morador' },
    { condominium_id: firstCondominium.id, user_id: carla.id, role: 'sindico' },
    { condominium_id: firstCondominium.id, user_id: eduarda.id, role: 'funcionario' },
    { condominium_id: secondCondominium.id, user_id: ana.id, role: 'sindico' },
    { condominium_id: secondCondominium.id, user_id: diego.id, role: 'morador' },
    { condominium_id: secondCondominium.id, user_id: eduarda.id, role: 'funcionario' },
  ])
}
