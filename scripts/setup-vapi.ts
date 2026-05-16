import 'dotenv/config'
import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(import.meta.dirname ?? __dirname, '..')
const VAPI_API_KEY = process.env.VAPI_API_KEY
const RAILWAY_URL = process.env.RAILWAY_URL ?? 'https://pulse-backend.up.railway.app'

if (!VAPI_API_KEY) {
  console.error('❌ VAPI_API_KEY is required.')
  process.exit(1)
}

async function main() {
  const systemPrompt = readFileSync(join(ROOT, 'vapi/system-prompt.md'), 'utf8')
  const toolDefs = JSON.parse(readFileSync(join(ROOT, 'vapi/tool-definitions.json'), 'utf8'))

  console.log('Creating Vapi assistant...')

  const payload = {
    name: 'Pulse — Sunrise Coffee',
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      systemPrompt,
      tools: toolDefs,
    },
    voice: {
      provider: '11labs',
      voiceId: 'rachel',
    },
    serverUrl: `${RAILWAY_URL}/api/vapi-webhook`,
    serverUrlSecret: process.env.VAPI_SECRET,
    firstMessage: "Hey! Welcome to Sunrise Coffee. What can I get started for you today?",
    endCallMessage: "Thanks for calling Sunrise Coffee! Your order's being prepared. See you soon!",
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: 'en',
    },
  }

  const res = await fetch('https://api.vapi.ai/assistant', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`❌ Vapi API error: ${res.status} ${body}`)
    process.exit(1)
  }

  const assistant = await res.json() as { id: string; name: string }
  console.log('\n✅ Assistant created!')
  console.log(`   ID: ${assistant.id}`)
  console.log(`   Name: ${assistant.name}`)
  console.log('\nAdd to your .env:')
  console.log(`   VAPI_ASSISTANT_ID=${assistant.id}`)
}

main()
