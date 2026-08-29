export async function seed(knex) {
  await knex('users').del()

  await knex('users').insert([
    { name: 'Ana Silva', document: '12345678901', role: 'morador' },
    { name: 'Bruno Costa', document: '12345678902', role: 'morador' },
    { name: 'Carla Souza', document: '12345678903', role: 'sindico' },
    { name: 'Diego Lima', document: '12345678904', role: 'morador' },
    { name: 'Eduarda Rocha', document: '12345678905', role: 'funcionario' }
  ])
}
