import { promises as fs } from 'node:fs'
import * as path from 'node:path'

/**
 * GBrain client — speaks the real GBrain MCP-over-HTTP protocol.
 *
 * Real reference: https://github.com/garrytan/gbrain (v0.35+, ~16k stars)
 *
 * Modes:
 *   - 'file'   : local markdown filesystem (no network) — default / offline
 *   - 'api'    : remote GBrain MCP server only (fails closed if unreachable)
 *   - 'hybrid' : api primary, file as cache + fallback (recommended for demo)
 *
 * The real GBrain HTTP MCP server (`gbrain serve --http`) speaks:
 *   - OAuth 2.1 client_credentials at POST /token
 *   - MCP JSON-RPC 2.0 at POST /mcp with Authorization: Bearer
 *   - Streamable HTTP transport: responses come back as SSE
 *     (event: message\ndata: {...json...}\n)
 *
 * Real MCP tool names (50+ tools — we use these eight):
 *   get_page(slug, fuzzy?, include_deleted?)  → page content
 *   put_page(slug, content)                   → write/update page
 *   delete_page(slug)                         → soft-delete
 *   list_pages(type?, tag?, limit?)           → list pages
 *   search(query)                             → keyword search (tsvector)
 *   query(question, no_expand?)               → hybrid RAG search
 *   get_stats()                               → brain statistics
 *   get_brain_identity()                      → version, page count, name
 *
 * Auth flow (auto-handled):
 *   1. If GBRAIN_CLIENT_ID + GBRAIN_CLIENT_SECRET set, exchange for token
 *      at /token (client_credentials grant), cache for token_ttl - 60s
 *   2. If GBRAIN_API_KEY set, use it directly as the bearer token
 *   3. Refresh on 401 once before failing
 */

export type GBrainMode = 'api' | 'file' | 'hybrid'

export type GBrainConfig = {
  apiKey?: string
  clientId?: string
  clientSecret?: string
  baseUrl?: string
  projectId?: string
  dataRoot?: string
  mode?: GBrainMode
}

export type GBrainItem = {
  path: string
  content: string
}

const log = (msg: string, data?: unknown): void => {
  if (data !== undefined) console.error(`[gbrain] ${msg}`, data)
  else console.error(`[gbrain] ${msg}`)
}

// Call counter for demo visibility — read via getCallStats()
const callCounts: Record<string, number> = {}

export function getCallStats(): { byTool: Record<string, number>; total: number } {
  const total = Object.values(callCounts).reduce((s, n) => s + n, 0)
  return { byTool: { ...callCounts }, total }
}

export function resetCallStats(): void {
  for (const k of Object.keys(callCounts)) delete callCounts[k]
}

export class GBrainClient {
  readonly mode: GBrainMode
  private readonly clientId?: string
  private readonly clientSecret?: string
  private readonly staticApiKey?: string
  private readonly baseUrl?: string
  private readonly projectId?: string
  private readonly dataRoot: string
  private rpcId = 0
  private cachedToken: { value: string; expiresAt: number } | null = null

  constructor(cfg: GBrainConfig = {}) {
    const apiKey = cfg.apiKey ?? process.env.GBRAIN_API_KEY
    const clientId = cfg.clientId ?? process.env.GBRAIN_CLIENT_ID
    const clientSecret = cfg.clientSecret ?? process.env.GBRAIN_CLIENT_SECRET
    const baseUrl = cfg.baseUrl ?? process.env.GBRAIN_BASE_URL
    const projectId = cfg.projectId ?? process.env.GBRAIN_PROJECT_ID ?? 'default'
    const envMode = (process.env.GBRAIN_MODE ?? '').toLowerCase() as GBrainMode | ''
    this.dataRoot = cfg.dataRoot ?? process.env.GBRAIN_DATA_ROOT ?? path.resolve(process.cwd(), 'data')

    const hasAuth = !!(baseUrl && (apiKey || (clientId && clientSecret)))
    const requestedMode = cfg.mode ?? (envMode || (hasAuth ? 'hybrid' : 'file'))

    if (requestedMode === 'api' || requestedMode === 'hybrid') {
      if (!hasAuth) {
        log(`mode=${requestedMode} requested but GBRAIN_BASE_URL+(GBRAIN_API_KEY or GBRAIN_CLIENT_ID/SECRET) missing — falling back to 'file'`)
        this.mode = 'file'
      } else {
        this.mode = requestedMode
        this.baseUrl = baseUrl!.replace(/\/$/, '')
        this.projectId = projectId
        this.staticApiKey = apiKey || undefined
        this.clientId = clientId || undefined
        this.clientSecret = clientSecret || undefined
      }
    } else {
      this.mode = 'file'
    }
    log(`mode=${this.mode}${this.baseUrl ? ` baseUrl=${this.baseUrl}` : ''}${this.projectId ? ` project=${this.projectId}` : ''}`)
  }

