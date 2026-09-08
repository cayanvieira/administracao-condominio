export async function up(knex) {
  await knex.schema.createTable('schedules', (table) => {
    table.increments('id').primary()
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE')
    table.integer('service_id').unsigned().notNullable()
      .references('id').inTable('services').onDelete('CASCADE')
    table.timestamp('reservation_date').notNullable()
    table.timestamp('scheduled_at').notNullable().defaultTo(knex.fn.now())
    table.boolean('active').notNullable().defaultTo(true)
    table.timestamps(true, true)
  })
}

export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS schedules CASCADE')
}
