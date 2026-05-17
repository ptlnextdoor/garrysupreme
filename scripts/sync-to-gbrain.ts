#!/usr/bin/env node
/**
 * Upload every markdown file under data/ into a real GBrain server.
 *
 * Reads from .env.gbrain (committed: no; in .gitignore).
 *
 * Usage:
 *   node --import tsx scripts/sync-to-gbrain.ts
 *   GBRAIN_BASE_URL=http://localhost:3131 \
 *     GBRAIN_API_KEY=gbrain_at_... \
 *     node --import tsx scripts/sync-to-gbrain.ts
 *
 * Slugs: data/companies/costco/menu.md → costco/companies/costco/menu  (project=costco)
 *        data/customers/demo-customer.md → costco/customers/demo-customer
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Load .env.gbrain if present (always overrides shell env so a stale token
// in the shell doesn't shadow the freshest one in the file)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const ENV_FILE = join(ROOT, '.env.gbrain')
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim())
    if (m) process.env[m[1]] = m[2]
  }
  console.log(`[sync] loaded credentials from .env.gbrain (override shell env)`)
}

const BASE_URL = process.env.GBRAIN_BASE_URL
const PROJECT = process.env.GBRAIN_PROJECT_ID ?? 'default'
const DATA_DIR = join(ROOT, 'data')

if (!BASE_URL) {
  console.error('❌ GBRAIN_BASE_URL required (e.g. http://localhost:3131)')
  process.exit(1)
}

let cachedToken: string | null = null
async function getToken(): Promise<string> {
  if (process.env.GBRAIN_API_KEY) return process.env.GBRAIN_API_KEY
  if (cachedToken) return cachedToken
  const id = process.env.GBRAIN_CLIENT_ID
  const secret = process.env.GBRAIN_CLIENT_SECRET
  if (!id || !secret) throw new Error('Need GBRAIN_API_KEY or (GBRAIN_CLIENT_ID + GBRAIN_CLIENT_SECRET)')
  const res = await fetch(`${BASE_URL}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: id,
      client_secret: secret,
      scope: 'read write admin',
    }).toString(),
  })
  if (!res.ok) throw new Error(`token exchange ${res.status}: ${await res.text()}`)
  const body = (await res.json()) as { access_token: string }
  cachedToken = body.access_token
  return cachedToken
}

let callId = 0
async function mcp(tool: string, args: Record<string, unknown>): Promise<unknown> {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}/mcp`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: tool, arguments: args },
      id: ++callId,
    }),
  })
  if (!res.ok) throw new Error(`${tool} HTTP ${res.status}: ${await res.text()}`)
  const text = await res.text()
  // Parse SSE
  const dataLine = text.split('\n').reverse().find((l) => l.startsWith('data:'))
  if (!dataLine) throw new Error(`no SSE data line in response: ${text.slice(0, 200)}`)
  const parsed = JSON.parse(dataLine.slice(5).trim())
  if (parsed.error) throw new Error(`${tool} ${parsed.error.code}: ${parsed.error.message}`)
  const content = parsed.result?.content
  if (Array.isArray(content)) {
    const textPart = content.find((c: { type: string; text?: string }) => c.type === 'text')?.text
    if (typeof textPart === 'string') {
      try { return JSON.parse(textPart) } catch { return textPart }
    }
  }
  return parsed.result
}

function walkMd(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walkMd(full, out)
    else if (entry.endsWith('.md')) out.push(full)
  }
  return out
}

async function main() {
  if (!existsSync(DATA_DIR)) {
    console.error(`❌ data/ not found at ${DATA_DIR}`)
    process.exit(1)
  }

  // Sanity check: identity + stats
  console.log(`[sync] target: ${BASE_URL} (project=${PROJECT})`)
  try {
    const identity = await mcp('get_brain_identity', {})
    console.log(`[sync] brain identity:`, identity)
  } catch (err) {
    console.error(`❌ Could not reach GBrain at ${BASE_URL}:`, err)
    process.exit(1)
  }

  const files = walkMd(DATA_DIR)
  console.log(`[sync] uploading ${files.length} markdown files...`)

  let ok = 0
  let fail = 0
  const start = Date.now()
  const projectPrefix = PROJECT && PROJECT !== 'default' ? `${PROJECT}/` : ''

  // PGLite has a single-writer lock; concurrent put_page calls cause silent
  // drops because the responses return before persistence completes. Run
  // strictly sequentially.
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const relPath = relative(DATA_DIR, file).replace(/\.md$/, '')
    const slug = projectPrefix + relPath
    try {
      const content = readFileSync(file, 'utf8')
      await mcp('put_page', { slug, content })
      ok++
      if (ok % 25 === 0 || ok === files.length) {
        console.log(`[sync] ${ok}/${files.length} done (${Math.round((ok / files.length) * 100)}%)`)
      }
    } catch (err) {
      fail++
      console.error(`  ❌ ${slug}: ${String(err).slice(0, 150)}`)
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\n[sync] done: ${ok} uploaded, ${fail} failed, ${elapsed}s elapsed`)

  // Verify with stats
  try {
    const stats = await mcp('get_stats', {})
    console.log(`[sync] post-sync brain stats:`, stats)
  } catch (err) {
    console.log(`[sync] stats unavailable: ${err}`)
  }
}

main().catch((err) => {
  console.error('❌ sync failed:', err)
  process.exit(1)
})
