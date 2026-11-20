export async function up(knex) {
  const tableExists = await knex.schema.hasTable('announcements')

  if (!tableExists) {
    await knex.schema.createTable('announcements', (table) => {
      table.increments('id').primary()
      table.integer('condominium_id').unsigned().notNullable()
        .references('id').inTable('condominiums').onDelete('CASCADE')
      table.string('title', 150).notNullable()
      table.text('message').notNullable()
      table.timestamp('expiration_date', { useTz: true }).nullable()
      table.string('theme', 100).nullable()
      table.boolean('important').notNullable().defaultTo(false)
      table.boolean('active').notNullable().defaultTo(true)
      table.integer('create_by_user_id').unsigned().nullable()
        .references('id').inTable('users').onDelete('SET NULL')
      table.string('role', 20).notNullable()
      table.timestamps(true, true)
      table.index(['condominium_id', 'created_at'])
    })
    return
  }

  const activeColumnExists = await knex.schema.hasColumn('announcements', 'active')
  if (!activeColumnExists) {
    await knex.schema.alterTable('announcements', (table) => {
      table.boolean('active').notNullable().defaultTo(true)
    })
  }
}

export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS announcements CASCADE')
}
