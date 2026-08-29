export async function up(knex) {
  await knex.schema.createTable('services', (table) => {
    table.increments('id').primary()
    table.string('name').notNullable()
    table.integer('minimum_hours').notNullable()
    table.boolean('can_schedule').notNullable().defaultTo(true)
    table.timestamps(true, true)
  })
}

export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS services CASCADE')
}
