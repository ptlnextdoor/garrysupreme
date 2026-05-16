import { GBrainClient, parseFrontmatter, stripFrontmatter } from './client.js'
import type { CustomerProfile, MemoryFact } from '@pulse/types'

const log = (msg: string, data?: unknown): void => {
  if (data !== undefined) console.error(`[gbrain:customer] ${msg}`, data)
  else console.error(`[gbrain:customer] ${msg}`)
}

export class CustomerBrain {
  constructor(private readonly client: GBrainClient) {}

  async getProfile(phone: string): Promise<CustomerProfile | null> {
    const path = await this.findProfilePath(phone)
    if (!path) return null
    try {
      const content = await this.client.readItem(path)
      if (!content) return null
      return parseProfile(content, normalizePhone(phone))
    } catch (err) {
      log(`getProfile failed: ${phone}`, err)
      return null
    }
  }

  async updateProfile(phone: string, profile: CustomerProfile): Promise<boolean> {
    try {
      const normalized = normalizePhone(phone)
      const existingPath = await this.findProfilePath(normalized)
      const writePath = existingPath ?? `customers/${normalized}`
      const content = serializeProfile({ ...profile, phone: normalized })
      return await this.client.writeItem(writePath, content)
    } catch (err) {
      log(`updateProfile failed: ${phone}`, err)
      return false
    }
  }

  async appendOrderToHistory(phone: string, orderLine: string): Promise<boolean> {
    try {
      const normalized = normalizePhone(phone)
      const path = await this.findProfilePath(normalized)
      if (!path) return false
      const existing = await this.client.readItem(path)
      if (!existing) return false
      const updated = appendOrderSection(existing, orderLine)
      return await this.client.writeItem(path, updated)
    } catch (err) {
      log(`appendOrderToHistory failed: ${phone}`, err)
      return false
    }
  }

  private async findProfilePath(phone: string): Promise<string | null> {
    try {
      const normalized = normalizePhone(phone)
      const direct = await this.client.readItem(`customers/${normalized}`)
      if (direct) return `customers/${normalized}`

      const candidates = (await this.client.listItems('customers')).filter(
        (p) => !p.includes('memory-facts/'),
      )
      for (const candidatePath of candidates) {
        const content = await this.client.readItem(candidatePath)
        if (!content) continue
        const fm = parseFrontmatter(content)
        if (fm.phone === normalized) return candidatePath
      }
      return null
    } catch (err) {
      log(`findProfilePath failed: ${phone}`, err)
      return null
    }
  }

  async addMemoryFact(fact: MemoryFact): Promise<boolean> {
    try {
      const normalized = normalizePhone(fact.phone)
      const ts = fact.extractedAt.replace(/[:.]/g, '-')
      const id = fact.id || `${fact.callId}-${ts}`
      const itemPath = `customers/memory-facts/${id}`
      const content = serializeMemoryFact({ ...fact, id, phone: normalized })
      return await this.client.writeItem(itemPath, content)
    } catch (err) {
      log(`addMemoryFact failed: ${fact.callId}`, err)
      return false
    }
  }

  async listMemoryFacts(phone: string): Promise<MemoryFact[]> {
    try {
      const normalized = normalizePhone(phone)
      const paths = await this.client.listItems('customers/memory-facts')
      const out: MemoryFact[] = []
      for (const p of paths) {
        const content = await this.client.readItem(p)
        if (!content) continue
        const fm = parseFrontmatter(content)
        if (fm.phone !== normalized) continue
        const fact = parseMemoryFact(content, fm)
        if (fact) out.push(fact)
      }
      return out
    } catch (err) {
      log(`listMemoryFacts failed: ${phone}`, err)
      return []
    }
  }

  async updateFactStatus(factId: string, status: 'approved' | 'rejected'): Promise<boolean> {
    try {
      const itemPath = `customers/memory-facts/${factId}`
      const existing = await this.client.readItem(itemPath)
      if (!existing) return false
      const updated = existing.replace(/^status:\s*.*$/m, `status: "${status}"`)
      return await this.client.writeItem(itemPath, updated)
    } catch (err) {
      log(`updateFactStatus failed: ${factId}`, err)
      return false
    }
  }
}

