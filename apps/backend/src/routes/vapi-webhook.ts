import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { GBrainClient, CompanyBrain, CustomerBrain, normalizePhone } from '@pulse/gbrain'
import { parseSession, rankMenu } from '@pulse/scorer'
import { hub } from '../services/sse-hub.js'
import type { CustomerProfile, MenuItem, MemoryFact } from '@pulse/types'
import { activeCalls } from './queries.js'
import { z } from 'zod'
import { pickInsight } from './intel.js'

const COMPANY_SLUG = 'costco'
const ANONYMOUS_PROFILE: CustomerProfile = {
  phone: 'anonymous',
  name: 'there',
  likes: [],
  avoids: [],
  style: '',
}

const log = (msg: string, data?: unknown): void => {
  if (data !== undefined) console.error(`[route:vapi-webhook] ${msg}`, data)
  else console.error(`[route:vapi-webhook] ${msg}`)
}

function slugifyItemName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

const saveOrderArgsSchema = z.object({
  items: z.array(z.string()).default([]),
  customer_name: z.string().optional(),
  new_preferences: z.array(z.object({
    fact: z.string(),
    evidence: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    category: z.enum(['dietary', 'preference', 'household', 'behavioral']).optional(),
  })).optional(),
  confidence: z.number().optional(),
}).passthrough()

async function handleGetContext(
  phone: string,
  request: string,
  company: CompanyBrain,
  customers: CustomerBrain,
) {
  const session = parseSession(request)
  const [menu, policies, profile] = await Promise.all([
    company.getMenu(COMPANY_SLUG),
    company.getPolicies(COMPANY_SLUG),
    phone !== 'unknown' ? customers.getProfile(phone) : Promise.resolve(null),
  ])
  const customer: CustomerProfile = profile ?? ANONYMOUS_PROFILE
  const rankedMenu: MenuItem[] = menu.length ? rankMenu(menu, session, profile) : menu

  // Pull a Hog-derived talking point if the customer's request matches a tracked keyword
  const intelHit = pickInsight(request)

  return {
    customer,
    company: {
      name: 'Costco Wholesale',
      slug: COMPANY_SLUG,
      menu: rankedMenu,
      rules: policies,
    },
    intel: intelHit
      ? { source: 'The Hog', matched: intelHit.trigger, talking_point: intelHit.text }
      : null,
    session,
  }
}

async function handleSaveOrder(
  phone: string,
  callId: string,
  args: z.infer<typeof saveOrderArgsSchema>,
  customers: CustomerBrain,
  gbrain: GBrainClient,
) {
  const normalized = normalizePhone(phone)
  const placedAt = new Date().toISOString()

  // Persist order async — don't block the response
  setImmediate(() => {
    void (async () => {
      try {
        const orderLine = `**${placedAt.slice(0, 10)}** — ${args.items.join(', ')}`
        await customers.appendOrderToHistory(normalized, orderLine)

        // GBrain timeline: append immutable behavioral event to the customer page.
        // Resolve the actual gbrain slug for this customer (frontmatter lookup
        // by phone). Falls back to 'customers/demo-customer' for the seeded
        // demo so the timeline always lands somewhere existing.
        const resolvedCustomerSlug =
          (await gbrain.searchFrontmatter('customers', 'phone', normalized)) ??
          'customers/demo-customer'
        const summary = `voice order via call ${callId.slice(0, 12)} — ${args.items.length} item(s)`
        const detail = args.items.slice(0, 8).map((i) => `• ${i}`).join('\n')
        void gbrain
          .addTimelineEntry(resolvedCustomerSlug, placedAt.slice(0, 10), summary, {
            detail,
            source: 'pulse-voice',
          })
          .catch((err) => log('addTimelineEntry failed (non-fatal)', err))

        // GBrain typed graph: link customer → ordered → menu item, so we can
        // traverse "what does Aarya usually order?" via traverse_graph.
        // Link target uses the actual menu page slug (single page).
        const menuSlug = 'companies/costco/menu'
        for (const _item of args.items.slice(0, 10)) {
          void gbrain
            .addLink(resolvedCustomerSlug, menuSlug, 'ordered')
            .catch((err) => log(`addLink ${resolvedCustomerSlug}->${menuSlug} failed (non-fatal)`, err))
        }

        hub.broadcast({
          type: 'order_saved',
          callId,
          phone: normalized,
          customerName: args.customer_name ?? 'Customer',
          items: args.items,
          total: 0,
          timestamp: placedAt,
        })

        for (let i = 0; i < (args.new_preferences ?? []).length; i++) {
          const pref = args.new_preferences![i]
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
        }

        try {
          const { triggerIngest } = await import('@pulse/gstack')
          await triggerIngest({
            callId,
            phone: normalized,
            transcript: '',
            order: { items: args.items, customerName: args.customer_name ?? 'Member' },
          })
        } catch (err) {
          log('gstack ingest unavailable (expected if not configured)', err)
        }
      } catch (err) {
        log('async persist failed', err)
      }
    })()
  })

  return { ok: true, pickup_time: '~2 hours for same-day pickup' }
}

