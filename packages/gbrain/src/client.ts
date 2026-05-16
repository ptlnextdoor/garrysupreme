import { promises as fs } from 'node:fs'
import * as path from 'node:path'

export type GBrainMode = 'api' | 'file'

export type GBrainConfig = {
  apiKey?: string
  baseUrl?: string
  projectId?: string
  dataRoot?: string
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

  constructor(cfg: GBrainConfig = {}) {
    const apiKey = cfg.apiKey ?? process.env.GBRAIN_API_KEY
    const baseUrl = cfg.baseUrl ?? process.env.GBRAIN_BASE_URL
    const projectId = cfg.projectId ?? process.env.GBRAIN_PROJECT_ID
    this.dataRoot = cfg.dataRoot ?? process.env.GBRAIN_DATA_ROOT ?? path.resolve(process.cwd(), 'data')

    if (apiKey && baseUrl) {
      this.mode = 'api'
      this.apiKey = apiKey
      this.baseUrl = baseUrl.replace(/\/$/, '')
      this.projectId = projectId
    } else {
      this.mode = 'file'
    }
  }

  async readItem(itemPath: string): Promise<string | null> {
    try {
      if (this.mode === 'api') return await this.apiRead(itemPath)
      return await this.fileRead(itemPath)
    } catch (err) {
      log(`readItem failed: ${itemPath}`, err)
      return null
    }
  }

  async writeItem(itemPath: string, content: string): Promise<boolean> {
    try {
      if (this.mode === 'api') {
        await this.apiWrite(itemPath, content, 'replace')
      } else {
        await this.fileWrite(itemPath, content)
      }
      return true
    } catch (err) {
      log(`writeItem failed: ${itemPath}`, err)
      return false
    }
  }

  async appendItem(itemPath: string, content: string): Promise<boolean> {
    try {
      if (this.mode === 'api') {
        await this.apiWrite(itemPath, content, 'append')
      } else {
        await this.fileAppend(itemPath, content)
      }
      return true
    } catch (err) {
      log(`appendItem failed: ${itemPath}`, err)
      return false
    }
  }

  async listItems(prefix: string): Promise<string[]> {
    try {
      if (this.mode === 'api') return await this.apiList(prefix)
      return await this.fileList(prefix)
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

  private async apiRead(itemPath: string): Promise<string | null> {
    // FIXME: adapt to real GBrain API endpoint shape
    const res = await fetch(`${this.baseUrl}/items/${encodeURIComponent(itemPath)}`, {
      headers: this.authHeaders(),
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`GBrain read ${res.status}: ${await res.text()}`)
    const body = (await res.json()) as { content?: string }
    return body.content ?? null
  }

  private async apiWrite(itemPath: string, content: string, mode: 'replace' | 'append'): Promise<void> {
    // FIXME: adapt to real GBrain API endpoint shape
    const res = await fetch(`${this.baseUrl}/items/${encodeURIComponent(itemPath)}`, {
      method: 'PUT',
      headers: { ...this.authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ content, mode, projectId: this.projectId }),
    })
    if (!res.ok) throw new Error(`GBrain write ${res.status}: ${await res.text()}`)
  }

  private async apiList(prefix: string): Promise<string[]> {
    // FIXME: adapt to real GBrain API endpoint shape
    const res = await fetch(`${this.baseUrl}/items?prefix=${encodeURIComponent(prefix)}`, {
      headers: this.authHeaders(),
    })
    if (!res.ok) throw new Error(`GBrain list ${res.status}: ${await res.text()}`)
    const body = (await res.json()) as { paths?: string[] }
    return body.paths ?? []
  }

  private authHeaders(): Record<string, string> {
    return { authorization: `Bearer ${this.apiKey}` }
  }

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

  private async fileAppend(itemPath: string, content: string): Promise<void> {
    const full = this.resolvePath(itemPath)
    await fs.mkdir(path.dirname(full), { recursive: true })
    const existing = await this.fileRead(itemPath)
    const merged = existing === null
      ? content
      : (existing.endsWith('\n') ? existing + content : existing + '\n' + content)
    // Use atomic write via fileWrite for safety under concurrency
    await this.fileWrite(itemPath, merged)
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