  // ===== Public API (called by CompanyBrain, CustomerBrain) =====

  async readItem(itemPath: string): Promise<string | null> {
    try {
      if (this.mode === 'file') return await this.fileRead(itemPath)
      try {
        const apiResult = await this.apiGet(itemPath)
        if (apiResult !== null) {
          if (this.mode === 'hybrid') this.fileWrite(itemPath, apiResult).catch(() => {})
          return apiResult
        }
        if (this.mode === 'hybrid') return await this.fileRead(itemPath)
        return null
      } catch (err) {
        if (this.mode === 'hybrid') {
          log(`api read failed, falling back to file: ${itemPath}`, err)
          return await this.fileRead(itemPath)
        }
        throw err
      }
    } catch (err) {
      log(`readItem failed: ${itemPath}`, err)
      return null
    }
  }

  async writeItem(itemPath: string, content: string): Promise<boolean> {
    let apiOk = true
    let fileOk = true
    try {
      if (this.mode === 'file' || this.mode === 'hybrid') {
        try { await this.fileWrite(itemPath, content) } catch (err) {
          fileOk = false
          log(`fileWrite failed: ${itemPath}`, err)
        }
      }
      if (this.mode === 'api' || this.mode === 'hybrid') {
        try { await this.apiUpsert(itemPath, content) } catch (err) {
          apiOk = false
          log(`apiUpsert failed${this.mode === 'hybrid' ? ' (file write kept it durable)' : ''}: ${itemPath}`, err)
          if (this.mode === 'api') return false
        }
      }
      return this.mode === 'hybrid' ? (apiOk || fileOk) : true
    } catch (err) {
      log(`writeItem failed: ${itemPath}`, err)
      return false
    }
  }

  async appendItem(itemPath: string, content: string): Promise<boolean> {
    try {
      const existing = await this.readItem(itemPath)
      const merged = existing === null
        ? content
        : (existing.endsWith('\n') ? existing + content : existing + '\n' + content)
      return await this.writeItem(itemPath, merged)
    } catch (err) {
      log(`appendItem failed: ${itemPath}`, err)
      return false
    }
  }

  async listItems(prefix: string): Promise<string[]> {
    try {
      if (this.mode === 'file') return await this.fileList(prefix)
      try {
        const remote = await this.apiList(prefix)
        // hybrid: union with file so we don't miss locally-only items
        if (this.mode === 'hybrid') {
          const local = await this.fileList(prefix)
          const set = new Set([...remote, ...local])
          return Array.from(set)
        }
        return remote
      } catch (err) {
        if (this.mode === 'hybrid') {
          log(`api list failed, falling back to file: ${prefix}`, err)
          return await this.fileList(prefix)
        }
        throw err
      }
    } catch (err) {
      log(`listItems failed: ${prefix}`, err)
      return []
    }
  }

  async searchFrontmatter(prefix: string, key: string, value: string): Promise<string | null> {
    const items = await this.listItems(prefix)
    for (const itemPath of items) {
      const content = await this.readItem(itemPath)
      if (!content) continue
      const fm = parseFrontmatter(content)
      if (fm[key] === value) return itemPath
    }
    return null
  }

