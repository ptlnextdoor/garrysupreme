import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { appendFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../../')
const RAW_FILE = join(REPO_ROOT, 'data/companies/costco/raw-scraped.jsonl')

const collectRawRoute: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.options('/api/collect-raw', async (_req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')
    reply.header('Access-Control-Allow-Methods', 'POST, OPTIONS')
    reply.header('Access-Control-Allow-Headers', 'Content-Type')
    return reply.code(204).send()
  })

  app.post('/api/collect-raw', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')
    const body = req.body as { category?: string; products?: unknown[] }
    if (!body?.products || !Array.isArray(body.products)) {
      return reply.code(400).send({ error: 'products array required' })
    }
    const dir = dirname(RAW_FILE)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const line = JSON.stringify({ category: body.category ?? 'unknown', ts: Date.now(), products: body.products }) + '\n'
    appendFileSync(RAW_FILE, line)
    return { ok: true, count: body.products.length, file: RAW_FILE }
  })
}

export default collectRawRoute
