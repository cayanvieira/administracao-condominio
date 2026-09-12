import database from './knex.ts'

const command = process.argv[2] || 'latest'

try {
  if (command === 'rollback') {
    await database.migrate.rollback()
  } else if (command === 'reset') {
    await database.migrate.rollback(undefined, true)
    await database.migrate.latest()
  } else if (command === 'latest') {
    await database.migrate.latest()
  } else {
    throw new Error(`Unknown migration command: ${command}`)
  }
} finally {
  await database.destroy()
}