export type MenuItem = {
  name: string
  price: number
  description: string
  dairyFree: boolean
  attributes: string[]
  modifiers: string[]
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

export type MemoryFact = {
  id: string
  phone: string
  callId: string
  fact: string
  evidence: string
  confidence: number
  category: 'dietary' | 'preference' | 'household' | 'behavioral'
  status: 'pending_review' | 'approved' | 'rejected'
  extractedAt: string
}

export type Session = {
  temperature: 'hot' | 'cold' | null
  sweetness: 'sweet' | null
  dairy: 'avoid' | null
  keywords: string[]
}

export type SSEEvent =
  | { type: 'call_started'; callId: string; phone: string; customerName: string }
  | { type: 'call_status'; callId: string; status: string }
  | { type: 'call_ended'; callId: string }
  | { type: 'order_saved'; callId: string; phone: string; customerName: string; items: string[]; total: number; timestamp: string }
  | { type: 'fact_pending'; fact: MemoryFact }
  | { type: 'fact_reviewed'; factId: string; status: 'approved' | 'rejected' }

export type VapiWebhookBody = {
  message: {
    type: string
    call: {
      id: string
      customer: {
        number: string
      }
    }
    toolCallList?: Array<{
      id: string
      function: {
        name: string
        arguments: string
      }
    }>
  }
}

export type SaveOrderArgs = {
  items: string[]
  customerName: string
  total?: number
}

export type ReviewArgs = {
  factId: string
  status: 'approved' | 'rejected'
}
