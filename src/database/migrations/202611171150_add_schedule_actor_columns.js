export async function up(knex) {
  await knex.schema.alterTable('schedules', (table) => {
    table.integer('createdByUserId').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL')
    table.integer('editByUserId').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL')
  })
}

export async function down(knex) {
  await knex.schema.alterTable('schedules', (table) => {
    table.dropColumn('createdByUserId')
    table.dropColumn('editByUserId')
  })
}