  /** Run a hybrid RAG query against the real brain (gbrain query tool). */
  async query(question: string, opts: { noExpand?: boolean } = {}): Promise<unknown> {
    if (this.mode === 'file') return { skipped: 'file-mode', results: [] }
    // gbrain query tool's param is named `query` (the text), not `question`
    return await this.mcpCall('query', { query: question, no_expand: opts.noExpand ?? false })
  }

  /** Keyword search via gbrain search tool. */
  async search(q: string): Promise<unknown> {
    if (this.mode === 'file') return { skipped: 'file-mode', results: [] }
    return await this.mcpCall('search', { query: q })
  }

  /** Get brain identity (version, page count, name). */
  async getBrainIdentity(): Promise<unknown> {
    if (this.mode === 'file') return { mode: 'file', root: this.dataRoot }
    try {
      return await this.mcpCall('get_brain_identity', {})
    } catch (err) {
      return { error: String(err) }
    }
  }

  /** Get brain stats (page counts, chunks, sources). */
  async getStats(): Promise<unknown> {
    if (this.mode === 'file') return { mode: 'file' }
    try {
      return await this.mcpCall('get_stats', {})
    } catch (err) {
      return { error: String(err) }
    }
  }

  /**
   * Append a timeline entry to a page. Used for behavioral audit trails
   * (e.g. "2026-05-17 — placed bulk order: 8 items, $124.50").
   * Gbrain stores these as immutable, queryable, dated events.
   *
   * gbrain's add_timeline_entry tool requires (slug, date, summary).
   * Optional: detail, source.
   */
  async addTimelineEntry(slug: string, date: string, summary: string, opts: { detail?: string; source?: string } = {}): Promise<unknown> {
    if (this.mode === 'file') return { skipped: 'file-mode' }
    const fullSlug = projectPrefix(this.projectId) + slug.replace(/^\/+/, '').replace(/\.md$/, '')
    try {
      const args: Record<string, unknown> = { slug: fullSlug, date, summary }
      if (opts.detail) args.detail = opts.detail
      if (opts.source) args.source = opts.source
      return await this.mcpCall('add_timeline_entry', args)
    } catch (err) {
      return { error: String(err) }
    }
  }

  /** Get timeline entries for a page (or whole brain if slug omitted). */
  async getTimeline(slug?: string, limit = 20): Promise<unknown> {
    if (this.mode === 'file') return []
    try {
      const args: Record<string, unknown> = { limit }
      if (slug) args.slug = projectPrefix(this.projectId) + slug.replace(/^\/+/, '').replace(/\.md$/, '')
      return await this.mcpCall('get_timeline', args)
    } catch (err) {
      return { error: String(err) }
    }
  }

  /** Create a typed graph link between two pages (e.g. customer → ordered → menu_item). */
  async addLink(from: string, to: string, linkType: string): Promise<unknown> {
    if (this.mode === 'file') return { skipped: 'file-mode' }
    const fromSlug = projectPrefix(this.projectId) + from.replace(/^\/+/, '').replace(/\.md$/, '')
    const toSlug = projectPrefix(this.projectId) + to.replace(/^\/+/, '').replace(/\.md$/, '')
    try {
      return await this.mcpCall('add_link', { from: fromSlug, to: toSlug, link_type: linkType })
    } catch (err) {
      return { error: String(err) }
    }
  }

  /** Traverse the graph starting from a slug. */
  async traverseGraph(slug: string, opts: { depth?: number; linkType?: string; direction?: 'in' | 'out' | 'both' } = {}): Promise<unknown> {
    if (this.mode === 'file') return { nodes: [] }
    const fullSlug = projectPrefix(this.projectId) + slug.replace(/^\/+/, '').replace(/\.md$/, '')
    try {
      const args: Record<string, unknown> = { slug: fullSlug, depth: opts.depth ?? 1, direction: opts.direction ?? 'both' }
      if (opts.linkType) args.link_type = opts.linkType
      return await this.mcpCall('traverse_graph', args)
    } catch (err) {
      return { error: String(err) }
    }
  }

