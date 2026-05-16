import 'dotenv/config'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001'
const DEMO_PHONE = process.env.DEMO_PHONE ?? '+1XXXXXXXXXX'

// Simulates what Vapi sends when get_context is called
const fakeWebhookBody = {
  message: {
    type: 'tool-calls',
    call: {
      id: 'test-call-001',
      customer: {
        number: DEMO_PHONE,
      },
    },
    toolCallList: [
      {
        id: 'tool-call-001',
        function: {
          name: 'get_context',
          arguments: JSON.stringify({
            phone_number: '',
            request: 'something warm, not too sweet, no dairy',
          }),
        },
      },
    ],
  },
}

async function main() {
  console.log(`\nSimulating get_context call to ${BACKEND_URL}/api/context`)
  console.log(`Phone: ${DEMO_PHONE}`)
  console.log(`Request: "something warm, not too sweet, no dairy"\n`)

  const res = await fetch(`${BACKEND_URL}/api/context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fakeWebhookBody),
  })

  if (!res.ok) {
    console.error(`❌ ${res.status} ${res.statusText}`)
    const body = await res.text()
    console.error(body)
    process.exit(1)
  }

  const data = await res.json()
  console.log('✅ Response:')
  console.log(JSON.stringify(data, null, 2))
}

main()
