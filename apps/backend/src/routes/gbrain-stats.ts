import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { GBrainClient, getCallStats } from '@pulse/gbrain'

/**
 * Exposes live GBrain usage stats for the dashboard:
 *  GET /api/gbrain/stats   → { mode, baseUrl, identity, brain_stats, calls }
 *  POST /api/gbrain/search → { results } (uses real gbrain hybrid RAG)
 */
const gbrainStatsRoute: FastifyPluginAsync = async (app: FastifyInstance) => {
  const client = new GBrainClient()

  app.options('/api/gbrain/stats', async (_req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')
    return reply.code(204).send()
  })

  app.get('/api/gbrain/stats', async (_req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')
    const calls = getCallStats()
    const identity = await client.getBrainIdentity().catch((err) => ({ error: String(err) }))
    const brainStats = await client.getStats().catch((err) => ({ error: String(err) }))
    return {
      mode: client.mode,
      base_url: process.env.GBRAIN_BASE_URL ?? null,
      project: process.env.GBRAIN_PROJECT_ID ?? 'default',
      identity,
      brain_stats: brainStats,
      backend_calls: calls,
    }
  })

  app.options('/api/gbrain/search', async (_req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')
    return reply.code(204).send()
  })

  app.post('/api/gbrain/search', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')
    const body = (req.body ?? {}) as { query?: string; hybrid?: boolean }
    const q = (body.query ?? '').trim()
    if (!q) return reply.code(400).send({ error: 'query required' })
    const result = body.hybrid
      ? await client.query(q).catch((err) => ({ error: String(err) }))
      : await client.search(q).catch((err) => ({ error: String(err) }))
    return { mode: client.mode, query: q, hybrid: !!body.hybrid, result }
  })

  app.options('/api/gbrain/timeline', async (_req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')
    return reply.code(204).send()
  })

  app.get('/api/gbrain/timeline', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')
    const slug = (req.query as { slug?: string })?.slug
    const limit = Number((req.query as { limit?: string })?.limit ?? 50)
    const result = await client.getTimeline(slug, limit).catch((err) => ({ error: String(err) }))
    return { mode: client.mode, slug: slug ?? null, result }
  })

  app.options('/api/gbrain/graph', async (_req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')
    return reply.code(204).send()
  })

  app.get('/api/gbrain/graph', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')
    const q = req.query as { slug?: string; depth?: string; linkType?: string; direction?: 'in' | 'out' | 'both' }
    if (!q.slug) return reply.code(400).send({ error: 'slug required' })
    const result = await client.traverseGraph(q.slug, {
      depth: q.depth ? Number(q.depth) : 1,
      linkType: q.linkType,
      direction: q.direction ?? 'both',
    }).catch((err) => ({ error: String(err) }))
    return { mode: client.mode, slug: q.slug, result }
  })
}

export default gbrainStatsRoute
