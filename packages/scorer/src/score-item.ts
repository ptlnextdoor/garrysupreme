import type { MenuItem, CustomerProfile, Session } from '@pulse/types'

const COLD_HINTS = ['cold', 'iced', 'over ice', 'cool', 'chilled']
const HOT_HINTS = ['hot', 'warm', 'steamed', 'latte', 'cappuccino', 'chai', 'matcha']
const SWEET_HINTS = ['sweet', 'sugar', 'syrup', 'vanilla', 'caramel', 'honey', 'sugary']
const DAIRY_AVOID_HINTS = ['no dairy', 'no milk', 'dairy free', 'dairy-free', 'oat milk', 'almond milk', 'soy milk', 'lactose']

export function parseSession(request: string): Session {
  const r = (request ?? '').toLowerCase()
  const tokens = r.split(/[^a-z0-9]+/).filter(Boolean)

  const hasAny = (hints: string[]): boolean => hints.some((h) => r.includes(h))

  let temperature: Session['temperature'] = null
  if (hasAny(COLD_HINTS)) temperature = 'cold'
  else if (hasAny(HOT_HINTS)) temperature = 'hot'

  const sweetness: Session['sweetness'] = hasAny(SWEET_HINTS) ? 'sweet' : null
  const dairy: Session['dairy'] = hasAny(DAIRY_AVOID_HINTS) ? 'avoid' : null

  return { temperature, sweetness, dairy, keywords: Array.from(new Set(tokens)) }
}

export function scoreItem(item: MenuItem, session: Session, customer: CustomerProfile | null): number {
  let score = 0
  const attrs = item.attributes.map((a) => a.toLowerCase())

  if (session.temperature && attrs.includes(session.temperature)) score += 2
  if (session.sweetness && attrs.includes(session.sweetness)) score += 2
  if (session.dairy === 'avoid' && item.dairyFree) score += 3

  for (const kw of session.keywords) {
    if (!kw) continue
    if (attrs.includes(kw) || item.name.toLowerCase().includes(kw)) score += 1
  }

  if (customer) {
    const nameLower = item.name.toLowerCase()
    for (const like of customer.likes ?? []) {
      const l = like.toLowerCase()
      if (attrs.some((attr) => l.includes(attr)) || l.includes(nameLower)) score += 1
    }
    for (const avoid of customer.avoids ?? []) {
      const av = avoid.toLowerCase()
      if (attrs.some((attr) => av.includes(attr))) score -= 5
      else if (av.includes('dairy') && !item.dairyFree) score -= 5
    }
  }

  return score
}

export function rankMenu(menu: MenuItem[], session: Session, customer: CustomerProfile | null): MenuItem[] {
  return [...menu]
    .map((item) => ({ item, score: scoreItem(item, session, customer) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item)
}
