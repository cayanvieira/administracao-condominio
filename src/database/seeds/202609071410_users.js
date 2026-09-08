export async function seed(knex) {
  await knex('users').del()

  await knex('users').insert([
    { name: 'Ana Silva', document: '12345678901', email: 'ana@example.com' },
    { name: 'Bruno Costa', document: '12345678902', email: 'bruno@example.com' },
    { name: 'Carla Souza', document: '12345678903', email: 'carla@example.com' },
    { name: 'Diego Lima', document: '12345678904', email: 'diego@example.com' },
    { name: 'Eduarda Rocha', document: '12345678905', email: 'eduarda@example.com' }
  ])
}