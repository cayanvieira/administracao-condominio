import knex from 'knex'
import databaseConfig from './config.ts'

const database = knex(databaseConfig)

export default database