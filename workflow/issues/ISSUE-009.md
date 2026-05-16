---
id: ISSUE-009
severity: warning
related_task: TASK-D07
files: ["apps/dashboard/src/hooks/useSSE.ts", "apps/dashboard/src/lib/api.ts", "apps/backend/src/index.ts"]
---

## Problem
The dashboard calls two backend endpoints that no backend route defines:

- `GET /api/calls/active` — fetched on mount in `useSSE.ts:26` and via `api.ts:getActiveCalls`. Used to seed the Active Calls panel before SSE delivers `call_started`.
- `GET /api/customers/:phone` — declared in `api.ts:getCustomer` for the Customer Profile panel.

Both will 404 in production. The catch swallows the error so the demo doesn't crash, but the panels then show stale/mock data instead of real state — undercuts the "live" claim if the demo is restarted mid-call or if the presenter wants to look up a specific customer.

Additionally, backend never emits `call_started`/`call_ended` SSE events (no route wires them in — only `order_saved`, `fact_pending`, `fact_reviewed` are broadcast). So the Active Calls panel will *only* ever show what the missing REST endpoint would have returned, which is nothing.

## Evidence

`apps/dashboard/src/hooks/useSSE.ts:26-34`:
```ts
fetch(`${BACKEND_URL}/api/calls/active`)
  .then((r) => r.ok ? r.json() : null)
  .then((data: { calls?: ActiveCall[] } | null) => { ... })
  .catch(() => { /* backend may not be up yet — SSE will catch new calls */ })
```

`apps/dashboard/src/lib/api.ts:19-25`:
```ts
export async function getActiveCalls() {
  return get<{ calls: import('./types').ActiveCall[] }>('/api/calls/active')
}
export async function getCustomer(phone: string) {
  return get<import('./types').CustomerProfile>(`/api/customers/${encodeURIComponent(phone)}`)
}
```

Backend route registrations in `apps/backend/src/index.ts:12-20` only mount: `contextRoute`, `saveOrderRoute`, `eventsRoute`, `reviewRoute`. No `/api/calls/active`, no `/api/customers/:phone`, no `call_started` emit during the Vapi webhook lifecycle.

## Fix
Two small additions in Smart Coder's lane:

1. Emit `call_started` and `call_ended` from the Vapi webhook handler. The Vapi message types include `status-update` and `end-of-call-report`; wire those to `hub.broadcast({ type: 'call_started', ... })` and `'call_ended'`. Maintain an in-memory `Map<callId, ActiveCall>` in `sse-hub.ts` (or a sibling service) so the new GET endpoint can read it.

2. Add a small read-only routes file `apps/backend/src/routes/queries.ts`:
```ts
import type { FastifyPluginAsync } from 'fastify'
import { GBrainClient, CustomerBrain } from '@pulse/gbrain'
import { activeCalls } from '../services/sse-hub.js'   // export the Map

const queriesRoute: FastifyPluginAsync = async (app) => {
  app.get('/api/calls/active', async () => ({ calls: Array.from(activeCalls.values()) }))

  const client = new GBrainClient({ dataRoot: DATA_ROOT })   // see ISSUE-005
  const customers = new CustomerBrain(client)
  app.get<{ Params: { phone: string } }>('/api/customers/:phone', async (req, reply) => {
    const profile = await customers.getProfile(req.params.phone)
    if (!profile) return reply.code(404).send({ error: 'not_found' })
    return profile
  })
}
export default queriesRoute
```
Register in `apps/backend/src/index.ts` alongside the other routes.

If there isn't time to implement (2), at minimum stub the routes to return `{ calls: [] }` and `404` cleanly so the dashboard's catch path stays clean without scary console errors during the demo.
