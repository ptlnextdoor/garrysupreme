import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { GBrainClient, CustomerBrain, normalizePhone } from '@pulse/gbrain'
import { hub } from '../services/sse-hub.js'
import type { MemoryFact } from '@pulse/types'

const log = (msg: string, data?: unknown): void => {
  if (data !== undefined) console.error(`[route:save-order] ${msg}`, data)
  else console.error(`[route:save-order] ${msg}`)
}

const newPrefSchema = z.object({
  fact: z.string(),
  evidence: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  category: z.enum(['dietary', 'preference', 'household', 'behavioral']).optional(),
})

const saveOrderSchema = z.object({
  items: z.array(z.string()).default([]),
  customerName: z.string().default('there'),
  total: z.number().optional(),
  new_preferences: z.array(newPrefSchema).optional(),
}).passthrough()

const vapiToolCallSchema = z.object({
  message: z
    .object({
      call: z
        .object({
          id: z.string().optional(),
          customer: z.object({ number: z.string().optional() }).partial().optional(),
        })
        .partial()
        .optional(),
      toolCallList: z
        .array(
          z.object({
            id: z.string().optional(),
            function: z.object({ name: z.string().optional(), arguments: z.string().optional() }).partial().optional(),
          }).partial(),
        )
        .optional(),
    })
    .partial()
    .optional(),
  call: z
    .object({
      id: z.string().optional(),
      customer: z.object({ number: z.string().optional() }).partial().optional(),
    })
    .partial()
    .optional(),
  phone_number: z.string().optional(),
}).passthrough()

function extractArgs(body: unknown): { phone: string; callId: string; args: z.infer<typeof saveOrderSchema> } {
  const parsed = vapiToolCallSchema.safeParse(body)
  const b = parsed.success ? parsed.data : {}
  const phone =
    b.message?.call?.customer?.number ||
    b.call?.customer?.number ||
    b.phone_number ||
    'unknown'
  const callId = b.message?.call?.id || b.call?.id || 'unknown-call'

  let rawArgs: unknown = body
  const toolCall = b.message?.toolCallList?.[0]
  if (toolCall?.function?.arguments) {
    try {
      rawArgs = JSON.parse(toolCall.function.arguments)
    } catch {
      // fall through to body
    }
  }
  const argsParsed = saveOrderSchema.safeParse(rawArgs)
  const args = argsParsed.success ? argsParsed.data : saveOrderSchema.parse({})
  return { phone, callId, args }
}

const saveOrderRoute: FastifyPluginAsync = async (app: FastifyInstance) => {
  const client = new GBrainClient()
  const customers = new CustomerBrain(client)

  app.post('/api/save_order', async (req, reply) => {
    reply.send({ ok: true, pickup_time: '~10 minutes' })

    setImmediate(() => {
      void persistOrder(req.body, customers).catch((err) => log('persistOrder failed', err))
    })
  })
}

async function persistOrder(body: unknown, customers: CustomerBrain): Promise<void> {
  const { phone, callId, args } = extractArgs(body)
  const normalized = normalizePhone(phone)
  const placedAt = new Date().toISOString()
  const total = args.total ?? 0

  const orderLine = `**${placedAt.slice(0, 10)}** — ${args.items.join(', ')}`
  const wrote = await customers.appendOrderToHistory(normalized, orderLine)
  if (!wrote) log(`appendOrderToHistory returned false for ${normalized}`)

  hub.broadcast({
    type: 'order_saved',
    callId,
    phone: normalized,
    customerName: args.customerName,
    items: args.items,
    total,
    timestamp: placedAt,
  })

  const prefs = args.new_preferences ?? []
  for (let i = 0; i < prefs.length; i++) {
    const pref = prefs[i]
    const ts = placedAt.replace(/[:.]/g, '-')
    const fact: MemoryFact = {
      id: `${callId}-${ts}-${i}`,
      phone: normalized,
      callId,
      fact: pref.fact,
      evidence: pref.evidence ?? '',
      confidence: pref.confidence ?? 0.8,
      category: pref.category ?? 'preference',
      status: 'pending_review',
      extractedAt: placedAt,
    }
    const ok = await customers.addMemoryFact(fact)
    if (ok) hub.broadcast({ type: 'fact_pending', fact })
    else log(`addMemoryFact failed for ${callId}`)
  }

  try {
    const { triggerIngest } = await import('@pulse/gstack')
    await triggerIngest({
      callId,
      phone: normalized,
      transcript: '',
      order: { items: args.items, customerName: args.customerName },
    })
  } catch (err) {
    log('gstack ingest unavailable (expected if not yet built)', err)
  }
}

export default saveOrderRoute
