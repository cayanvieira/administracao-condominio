export async function up(knex) {
  await knex.schema.createTable('amenities', (table) => {
    table.increments('id').primary()
    table.integer('condominium_id').notNullable().references('id').inTable('condominiums').onDelete('CASCADE')
    table.string('name').notNullable()
    table.integer('minimum_hours').notNullable()
    table.boolean('can_schedule').notNullable().defaultTo(true)
    table.timestamps(true, true)
  })
}

export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS amenities CASCADE')
}
