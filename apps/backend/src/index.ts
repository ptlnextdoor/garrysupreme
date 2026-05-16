import { fileURLToPath } from 'node:url'
import * as path from 'node:path'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './env.js'
import contextRoute from './routes/context.js'
import saveOrderRoute from './routes/save-order.js'
import eventsRoute from './routes/events.js'
import reviewRoute from './routes/review.js'
import vapiWebhookRoute from './routes/vapi-webhook.js'
import queriesRoute from './routes/queries.js'
import collectRawRoute from './routes/collect-raw.js'

// Point GBrainClient to repo-root data/ regardless of cwd
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../')
process.env.GBRAIN_DATA_ROOT = path.join(REPO_ROOT, 'data')

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: env.FRONTEND_URL,
  methods: ['GET', 'POST'],
})

await app.register(contextRoute)
await app.register(saveOrderRoute)
await app.register(eventsRoute)
await app.register(reviewRoute)
await app.register(vapiWebhookRoute)
await app.register(queriesRoute)
await app.register(collectRawRoute)

app.get('/', async () => ({ status: 'ok', service: 'Pulse backend', ts: Date.now() }))
app.get('/health', async () => ({ ok: true, ts: Date.now() }))

await app.listen({ port: env.PORT, host: '0.0.0.0' })
console.log(`🚀 Pulse backend running at http://0.0.0.0:${env.PORT}`)
