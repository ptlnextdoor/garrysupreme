import { GStackClient } from './client.js'

export type IngestInput = {
  callId: string
  phone: string
  transcript: string
  order: { items: string[]; customerName: string }
}

const INGEST_INSTRUCTIONS = `Extract memory facts from the call transcript and order data.
For each fact: produce { fact, evidence, confidence (0-1), category (dietary|preference|household|behavioral) }.
Only emit facts with confidence >= 0.7. Write them to GBrain under customers/memory-facts/.`

let _client: GStackClient | null = null
function client(): GStackClient {
  if (!_client) _client = new GStackClient()
  return _client
}

export async function triggerIngest(data: IngestInput): Promise<void> {
  await client().triggerRole('ingest', data, INGEST_INSTRUCTIONS)
}
