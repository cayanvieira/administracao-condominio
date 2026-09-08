export async function seed(knex) {
  await knex('condominiums').del()

  await knex('condominiums').insert([
    {
      name: 'Residencial das Palmeiras',
      cnpj: '12345678000190',
      address: 'Rua das Palmeiras, 100',
      email: 'contato@palmeiras.example.com',
      phone: '11999999999',
    },
    {
      name: 'Condominio Jardim Azul',
      cnpj: '98765432000110',
      address: 'Avenida Central, 500',
      email: 'contato@jardimazul.example.com',
      phone: '1133334444',
    },
  ])
}