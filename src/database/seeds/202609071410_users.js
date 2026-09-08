export async function seed(knex) {
  await knex('users').del()

  await knex('users').insert([
    { name: 'Ana Silva', document: '12345678901', role: 'morador', email: 'ana@example.com' },
    { name: 'Bruno Costa', document: '12345678902', role: 'morador', email: 'bruno@example.com' },
    { name: 'Carla Souza', document: '12345678903', role: 'sindico', email: 'carla@example.com' },
    { name: 'Diego Lima', document: '12345678904', role: 'morador', email: 'diego@example.com' },
    { name: 'Eduarda Rocha', document: '12345678905', role: 'funcionario', email: 'eduarda@example.com' }
  ])
}