const vapiWebhookRoute: FastifyPluginAsync = async (app: FastifyInstance) => {
  const client = new GBrainClient()
  const companyBrain = new CompanyBrain(client)
  const customerBrain = new CustomerBrain(client)

  app.options('/api/vapi-webhook', async (_req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')
    reply.header('Access-Control-Allow-Methods', 'POST, OPTIONS')
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return reply.code(204).send()
  })

  app.post('/api/vapi-webhook', async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>
    const message = (body?.message ?? body ?? {}) as Record<string, unknown>
    const rawToolCallList = Array.isArray(message?.toolCallList) ? message.toolCallList : []
    const toolCallList = rawToolCallList
      .filter((tc): tc is Record<string, unknown> => !!tc && typeof tc === 'object')
      .map((tc) => ({
        id: (tc.id as string) ?? `unknown-${Math.random().toString(36).slice(2, 8)}`,
        function: (tc.function && typeof tc.function === 'object'
          ? tc.function
          : { name: '', arguments: '{}' }) as { name: string; arguments: string },
      }))

    // Extract phone and callId from the Vapi payload
    const call = (message?.call ?? body?.call ?? {}) as Record<string, unknown>
    const customer = (call?.customer ?? {}) as Record<string, unknown>
    const phone = (customer?.number as string) ?? 'unknown'
    const callId = (call?.id as string) ?? 'unknown-call'

    // Handle call lifecycle events (status-update, end-of-call-report)
    const msgType = (message?.type as string) ?? ''
    log(`webhook msgType=${msgType}, toolCalls=${toolCallList.length}`)

    if (msgType === 'status-update' || msgType === 'call-start') {
      if (callId !== 'unknown-call' && !activeCalls.has(callId)) {
        const profile = phone !== 'unknown' ? await customerBrain.getProfile(phone) : null
        const customerName = profile?.name ?? 'Caller'
        activeCalls.set(callId, { callId, phone, customerName, startedAt: Date.now() })
        hub.broadcast({ type: 'call_started', callId, phone, customerName } as any)
      }
      return reply.send({ ok: true })
    }

    if (msgType === 'end-of-call-report' || msgType === 'call-end') {
      activeCalls.delete(callId)
      hub.broadcast({ type: 'call_ended', callId } as any)
      return reply.send({ ok: true })
    }

    if (toolCallList.length === 0) {
      log('no toolCallList in webhook payload')
      return reply.send({ results: [] })
    }

    const results = await Promise.all(
      toolCallList.map(async (tc) => {
        const toolName = tc.function?.name ?? ''
        try {
          let args: Record<string, unknown> = {}
          try {
            args = JSON.parse(tc.function?.arguments || '{}')
          } catch {
            log('failed to parse tool args', tc.function?.arguments)
          }

          let result: unknown
          if (!toolName) {
            result = { error: 'missing tool name' }
          } else if (toolName === 'get_context') {
            const request = (args.request as string) ?? ''
            result = await handleGetContext(phone, request, companyBrain, customerBrain)
          } else if (toolName === 'save_order') {
            const parsed = saveOrderArgsSchema.safeParse(args)
            const orderArgs = parsed.success ? parsed.data : saveOrderArgsSchema.parse({})
            result = await handleSaveOrder(phone, callId, orderArgs, customerBrain, client)
          } else {
            log(`unknown tool: ${toolName}`)
            result = { error: `unknown tool: ${toolName}` }
          }

          return { toolCallId: tc.id, result }
        } catch (err) {
          log(`tool ${toolName} failed`, err)
          return { toolCallId: tc.id, result: { error: String(err) } }
        }
      }),
    )

    return reply.send({ results })
  })
}

export default vapiWebhookRoute
