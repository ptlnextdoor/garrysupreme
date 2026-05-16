import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { GBrainClient, CompanyBrain, CustomerBrain } from '@pulse/gbrain'
import { parseSession, rankMenu } from '@pulse/scorer'
import type { CustomerProfile, MenuItem } from '@pulse/types'

const COMPANY_SLUG = 'sunrise-coffee'
const ANONYMOUS_PROFILE: CustomerProfile = {
  phone: 'anonymous',
  name: 'there',
  likes: [],
  avoids: [],
  style: '',
}

const bodySchema = z.object({
  message: z
    .object({
      call: z
        .object({
          id: z.string().optional(),
          customer: z.object({ number: z.string().optional() }).partial().optional(),
        })
        .partial()
        .optional(),
      toolCallList: z.array(z.any()).optional(),
    })
    .partial()
    .optional(),
  call: z
    .object({
      customer: z.object({ number: z.string().optional() }).partial().optional(),
    })
    .partial()
    .optional(),
  phone_number: z.string().optional(),
  request: z.string().optional(),
}).passthrough()

const log = (msg: string, data?: unknown): void => {
  if (data !== undefined) console.error(`[route:context] ${msg}`, data)
  else console.error(`[route:context] ${msg}`)
}

function extractPhone(body: z.infer<typeof bodySchema>): string {
  return (
    body.message?.call?.customer?.number ||
    body.call?.customer?.number ||
    body.phone_number ||
    'unknown'
  )
}

function extractRequest(body: z.infer<typeof bodySchema>): string {
  if (typeof body.request === 'string') return body.request
  const toolCalls = body.message?.toolCallList ?? []
  for (const tc of toolCalls) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const args = JSON.parse((tc as any)?.function?.arguments ?? '{}')
      if (typeof args.request === 'string') return args.request
    } catch {
      // ignore
    }
  }
  return ''
}

const contextRoute: FastifyPluginAsync = async (app: FastifyInstance) => {
  const client = new GBrainClient()
  const company = new CompanyBrain(client)
  const customers = new CustomerBrain(client)

  app.post('/api/context', async (req, reply) => {
    let phone = 'unknown'
    let request = ''
    try {
      const body = bodySchema.parse(req.body)
      phone = extractPhone(body)
      request = extractRequest(body)
    } catch (err) {
      log('body parse failed; using empty request', err)
    }

    const session = parseSession(request)

    const [menu, policies, profile] = await Promise.all([
      company.getMenu(COMPANY_SLUG),
      company.getPolicies(COMPANY_SLUG),
      phone !== 'unknown' ? customers.getProfile(phone) : Promise.resolve(null),
    ])

    const customer: CustomerProfile = profile ?? ANONYMOUS_PROFILE
    const rankedMenu: MenuItem[] = menu.length ? rankMenu(menu, session, profile) : menu

    return reply.send({
      customer,
      company: {
        name: 'Sunrise Coffee',
        slug: COMPANY_SLUG,
        menu: rankedMenu,
        rules: policies,
      },
      session,
    })
  })
}

export default contextRoute
