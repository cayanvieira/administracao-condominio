import knex from 'knex'
import databaseConfig from '../../knexfile.js'

const database = knex(databaseConfig)

export default database