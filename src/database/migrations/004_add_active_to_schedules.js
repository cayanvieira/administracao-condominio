export async function up(knex) {
  await knex.schema.alterTable('schedules', (table) => {
    table.boolean('active').notNullable().defaultTo(true)
  })
}

export async function down(knex) {
  await knex.schema.alterTable('schedules', (table) => {
    table.dropColumn('active')
  })
}