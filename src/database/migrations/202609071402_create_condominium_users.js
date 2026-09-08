export async function up(knex) {
  await knex.schema.createTable('condominium_users', (table) => {
    table.increments('id').primary()
    table.integer('condominium_id').notNullable().references('id').inTable('condominiums').onDelete('CASCADE')
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.string('role', 20).notNullable()
    table.timestamps(true, true)
    table.unique(['condominium_id', 'user_id', 'role'])
  })
}

export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS condominium_users CASCADE')
}