  /** Add a tag to a page. */
  async addTag(slug: string, tag: string): Promise<unknown> {
    if (this.mode === 'file') return { skipped: 'file-mode' }
    const fullSlug = projectPrefix(this.projectId) + slug.replace(/^\/+/, '').replace(/\.md$/, '')
    try {
      return await this.mcpCall('add_tag', { slug: fullSlug, tag })
    } catch (err) {
      return { error: String(err) }
    }
  }

  // ===== MCP protocol over Streamable HTTP =====
  // POST {baseUrl}/mcp with bearer auth; responses arrive as
  // SSE: "event: message\ndata: {jsonrpc:...}\n\n"

  private async getToken(): Promise<string> {
    if (this.staticApiKey) return this.staticApiKey
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60_000) {
      return this.cachedToken.value
    }
    if (!this.clientId || !this.clientSecret || !this.baseUrl) {
      throw new Error('gbrain: no auth credentials configured')
    }
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'read write admin',
    })
    const res = await fetch(`${this.baseUrl}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    if (!res.ok) throw new Error(`gbrain token exchange failed: ${res.status} ${await res.text()}`)
    const body = (await res.json()) as { access_token: string; expires_in: number }
    this.cachedToken = {
      value: body.access_token,
      expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
    }
    return body.access_token
  }

  private async mcpCall<T = unknown>(toolName: string, args: Record<string, unknown>): Promise<T> {
    if (!this.baseUrl) throw new Error('gbrain: baseUrl not configured')
    const id = ++this.rpcId
    callCounts[toolName] = (callCounts[toolName] ?? 0) + 1
    const doFetch = async (token: string) => fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: toolName, arguments: args },
        id,
      }),
    })

    let token = await this.getToken()
    let res = await doFetch(token)
    if (res.status === 401 && this.clientId) {
      // Token expired — clear cache and try once more
      this.cachedToken = null
      token = await this.getToken()
      res = await doFetch(token)
    }
    if (!res.ok) throw new Error(`gbrain ${toolName} HTTP ${res.status}: ${await res.text()}`)

    // Parse response — either plain JSON or SSE-framed
    const text = await res.text()
    const json = parseMcpResponse(text)
    if (json?.error) throw new Error(`gbrain ${toolName} JSON-RPC ${json.error.code}: ${json.error.message}`)
    const content = json?.result?.content
    if (Array.isArray(content)) {
      const textPart = content.find((c: { type: string; text?: string }) => c.type === 'text')?.text
      if (typeof textPart === 'string') {
        try { return JSON.parse(textPart) as T } catch { return textPart as unknown as T }
      }
    }
    return json?.result as T
  }

  private async apiGet(itemPath: string): Promise<string | null> {
    const slug = pathToSlug(itemPath, this.projectId)
    try {
      const out = await this.mcpCall<{ slug?: string; content?: string; status?: string }>('get_page', { slug })
      if (!out) return null
      // gbrain returns frontmatter+body; reconstruct full markdown
      if (typeof out === 'string') return out
      // Some returns inline content directly; others nest under content/markdown fields
      const content = (out as { content?: string; markdown?: string }).content
        ?? (out as { markdown?: string }).markdown
      return content ?? null
    } catch (err) {
      const msg = String(err)
      if (/not.found|404|page.not.exist/i.test(msg)) return null
      throw err
    }
  }

  private async apiUpsert(itemPath: string, content: string): Promise<void> {
    const slug = pathToSlug(itemPath, this.projectId)
    await this.mcpCall<unknown>('put_page', { slug, content })
  }

  private async apiList(prefix: string): Promise<string[]> {
    // list_pages doesn't take a slug prefix directly; use search/query instead
    // For our use case, prefix is "customers", "customers/memory-facts", "companies/costco"
    // We use the slug prefix to filter what list_pages returns
    const out = await this.mcpCall<{ pages?: Array<{ slug: string }>; results?: Array<{ slug: string }> } | Array<{ slug: string }>>(
      'list_pages',
      { limit: 5000 },
    )
    const arr = Array.isArray(out) ? out : (out?.pages ?? out?.results ?? [])
    const ourPrefix = projectPrefix(this.projectId) + prefix.replace(/\/$/, '')
    return arr
      .map((p) => p.slug)
      .filter((s) => s.startsWith(ourPrefix))
      .map((s) => slugToPath(s, this.projectId))
  }

  // ===== File-mode operations (atomic writes for safety under concurrency) =====

  private resolvePath(itemPath: string): string {
    const clean = itemPath.replace(/^\/+/, '')
    const ext = clean.endsWith('.md') ? clean : `${clean}.md`
    const full = path.resolve(this.dataRoot, ext)
    if (!full.startsWith(path.resolve(this.dataRoot))) throw new Error(`path escapes dataRoot: ${itemPath}`)
    return full
  }

  private async fileRead(itemPath: string): Promise<string | null> {
    try {
      return await fs.readFile(this.resolvePath(itemPath), 'utf8')
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw err
    }
  }

  private async fileWrite(itemPath: string, content: string): Promise<void> {
    const full = this.resolvePath(itemPath)
    await fs.mkdir(path.dirname(full), { recursive: true })
    const tmp = `${full}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    try {
      await fs.writeFile(tmp, content, 'utf8')
      await fs.rename(tmp, full)
    } catch (err) {
      try { await fs.unlink(tmp) } catch { /* best-effort cleanup */ }
      throw err
    }
  }

  private async fileList(prefix: string): Promise<string[]> {
    const base = path.resolve(this.dataRoot, prefix.replace(/^\/+/, ''))
    const out: string[] = []
    const walk = async (dir: string): Promise<void> => {
      let entries: import('node:fs').Dirent[]
      try {
        entries = await fs.readdir(dir, { withFileTypes: true })
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return
        throw err
      }
      for (const e of entries) {
        const full = path.join(dir, e.name)
        if (e.isDirectory()) await walk(full)
        else if (e.isFile() && e.name.endsWith('.md')) {
          const rel = path.relative(this.dataRoot, full).replace(/\.md$/, '')
          out.push(rel)
        }
      }
    }
    await walk(base)
    return out
  }
}

