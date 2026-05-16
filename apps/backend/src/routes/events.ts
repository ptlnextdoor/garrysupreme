import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { hub } from '../services/sse-hub.js'
import { env } from '../env.js'

const eventsRoute: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/api/events', async (req, reply) => {
    reply.hijack()
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': env.FRONTEND_URL,
      'Access-Control-Allow-Credentials': 'true',
    })

    hub.addClient(reply)

    const cleanup = (): void => {
      hub.removeClient(reply)
    }
    req.raw.on('close', cleanup)
    req.raw.on('error', cleanup)

    return reply
  })
}

export default eventsRoute
