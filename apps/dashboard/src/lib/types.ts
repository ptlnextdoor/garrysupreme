export type ActiveCall = {
  callId: string
  phone: string
  customerName: string
  startedAt: number
  status: string
}

export type RecentOrder = {
  callId: string
  phone: string
  customerName: string
  items: string[]
  total: number
  timestamp: string
}

export type PendingFact = {
  id: string
  phone: string
  callId: string
  fact: string
  evidence: string
  confidence: number
  category: 'dietary' | 'preference' | 'household' | 'behavioral'
}

export type Stats = {
  activeCalls: number
  ordersToday: number
  revenueRecovered: number
  factsLearned: number
}

export type SSEState = {
  activeCalls: ActiveCall[]
  recentOrders: RecentOrder[]
  pendingFacts: PendingFact[]
  stats: Stats
}

export type CustomerProfile = {
  phone: string
  name: string
  likes: string[]
  avoids: string[]
  style: string
  lastOrder?: string
  householdMembers?: { name: string; preferences: string[] }[]
}
