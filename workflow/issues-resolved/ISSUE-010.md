---
id: ISSUE-010
severity: critical
related_task: TASK-D06
files: ["scripts/setup-vapi.ts", "apps/backend/src/index.ts", "apps/backend/src/routes/context.ts", "apps/backend/src/routes/save-order.ts"]
---

## Problem
The Vapi assistant is configured with a single `serverUrl: ${RAILWAY_URL}/api/vapi-webhook` (setup-vapi.ts:32), but backend never registers a route at `/api/vapi-webhook`. Vapi sends *all* tool calls to that one webhook with `message.toolCallList[0].function.name` indicating which tool was invoked. Today Vapi will hit the URL, get a 404, the tool call returns no result, and the assistant either hallucinates a menu or stalls. This kills the voice path of the demo.

Even if a dispatcher route is added, the route handlers return raw payloads (`{ customer, company, session }` etc.) — Vapi's tool-call webhook protocol expects `{ results: [{ toolCallId, result }] }`. The LLM won't see the data otherwise.

## Evidence

`scripts/setup-vapi.ts:32`:
```ts
serverUrl: `${RAILWAY_URL}/api/vapi-webhook`,
```

`apps/backend/src/index.ts:22-25` (registered routes):
```ts
await app.register(contextRoute)      // POST /api/context
await app.register(saveOrderRoute)    // POST /api/save_order
await app.register(eventsRoute)       // GET  /api/events
await app.register(reviewRoute)       // POST /api/memory/{approve,reject,review}
```
No `/api/vapi-webhook`.

`apps/backend/src/routes/context.ts:96-105` response:
```ts
return reply.send({
  customer,
  company: { name, slug, menu, rules },
  session,
})
```
This is the function-result payload, not a Vapi tool-call response.

## Fix
Add a dispatcher route `apps/backend/src/routes/vapi-webhook.ts` that reads the tool name and delegates, wrapping the response in Vapi's expected shape:

```ts
import type { FastifyPluginAsync } from 'fastify'
import { handleContext } from './context.js'      // refactor to export a pure handler
import { handleSaveOrder } from './save-order.js'

const webhookRoute: FastifyPluginAsync = async (app) => {
  app.post('/api/vapi-webhook', async (req, reply) => {
    const body = req.body as { message?: { toolCallList?: Array<{ id: string; function: { name: string; arguments: string } }> } }
    const toolCalls = body?.message?.toolCallList ?? []

    const results = await Promise.all(toolCalls.map(async (tc) => {
      try {
        const args = JSON.parse(tc.function.arguments || '{}')
        let result: unknown
        if (tc.function.name === 'get_context') {
          result = await handleContext(body, args)         // returns { customer, company, ... }
        } else if (tc.function.name === 'save_order') {
          result = await handleSaveOrder(body, args)       // fire-and-forget internally, return { ok, pickup_time }
        } else {
          result = { error: `unknown tool: ${tc.function.name}` }
        }
        return { toolCallId: tc.id, result }
      } catch (err) {
        return { toolCallId: tc.id, result: { error: String(err) } }
      }
    }))

    return reply.send({ results })
  })
}
export default webhookRoute
```

Refactor `context.ts` and `save-order.ts` to export pure handlers (`handleContext(body, args)`, `handleSaveOrder(body, args)`) and keep the `POST /api/context` / `POST /api/save_order` Fastify endpoints as thin wrappers that call the same handlers and return the raw payload (useful for `scripts/test-call.ts` and dashboard health checks).

Alternative if Vapi tool definitions support per-tool `url`: set `url` on each tool in `vapi/tool-definitions.json` to the existing endpoints, drop the dispatcher. But Vapi still wraps the response as `{ results: [{ toolCallId, result }] }` — confirm in the Vapi docs before relying on it.
