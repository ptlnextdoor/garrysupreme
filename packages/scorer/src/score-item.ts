import type { MenuItem, CustomerProfile, Session } from '@pulse/types'

const COLD_HINTS = ['cold', 'iced', 'over ice', 'cool', 'chilled', 'frozen']
const HOT_HINTS = ['hot', 'warm', 'steamed']
const SWEET_HINTS = ['sweet', 'sugar', 'syrup', 'vanilla', 'caramel', 'honey', 'sugary', 'dessert']
const DAIRY_AVOID_HINTS = ['no dairy', 'no milk', 'dairy free', 'dairy-free', 'oat milk', 'almond milk', 'soy milk', 'lactose', 'lactose intolerant']

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'for', 'on', 'in', 'at', 'to', 'of', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'them',
  'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might',
  'some', 'any', 'all', 'new', 'looking', 'need', 'want', 'get', 'getting', 'find',
  'this', 'that', 'these', 'those', 'just', 'really', 'about', 'from',
  'today', 'tomorrow', 'tonight', 'morning', 'evening', 'night',
])

// Common singular/plural and stem normalizations
const STEM_MAP: Record<string, string> = {
  diapers: 'diaper',
  vitamins: 'vitamin',
  televisions: 'tv',
  television: 'tv',
  tvs: 'tv',
  computers: 'computer',
  laptops: 'laptop',
  headphones: 'audio',
  cookies: 'cookie',
  snacks: 'snack',
  kids: 'kid',
  pets: 'pet',
  dogs: 'dog',
  cats: 'cat',
  groceries: 'grocery',
  drinks: 'beverage',
  drink: 'beverage',
  bars: 'bar',
  candies: 'candy',
  candys: 'candy',
}

function normalize(word: string): string {
  const w = word.toLowerCase()
  if (STEM_MAP[w]) return STEM_MAP[w]
  // Naive plural stripping
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y'
  if (w.endsWith('es') && w.length > 3) return w.slice(0, -2)
  if (w.endsWith('s') && w.length > 3 && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

export function parseSession(request: string): Session {
  const r = (request ?? '').toLowerCase()
  const rawTokens = r.split(/[^a-z0-9]+/).filter(Boolean)
  const tokens = rawTokens
    .filter((t) => !STOPWORDS.has(t) && t.length > 1)
    .map(normalize)

  const hasAny = (hints: string[]): boolean => hints.some((h) => r.includes(h))

  let temperature: Session['temperature'] = null
  if (hasAny(COLD_HINTS)) temperature = 'cold'
  else if (hasAny(HOT_HINTS)) temperature = 'hot'

  const sweetness: Session['sweetness'] = hasAny(SWEET_HINTS) ? 'sweet' : null
  const dairy: Session['dairy'] = hasAny(DAIRY_AVOID_HINTS) ? 'avoid' : null

  return { temperature, sweetness, dairy, keywords: Array.from(new Set(tokens)) }
}

function attrContains(attrs: string[], kw: string): boolean {
  // Match exact OR as substring of any attribute
  for (const a of attrs) {
    if (a === kw) return true
    if (a.includes(kw) || kw.includes(a)) return true
  }
  return false
}

export function scoreItem(item: MenuItem, session: Session, customer: CustomerProfile | null): number {
  let score = 0
  const attrs = item.attributes.map((a) => a.toLowerCase())
  const nameLower = item.name.toLowerCase()
  const nameTokens = nameLower.split(/[^a-z0-9]+/).filter((t) => t.length > 1).map(normalize)
  const nameSet = new Set(nameTokens)

  // Query relevance — heavily weighted to ensure query intent dominates
  if (session.temperature && attrs.includes(session.temperature)) score += 3
  if (session.sweetness && attrs.includes(session.sweetness)) score += 2
  if (session.dairy === 'avoid' && item.dairyFree) score += 4

  // Strong keyword matching — each match worth significant points
  for (const kw of session.keywords) {
    if (!kw) continue
    let matched = false
    // Exact attribute match (highest signal)
    if (attrs.includes(kw)) { score += 5; matched = true }
    // Substring match in attributes (e.g., "salmon" in "salmon-burger")
    else if (attrContains(attrs, kw)) { score += 3; matched = true }
    // Name token exact match (e.g., "tv" in "TV stand")
    if (nameSet.has(kw)) { score += 4; matched = true }
    // Name substring match
    else if (nameLower.includes(kw)) { score += 2; matched = true }
  }

  // Customer preferences — modest weight so they don't overwhelm query relevance
  if (customer) {
    for (const like of customer.likes ?? []) {
      const l = like.toLowerCase()
      for (const attr of attrs) {
        if (l.includes(attr)) { score += 1; break }
      }
      if (l.includes(nameLower)) score += 1
    }
    for (const avoid of customer.avoids ?? []) {
      const av = avoid.toLowerCase()
      let hit = false
      for (const attr of attrs) {
        if (av.includes(attr) || attr.includes(av.split(' ')[0])) {
          score -= 8
          hit = true
          break
        }
      }
      if (!hit && av.includes('dairy') && !item.dairyFree) score -= 8
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
