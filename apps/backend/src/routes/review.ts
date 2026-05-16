import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { GBrainClient, CustomerBrain } from '@pulse/gbrain'
import { hub } from '../services/sse-hub.js'

const log = (msg: string, data?: unknown): void => {
  if (data !== undefined) console.error(`[route:review] ${msg}`, data)
  else console.error(`[route:review] ${msg}`)
}

const reviewBody = z.object({
  factId: z.string().min(1),
  customerId: z.string().optional(),
})

const reviewRoute: FastifyPluginAsync = async (app: FastifyInstance) => {
  const client = new GBrainClient()
  const customers = new CustomerBrain(client)

  const handle = async (status: 'approved' | 'rejected', body: unknown): Promise<{ ok: boolean }> => {
    const parsed = reviewBody.safeParse(body)
    if (!parsed.success) {
      log('invalid body', parsed.error.flatten())
      return { ok: false }
    }
    const ok = await customers.updateFactStatus(parsed.data.factId, status)
    if (ok) hub.broadcast({ type: 'fact_reviewed', factId: parsed.data.factId, status })
    return { ok }
  }

  app.post('/api/memory/approve', async (req, reply) => reply.send(await handle('approved', req.body)))
  app.post('/api/memory/reject', async (req, reply) => reply.send(await handle('rejected', req.body)))

  app.post('/api/review', async (req, reply) => {
    const bodySchema = z.object({ factId: z.string().min(1), status: z.enum(['approved', 'rejected']) })
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ ok: false })
    return reply.send(await handle(parsed.data.status, { factId: parsed.data.factId }))
  })
}

export default reviewRoute
