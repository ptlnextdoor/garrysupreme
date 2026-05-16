export type CustomerLanguage = "English" | "Spanish" | "Mandarin" | "Vietnamese" | "Hindi" | "French"

export type Customer = {
  id: string
  name: string
  phone: string
  language: CustomerLanguage
  joinedAt: string
  totalOrders: number
  avgTicket: number
  lastOrderAt: string | null
  churnRisk: "low" | "medium" | "high"
  preferences: string[]
  allergies: string[]
  notes: string
  favoriteItemIds: string[]
}

export type MenuItem = {
  id: string
  name: string
  price: number
  category: "drinks" | "pastries" | "breads" | "cakes"
  popular?: boolean
  newItem?: boolean
  allergens: string[]
}

export type CallStatus = "active" | "completed" | "escalated"

export type CallTurn = {
  speaker: "customer" | "agent"
  text: string
}

export type Call = {
  id: string
  customerId: string | null
  customerNameSnapshot: string
  startedAt: string
  durationSec: number
  status: CallStatus
  outcome: string
  transcript: CallTurn[]
}

export type Insight = {
  id: string
  kind: "trend" | "churn" | "cross-sell" | "menu"
  title: string
  body: string
  metric?: string
  customerId?: string
}

export type GBrainNodeType = "customer" | "menu" | "preference" | "insight"

export type GBrainNode = {
  id: string
  label: string
  type: GBrainNodeType
  markdown: string
}

export type GBrainLink = {
  source: string
  target: string
  kind: "prefers" | "orders" | "co-occurrence" | "alert" | "trend"
}
