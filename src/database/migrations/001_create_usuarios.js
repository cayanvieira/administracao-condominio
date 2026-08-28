export async function up(knex) {
  await knex.schema.createTable('usuarios', (table) => {
    table.increments('id').primary()
    table.string('name').notNullable()
    table.string('document').notNullable().unique()
    table.string('role').notNullable()
    table.timestamps(true, true)
  })
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('usuarios')
}