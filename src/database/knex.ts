import knex from 'knex'
import databaseConfig from './config.js'

const database = knex(databaseConfig)

export default database