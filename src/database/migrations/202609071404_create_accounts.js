export async function up(knex) {
  await knex.schema.createTable('accounts', (table) => {
    table.increments('id').primary()
    table.integer('user_id').unsigned().notNullable().unique()
      .references('id').inTable('users').onDelete('CASCADE')
    table.string('password', 255).notNullable()
    table.boolean('active').notNullable().defaultTo(false)
    table.string('verification_code', 5)
    table.timestamp('verification_expires_at', { useTz: true })
    table.timestamp('verified_at', { useTz: true })
  })
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('accounts')
}