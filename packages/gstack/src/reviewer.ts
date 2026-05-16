import { GStackClient } from './client.js'
import type { MemoryFact } from '@pulse/types'

export type ReviewerInput = {
  facts: MemoryFact[]
  phone: string
}

const REVIEWER_INSTRUCTIONS = `Validate each memory fact. Mark confidence < 0.80 as rejected.
Mark conflicting facts (contradicting existing customer profile) as rejected.
Otherwise mark as pending_review for human approval.`

let _client: GStackClient | null = null
function client(): GStackClient {
  if (!_client) _client = new GStackClient()
  return _client
}

export async function triggerReviewer(data: ReviewerInput): Promise<void> {
  await client().triggerRole('reviewer', data, REVIEWER_INSTRUCTIONS)
}
