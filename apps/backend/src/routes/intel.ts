import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { GBrainClient, parseFrontmatter, stripFrontmatter } from '@pulse/gbrain'

/**
 * Market intelligence routes — sourced from The Hog (thehog.ai).
 * Data lives at data/intel/<business>-intel.md, synced into GBrain so the
 * voice agent can semantically search it via gbrain.query() too.
 *
 *   GET  /api/intel                  → full intel doc (parsed)
 *   POST /api/intel/insight          → { request } → keyword-matched talking point
 *                                       (used by voice agent system prompt)
 */

const COMPANY_SLUG = 'costco'
const INTEL_SLUG = 'intel/costco-intel'

type Insight = {
  trigger: string[]
  text: string
}

// Keyword → talking-point map. Sourced from The Hog's tracked keywords.
const INSIGHTS: Insight[] = [
  {
    trigger: ['membership', 'member', 'sign up', 'join'],
    text:
      "Executive membership pays for itself with the 2% reward — most heavy households earn $400-600/yr back. " +
      "Costco's edge over Sam's Club is the curated assortment and the Kirkland Signature line.",
  },
  {
    trigger: ['bulk', 'wholesale', 'in bulk', 'family pack', 'large'],
    text:
      "Bulk purchasing is the fastest-growing wholesale trend right now. Kirkland Signature is Costco's " +
      "wholesale-priced private label and typically runs 20-30% under national brands.",
  },
  {
    trigger: ['delivery', 'shipping', 'curbside', 'same day', 'instacart'],
    text:
      "Same-day grocery delivery is available via Instacart (Executive members skip the fee on orders $35+). " +
      "Non-grocery items ship free 2-day on orders $75+.",
  },
  {
    trigger: ["sam's club", 'sams club', 'samsclub'],
    text:
      "Costco's pricing is generally comparable to Sam's Club, and Kirkland Signature consistently outscores " +
      "Member's Mark in third-party blind tests. Plus Costco Travel bundles their Executive perk.",
  },
  {
    trigger: ['walmart', 'amazon', 'target'],
    text:
      "Costco's edge is the membership-curated assortment — fewer SKUs, higher quality, faster pickup. " +
      "Bulk pricing typically beats Walmart and Target; Amazon's match is usually 2-day Prime not same-day.",
  },
  {
    trigger: ['loyalty', 'reward', 'cash back', 'cashback', 'points'],
    text:
      "Executive members earn 2% back on most purchases (annual reward typically $400-600). " +
      "The Costco Citi Visa stacks an extra 4% on gas and 3% on travel.",
  },
  {
    trigger: ['organic', 'natural', 'usda'],
    text:
      "Costco has the largest USDA Organic SKU footprint of any wholesale club — Kirkland Organic " +
      "covers eggs, milk, produce, coffee, olive oil, and more.",
  },
  {
    trigger: ['kirkland', 'private label', 'store brand'],
    text:
      "Kirkland Signature is Costco's private label — 20-30% cheaper than national brand equivalents and " +
      "outperforms in many third-party blind tests. Always offer the Kirkland version if it exists.",
  },
]

function pickInsight(request: string): Insight | null {
  const r = (request ?? '').toLowerCase()
  for (const ins of INSIGHTS) {
    if (ins.trigger.some((t) => r.includes(t))) return ins
  }
  return null
}

const intelRoute: FastifyPluginAsync = async (app: FastifyInstance) => {
  const gbrain = new GBrainClient()

  app.options('/api/intel', async (_req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')
    return reply.code(204).send()
  })

  app.get('/api/intel', async (_req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')
    // Prefer gbrain (real RAG-able document); fall back to file
    const content = await gbrain.readItem(INTEL_SLUG)
    if (!content) {
      return {
        source: 'The Hog (thehog.ai)',
        business: COMPANY_SLUG,
        error: 'intel doc not found — run scripts/sync-to-gbrain.ts',
        insights_available: INSIGHTS.length,
      }
    }
    const fm = parseFrontmatter(content)
    return {
      source: fm.source ?? 'The Hog (thehog.ai)',
      business: fm.business ?? COMPANY_SLUG,
      project_id: fm.project_id ?? null,
      captured: fm.captured ?? null,
      content: stripFrontmatter(content),
      insights_available: INSIGHTS.length,
    }
  })

  app.options('/api/intel/insight', async (_req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')
    return reply.code(204).send()
  })

  app.post('/api/intel/insight', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')
    const body = (req.body ?? {}) as { request?: string }
    const request = (body.request ?? '').trim()
    if (!request) return { matched: null, insight: null, all_triggers: INSIGHTS.length }
    const insight = pickInsight(request)
    return {
      matched: insight ? insight.trigger : null,
      insight: insight?.text ?? null,
      all_triggers: INSIGHTS.length,
    }
  })
}

export { INSIGHTS, pickInsight }
export default intelRoute
