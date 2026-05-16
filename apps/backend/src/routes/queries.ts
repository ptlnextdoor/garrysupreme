import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { GBrainClient, CustomerBrain } from '@pulse/gbrain'

interface ActiveCall {
  callId: string
  phone: string
  customerName: string
  startedAt: number
}

// In-memory active calls map — shared with vapi-webhook
export const activeCalls = new Map<string, ActiveCall>()

const queriesRoute: FastifyPluginAsync = async (app: FastifyInstance) => {
  const client = new GBrainClient()
  const customers = new CustomerBrain(client)

  app.get('/api/calls/active', async () => ({
    calls: Array.from(activeCalls.values()),
  }))

  app.get<{ Params: { phone: string } }>('/api/customers/:phone', async (req, reply) => {
    const profile = await customers.getProfile(req.params.phone)
    if (!profile) return reply.code(404).send({ error: 'not_found' })
    return profile
  })
}

export default queriesRoute
