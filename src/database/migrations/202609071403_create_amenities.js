export async function up(knex) {
  const tableExists = await knex.schema.hasTable('amenities')

  if (!tableExists) {
    await knex.schema.createTable('amenities', (table) => {
      table.increments('id').primary()
      table.integer('condominium_id').notNullable().references('id').inTable('condominiums').onDelete('CASCADE')
      table.string('name').notNullable()
      table.integer('reservation_hours').notNullable()
      table.boolean('can_schedule').notNullable().defaultTo(true)
      table.time('available_from').notNullable().defaultTo('00:00')
      table.time('available_until').notNullable().defaultTo('23:00')
      table.timestamps(true, true)
    })
    return
  }

  const hasReservationHours = await knex.schema.hasColumn('amenities', 'reservation_hours')
  const hasMinimumHours = await knex.schema.hasColumn('amenities', 'minimum_hours')

  if (!hasReservationHours && hasMinimumHours) {
    await knex.schema.alterTable('amenities', (table) => {
      table.renameColumn('minimum_hours', 'reservation_hours')
    })
  } else if (!hasReservationHours) {
    await knex.schema.alterTable('amenities', (table) => {
      table.integer('reservation_hours').notNullable().defaultTo(1)
    })
  }

  const hasAvailableFrom = await knex.schema.hasColumn('amenities', 'available_from')
  const hasAvailableUntil = await knex.schema.hasColumn('amenities', 'available_until')
  if (!hasAvailableFrom || !hasAvailableUntil) {
    await knex.schema.alterTable('amenities', (table) => {
      if (!hasAvailableFrom) table.time('available_from').notNullable().defaultTo('00:00')
      if (!hasAvailableUntil) table.time('available_until').notNullable().defaultTo('23:00')
    })
  }
}

export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS amenities CASCADE')
}
