export async function up(knex) {
  await knex.schema.createTable('services', (table) => {
    table.increments('id').primary()
    table.string('name').notNullable()
    table.integer('minimum_hours').notNullable()
    table.boolean('can_book').notNullable().defaultTo(true)
    table.timestamps(true, true)
  })

  await knex.schema.createTable('books', (table) => {
    table.increments('id').primary()
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('usuarios').onDelete('CASCADE')
    table.integer('service_id').unsigned().notNullable()
      .references('id').inTable('services').onDelete('CASCADE')
    table.timestamp('reservation_date').notNullable()
    table.timestamp('booked_at').notNullable().defaultTo(knex.fn.now())
    table.timestamps(true, true)
  })
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('books')
  await knex.schema.dropTableIfExists('services')
}