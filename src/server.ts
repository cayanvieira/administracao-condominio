import 'dotenv/config'
import Fastify from 'fastify'
import Routers from './routers/index.ts'

const server = Fastify()
const port = Number(process.env.PORT) || 3001
const host = process.env.HOST || '0.0.0.0'

Routers(server)


const start = async () => {
  try {
    await server.listen({ port, host })
    console.log(`Servidor rodando em http://${host}:${port}`)
  } catch (error) {
    server.log.error(error)
    process.exit(1)
  }
}

export default start