export function normalizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return phone ?? ''
  // Strip extension (x123, ext 123, #123) — keep only the base number
  const withoutExt = phone.replace(/\s*(?:ext\.?|x|#).*$/i, '').trim()
  // Extract digits; preserve leading + if present
  const hasPlus = withoutExt.startsWith('+')
  const digits = withoutExt.replace(/\D/g, '')
  if (!digits) return withoutExt
  // 10 digits → assume US, prepend 1
  if (digits.length === 10) return `+1${digits}`
  return hasPlus ? `+${digits}` : `+${digits}`
}

function parseProfile(content: string, phone: string): CustomerProfile {
  const fm = parseFrontmatter(content)
  const body = stripFrontmatter(content)
  return {
    phone: fm.phone || phone,
    name: fm.name || extractName(body) || 'Customer',
    likes: extractBulletSection(body, /preferences|likes|favorites/i),
    avoids: extractBulletSection(body, /avoids/i),
    style: extractSection(body, /style/i),
    lastOrder: extractLastOrder(body),
    householdMembers: extractHousehold(body),
  }
}

function extractName(body: string): string | null {
  const m = /^#\s+(.+)$/m.exec(body)
  return m ? m[1].trim() : null
}

function extractSection(body: string, headingRegex: RegExp): string {
  const sections = body.split(/^##\s+/m).slice(1)
  for (const sec of sections) {
    const firstLine = sec.split('\n', 1)[0] ?? ''
    if (headingRegex.test(firstLine)) {
      return sec.slice(firstLine.length).trim()
    }
  }
  return ''
}

function extractBulletSection(body: string, headingRegex: RegExp): string[] {
  const section = extractSection(body, headingRegex)
  if (!section) return []
  return section
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('-'))
    .map((l) => l.slice(1).trim())
    .filter(Boolean)
}

function extractLastOrder(body: string): string | undefined {
  const history = extractSection(body, /order history|history/i)
  if (!history) return undefined
  const lines = history.split('\n').map((l) => l.trim()).filter((l) => /^\d+\./.test(l))
  return lines.length ? lines[lines.length - 1].replace(/^\d+\.\s*/, '') : undefined
}

function extractHousehold(body: string): { name: string; preferences: string[] }[] | undefined {
  const section = extractSection(body, /household/i)
  if (!section) return undefined
  const members: { name: string; preferences: string[] }[] = []
  for (const line of section.split('\n')) {
    const m = /^-\s+\*\*([^*]+)\*\*\s*:\s*(.*)$/.exec(line.trim())
    if (m) members.push({ name: m[1].trim(), preferences: m[2].split(',').map((s) => s.trim()).filter(Boolean) })
  }
  return members.length ? members : undefined
}

function serializeProfile(p: CustomerProfile): string {
  const fm = [
    '---',
    `title: "Customer Profile"`,
    `phone: "${p.phone}"`,
    `name: "${escapeQuotes(p.name)}"`,
    '---',
    '',
  ].join('\n')

  const sections: string[] = [`# ${p.name}`, '']
  if (p.likes.length) {
    sections.push('## Preferences')
    for (const l of p.likes) sections.push(`- ${l}`)
    sections.push('')
  }
  if (p.avoids.length) {
    sections.push('## Avoids')
    for (const a of p.avoids) sections.push(`- ${a}`)
    sections.push('')
  }
  if (p.style) {
    sections.push('## Style', p.style, '')
  }
  if (p.lastOrder) {
    sections.push('## Order History', `1. ${p.lastOrder}`, '')
  }
  if (p.householdMembers?.length) {
    sections.push('## Household Members')
    for (const m of p.householdMembers) {
      sections.push(`- **${m.name}**: ${m.preferences.join(', ')}`)
    }
    sections.push('')
  }
  return fm + sections.join('\n')
}

function appendOrderSection(existing: string, orderLine: string): string {
  if (/^##\s+Order History/im.test(existing)) {
    return existing.replace(/(##\s+Order History\s*\n)([\s\S]*?)(?=\n##\s+|\n*$)/i, (_match, header, body) => {
      const lines = body.split('\n').filter((l: string) => /^\d+\./.test(l.trim()))
      const nextNum = lines.length + 1
      const trimmedBody = body.replace(/\n+$/, '')
      return `${header}${trimmedBody}\n${nextNum}. ${orderLine}\n`
    })
  }
  const sep = existing.endsWith('\n') ? '' : '\n'
  return `${existing}${sep}\n## Order History\n1. ${orderLine}\n`
}

function serializeMemoryFact(f: MemoryFact): string {
  return [
    '---',
    `id: "${f.id}"`,
    `phone: "${f.phone}"`,
    `callId: "${f.callId}"`,
    `category: "${f.category}"`,
    `confidence: ${f.confidence}`,
    `status: "${f.status}"`,
    `extractedAt: "${f.extractedAt}"`,
    '---',
    '',
    `# Memory Fact`,
    '',
    `**Fact:** ${f.fact}`,
    '',
    `**Evidence:** ${f.evidence}`,
    '',
  ].join('\n')
}

function parseMemoryFact(content: string, fm: Record<string, string>): MemoryFact | null {
  const body = stripFrontmatter(content)
  const factMatch = /\*\*Fact:\*\*\s*(.+)/i.exec(body)
  const evidenceMatch = /\*\*Evidence:\*\*\s*(.+)/i.exec(body)
  const confidence = parseFloat(fm.confidence ?? '0')
  const category = (fm.category ?? 'preference') as MemoryFact['category']
  const status = (fm.status ?? 'pending_review') as MemoryFact['status']
  if (!fm.phone || !fm.callId) return null
  const ts = (fm.extractedAt ?? '').replace(/[:.]/g, '-')
  const id = fm.id || `${fm.callId}-${ts}`
  return {
    id,
    phone: fm.phone,
    callId: fm.callId,
    fact: factMatch?.[1].trim() ?? '',
    evidence: evidenceMatch?.[1].trim() ?? '',
    confidence: Number.isFinite(confidence) ? confidence : 0,
    category,
    status,
    extractedAt: fm.extractedAt ?? new Date().toISOString(),
  }
}

function escapeQuotes(s: string): string {
  return s.replace(/"/g, '\\"')
}
