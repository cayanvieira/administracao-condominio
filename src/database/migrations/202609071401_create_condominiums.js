export async function up(knex) {
  await knex.schema.createTable('condominiums', (table) => {
    table.increments('id').primary()
    table.string('name', 150).notNullable()
    table.string('cnpj', 18).nullable().unique()
    table.string('address', 255).notNullable()
    table.string('email', 255).notNullable()
    table.string('phone', 20).nullable()
    table.timestamps(true, true)
  })
}

export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS condominiums CASCADE')
}