/** Map our internal path (companies/costco/menu) to a gbrain slug under the project namespace. */
function pathToSlug(itemPath: string, projectId?: string): string {
  const clean = itemPath.replace(/^\/+/, '').replace(/\.md$/, '')
  return `${projectPrefix(projectId)}${clean}`
}

function slugToPath(slug: string, projectId?: string): string {
  const prefix = projectPrefix(projectId)
  if (slug.startsWith(prefix)) return slug.slice(prefix.length)
  return slug
}

function projectPrefix(projectId?: string): string {
  if (!projectId || projectId === 'default') return ''
  return `${projectId}/`
}

/**
 * Parse an MCP response body which may be:
 *   - Plain JSON: `{"jsonrpc":"2.0","result":...,"id":1}`
 *   - SSE-framed: `event: message\ndata: {...json...}\n\n`
 *
 * Streamable HTTP transport (StreamableHTTPServerTransport) always returns SSE.
 */
function parseMcpResponse(text: string): { result?: { content?: Array<{ type: string; text?: string }> }; error?: { code: number; message: string } } | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  // SSE: look for "data:" line
  if (trimmed.includes('data:')) {
    const dataLines: string[] = []
    for (const line of trimmed.split('\n')) {
      const m = /^data:\s*(.*)$/.exec(line)
      if (m) dataLines.push(m[1])
    }
    if (dataLines.length) {
      try {
        // Take the last data line (final result for unary call)
        return JSON.parse(dataLines[dataLines.length - 1])
      } catch {
        // Fall through to try plain JSON
      }
    }
  }
  try { return JSON.parse(trimmed) } catch { return null }
}

export function parseFrontmatter(content: string): Record<string, string> {
  const m = /^---\n([\s\S]*?)\n---/.exec(content)
  if (!m) return {}
  const out: Record<string, string> = {}
  for (const line of m[1].split('\n')) {
    const km = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line)
    if (!km) continue
    let value = km[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    out[km[1]] = value
  }
  return out
}

export function stripFrontmatter(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n?/, '')
}
