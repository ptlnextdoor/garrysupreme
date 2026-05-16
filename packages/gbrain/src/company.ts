import { GBrainClient, stripFrontmatter } from './client.js'
import type { MenuItem } from '@pulse/types'

const log = (msg: string, data?: unknown): void => {
  if (data !== undefined) console.error(`[gbrain:company] ${msg}`, data)
  else console.error(`[gbrain:company] ${msg}`)
}

export class CompanyBrain {
  constructor(private readonly client: GBrainClient) {}

  async getMenu(slug: string): Promise<MenuItem[]> {
    try {
      const content = await this.client.readItem(`companies/${slug}/menu`)
      if (!content) return []
      return parseMenu(content)
    } catch (err) {
      log(`getMenu failed: ${slug}`, err)
      return []
    }
  }

  async getPolicies(slug: string): Promise<string> {
    try {
      const content = await this.client.readItem(`companies/${slug}/policies`)
      return content ? stripFrontmatter(content).trim() : ''
    } catch (err) {
      log(`getPolicies failed: ${slug}`, err)
      return ''
    }
  }

  async getAllergens(slug: string): Promise<string> {
    try {
      const content = await this.client.readItem(`companies/${slug}/allergens`)
      return content ? stripFrontmatter(content).trim() : ''
    } catch (err) {
      log(`getAllergens failed: ${slug}`, err)
      return ''
    }
  }
}

export function parseMenu(content: string): MenuItem[] {
  const body = stripFrontmatter(content)
  const sections = body.split(/^##\s+/m).slice(1)
  const items: MenuItem[] = []
  for (const section of sections) {
    const item = parseMenuItem(section)
    if (item) items.push(item)
  }
  return items
}

function parseMenuItem(section: string): MenuItem | null {
  const lines = section.split('\n')
  const name = lines[0]?.trim()
  if (!name) return null

  const fields: Record<string, string> = {}
  for (const raw of lines.slice(1)) {
    const m = /^-\s+([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(raw.trim())
    if (m) fields[m[1].toLowerCase()] = m[2].trim()
  }

  const price = parseFloat(fields.price ?? '0')
  return {
    name,
    price: Number.isFinite(price) ? price : 0,
    description: fields.description ?? '',
    dairyFree: parseBool(fields.dairy_free),
    attributes: parseList(fields.attributes),
    modifiers: parseList(fields.modifiers),
  }
}

function parseBool(value: string | undefined): boolean {
  if (!value) return false
  return value.trim().toLowerCase() === 'true'
}

function parseList(value: string | undefined): string[] {
  if (!value) return []
  const trimmed = value.trim()
  const inner = trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed.slice(1, -1) : trimmed
  return inner
    .split(',')
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
}
