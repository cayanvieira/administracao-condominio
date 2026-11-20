export async function up(knex) {
  await knex.schema.alterTable('condominium_users', (table) => {
    table.string('unit', 50).nullable()
  })
}

export async function down(knex) {
  await knex.schema.alterTable('condominium_users', (table) => {
    table.dropColumn('unit')
  })
}
