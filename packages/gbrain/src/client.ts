import { promises as fs } from 'node:fs'
import * as path from 'node:path'

/**
 * GBrain client — supports three modes:
 *   - 'file'   : pure local markdown filesystem (no network) — default, used for offline/demo
 *   - 'api'    : remote GBrain MCP server over HTTP (JSON-RPC tools/call envelope)
 *   - 'hybrid' : api primary, file as both cache + fallback (resilient demo mode)
 *
 * GBrain is an MCP-native knowledge graph (https://github.com/garrytan/gbrain).
 * The protocol exposes tools — gbrain.upsert / gbrain.get / gbrain.list / gbrain.search —
 * over HTTP at /mcp via JSON-RPC 2.0. This client speaks that protocol directly.
 *
 * To run a local GBrain server:
 *   $ npm i -g @garrytan/gbrain
 *   $ gbrain init
 *   $ gbrain serve --http   # prints a bearer token + URL
 *   $ export GBRAIN_BASE_URL=http://localhost:3131
 *   $ export GBRAIN_API_KEY=<token>
 *   $ export GBRAIN_MODE=hybrid   # optional; otherwise auto-detects 'api'
 */

export type GBrainMode = 'api' | 'file' | 'hybrid'

export type GBrainConfig = {
  apiKey?: string
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

export class GBrainClient {
  readonly mode: GBrainMode
  private readonly apiKey?: string
  private readonly baseUrl?: string
  private readonly projectId?: string
  private readonly dataRoot: string
  private rpcId = 0

  constructor(cfg: GBrainConfig = {}) {
    const apiKey = cfg.apiKey ?? process.env.GBRAIN_API_KEY
    const baseUrl = cfg.baseUrl ?? process.env.GBRAIN_BASE_URL
    const projectId = cfg.projectId ?? process.env.GBRAIN_PROJECT_ID ?? 'default'
    const envMode = (process.env.GBRAIN_MODE ?? '').toLowerCase() as GBrainMode | ''
    this.dataRoot = cfg.dataRoot ?? process.env.GBRAIN_DATA_ROOT ?? path.resolve(process.cwd(), 'data')

    const hasApi = !!(apiKey && baseUrl)
    const requestedMode = cfg.mode ?? (envMode || (hasApi ? 'api' : 'file'))

    if (requestedMode === 'api' || requestedMode === 'hybrid') {
      if (!hasApi) {
        log(`mode=${requestedMode} requested but GBRAIN_API_KEY/GBRAIN_BASE_URL missing — falling back to 'file'`)
        this.mode = 'file'
      } else {
        this.mode = requestedMode
        this.apiKey = apiKey
        this.baseUrl = baseUrl!.replace(/\/$/, '')
        this.projectId = projectId
      }
    } else {
      this.mode = 'file'
    }
    log(`mode=${this.mode}${this.baseUrl ? ` baseUrl=${this.baseUrl}` : ''}${this.projectId ? ` project=${this.projectId}` : ''}`)
  }

  async readItem(itemPath: string): Promise<string | null> {
    try {
      if (this.mode === 'file') return await this.fileRead(itemPath)
      // api or hybrid → try api first
      try {
        const apiResult = await this.apiGet(itemPath)
        if (apiResult !== null) {
          // hybrid: refresh the local cache so file fallback stays warm
          if (this.mode === 'hybrid') this.fileWrite(itemPath, apiResult).catch(() => {})
          return apiResult
        }
        // api returned null (not found) — in hybrid, try file
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
      // hybrid succeeds if either side worked
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
        return await this.apiList(prefix)
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
    // Prefer native gbrain.search when available; falls back to scan via list+read
    if (this.mode !== 'file') {
      try {
        const hit = await this.apiSearch(prefix, { [key]: value })
        if (hit) return hit
      } catch (err) {
        log(`apiSearch failed, falling back to scan: ${prefix}`, err)
      }
    }
    const items = await this.listItems(prefix)
    for (const itemPath of items) {
      const content = await this.readItem(itemPath)
      if (!content) continue
      const fm = parseFrontmatter(content)
      if (fm[key] === value) return itemPath
    }
    return null
  }

  // ===== GBrain MCP-over-HTTP (JSON-RPC 2.0) =====
  // Tool names map to the documented GBrain MCP tools.
  // Endpoint: POST {baseUrl}/mcp  with Authorization: Bearer {apiKey}

  private async mcpCall<T>(toolName: string, args: Record<string, unknown>): Promise<T> {
    if (!this.baseUrl) throw new Error('gbrain: baseUrl not configured')
    const id = ++this.rpcId
    const res = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers: { ...this.authHeaders(), 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: toolName, arguments: { project: this.projectId, ...args } },
        id,
      }),
    })
    if (!res.ok) throw new Error(`gbrain ${toolName} HTTP ${res.status}: ${await res.text()}`)
    const body = (await res.json()) as { result?: { content?: Array<{ type: string; text?: string }> }; error?: { code: number; message: string } }
    if (body.error) throw new Error(`gbrain ${toolName} JSON-RPC ${body.error.code}: ${body.error.message}`)
    // MCP convention: result.content is an array of { type:'text', text:'...JSON...' }
    const textPart = body.result?.content?.find((c) => c.type === 'text')?.text
    if (textPart === undefined) return body.result as unknown as T
    try {
      return JSON.parse(textPart) as T
    } catch {
      return textPart as unknown as T
    }
  }

  private async apiGet(itemPath: string): Promise<string | null> {
    try {
      const out = await this.mcpCall<{ content?: string; found?: boolean } | string>('gbrain.get', { path: itemPath })
      if (typeof out === 'string') return out
      if (out && typeof out === 'object') {
        if (out.found === false) return null
        return out.content ?? null
      }
      return null
    } catch (err) {
      if (/404|not.found/i.test(String(err))) return null
      throw err
    }
  }

  private async apiUpsert(itemPath: string, content: string): Promise<void> {
    await this.mcpCall<unknown>('gbrain.upsert', { path: itemPath, content })
  }

  private async apiList(prefix: string): Promise<string[]> {
    const out = await this.mcpCall<{ paths?: string[] } | string[]>('gbrain.list', { prefix })
    if (Array.isArray(out)) return out
    return out?.paths ?? []
  }

  private async apiSearch(prefix: string, filters: Record<string, string>): Promise<string | null> {
    const out = await this.mcpCall<{ paths?: string[] } | string[]>('gbrain.search', { prefix, frontmatter: filters, limit: 1 })
    const paths = Array.isArray(out) ? out : (out?.paths ?? [])
    return paths[0] ?? null
  }

  private authHeaders(): Record<string, string> {
    return { authorization: `Bearer ${this.apiKey}` }
  }

  // ===== File-mode operations (local markdown filesystem) =====

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
    // Atomic write: write to temp file, then rename (rename is atomic on POSIX same-fs)
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
