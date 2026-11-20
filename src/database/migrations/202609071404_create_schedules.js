export async function up(knex) {
  const tableExists = await knex.schema.hasTable('schedules')

  if (!tableExists) {
    await knex.schema.createTable('schedules', (table) => {
      table.increments('id').primary()
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE')
      table.integer('amenity_id').unsigned().notNullable()
        .references('id').inTable('amenities').onDelete('CASCADE')
      table.timestamp('reservation_date', { useTz: true }).notNullable()
      table.timestamp('reservation_end', { useTz: true }).notNullable()
      table.timestamp('scheduled_at').notNullable().defaultTo(knex.fn.now())
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamps(true, true)
    })
    return
  }

  const { rows: timestampColumns } = await knex.raw(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'schedules'
      AND column_name IN ('reservation_date', 'reservation_end')
  `)
  const columnTypes = Object.fromEntries(
    timestampColumns.map(({ column_name, data_type }) => [column_name, data_type]),
  )

  if (!columnTypes.reservation_date) {
    throw new Error('The schedules table is missing reservation_date.')
  }
  if (columnTypes.reservation_date === 'timestamp without time zone') {
    await knex.raw(`
      ALTER TABLE schedules
      ALTER COLUMN reservation_date TYPE timestamptz
      USING reservation_date AT TIME ZONE 'UTC'
    `)
  }

  const hasReservationEnd = Boolean(columnTypes.reservation_end)
  if (!hasReservationEnd) {
    await knex.schema.alterTable('schedules', (table) => {
      table.timestamp('reservation_end', { useTz: true }).nullable()
    })
  } else if (columnTypes.reservation_end === 'timestamp without time zone') {
    await knex.raw(`
      ALTER TABLE schedules
      ALTER COLUMN reservation_end TYPE timestamptz
      USING reservation_end AT TIME ZONE 'UTC'
    `)
  }

  await knex.raw(`
    UPDATE schedules
    SET reservation_end = schedules.reservation_date + amenities.reservation_hours * INTERVAL '1 hour'
    FROM amenities
    WHERE schedules.amenity_id = amenities.id
      AND schedules.reservation_end IS NULL
  `)

  await knex.raw('ALTER TABLE schedules ALTER COLUMN reservation_end SET NOT NULL')
}

export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS schedules CASCADE')
}
