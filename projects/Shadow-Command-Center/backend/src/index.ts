import Fastify from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { metricsRoute } from './routes/metrics.js'
import { logsRoute } from './routes/logs.js'
import { healthRoute } from './routes/health.js'
import { eventsRoute } from './routes/events.js'

const app = Fastify({ logger: { level: 'info' } })

// Plugins
await app.register(cors, { origin: '*' })
await app.register(swagger, {
  openapi: {
    info: { title: 'Shadow Command Center API', version: '1.0.0' },
  },
})
await app.register(swaggerUi, { routePrefix: '/docs' })

// Routes
await app.register(metricsRoute, { prefix: '/api/metrics' })
await app.register(logsRoute, { prefix: '/api/logs' })
await app.register(healthRoute, { prefix: '/api/health' })
await app.register(eventsRoute, { prefix: '/api/events' })

// Start
const start = async () => {
  try {
    await app.listen({ port: 3001, host: '0.0.0.0' })
    app.log.info('Shadow CC API running on http://0.0.0.0:3001')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}
start()
