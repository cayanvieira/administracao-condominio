import 'dotenv/config'

const databaseConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'sindy',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },
  migrations: {
    directory: './src/database/migrations',
    loadExtensions: ['.js']
  },
  seeds: {
    directory: './src/database/seeds',
    loadExtensions: ['.js']
  }
}

export default databaseConfig