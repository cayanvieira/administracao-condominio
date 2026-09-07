export async function up(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.string('email', 255).unique()
  })
}

export async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('email')
  })
}