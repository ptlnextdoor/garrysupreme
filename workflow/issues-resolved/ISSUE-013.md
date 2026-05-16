---
id: ISSUE-013
severity: critical
related_task: TASK-S03
files: ["apps/backend/src/routes/events.ts", "apps/backend/src/index.ts", "apps/backend/src/env.ts"]
---

## Problem
Once the dashboard is deployed to Vercel and the backend to Railway, the SSE stream that feeds the live dashboard will be blocked by CORS, and several other cross-origin fetches will likely fail. Two layered issues:

1. **`events.ts` bypasses `@fastify/cors`.** The handler writes headers directly via `reply.raw.writeHead(200, {...})`. That call replaces the response headers wholesale — the `Access-Control-Allow-Origin` header that the `cors` plugin would have added (via Fastify's hook chain) is discarded. Result: browser opens an `EventSource` to `pulse-backend.up.railway.app`, gets a 200 with no `Access-Control-Allow-Origin`, and blocks the stream. The Order Feed, Memory Review, Stats Bar all stay frozen during the live demo. Local integration testing didn't catch this because same-origin localhost iframes sometimes succeed without strict CORS enforcement; the deployed cross-origin case will fail.

2. **`FRONTEND_URL` defaults to `http://localhost:3000`** in `env.ts`. If Railway is deployed without `FRONTEND_URL` set to the actual Vercel URL, even the *non-SSE* fetches (`/api/calls/active`, `/api/customers/:phone`, `/api/memory/approve`, `/api/memory/reject`) will fail CORS. The dashboard's `catch` swallows it for `/api/calls/active`, but `approveFact`/`rejectFact` will throw — Memory Review's optimistic dismiss will revert on every click.

## Evidence

`apps/backend/src/routes/events.ts:6-11`:
```ts
reply.raw.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
})        // no Access-Control-Allow-Origin → browser blocks the stream cross-origin
```

`apps/backend/src/index.ts:19-22`:
```ts
await app.register(cors, {
  origin: env.FRONTEND_URL,           // single string, default localhost:3000
  methods: ['GET', 'POST'],
})
```

`apps/backend/src/env.ts:25`:
```ts
FRONTEND_URL: z.string().url().default('http://localhost:3000'),
```

`apps/dashboard/vercel.json` proxies `/api/*` to Railway via rewrite, but `useSSE.ts:39` opens `new EventSource('${BACKEND_URL}/api/events')` where `BACKEND_URL = NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'` — so the SSE call goes browser → Railway directly, not through the rewrite. CORS is the only gate.

## Fix
Two small changes:

1. In `apps/backend/src/routes/events.ts`, include CORS headers in the raw writeHead so they survive the bypass. Source the allowed origin from env:
```ts
import { env } from '../env.js'
...
reply.raw.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
  'Access-Control-Allow-Origin': env.FRONTEND_URL,
  'Access-Control-Allow-Credentials': 'true',
})
```
Also call `reply.hijack()` before the writeHead so Fastify stops trying to manage the response lifecycle on this connection — otherwise Fastify will log warnings (and on some versions, drop the connection after the handler returns).

2. Make sure Railway sets `FRONTEND_URL` to the deployed Vercel URL (e.g. `https://pulse-dashboard.vercel.app`) before the demo. Document this in `STATUS.md` or the deploy checklist. If you want to support both `localhost:3000` and the Vercel URL during dev/demo without juggling env vars, switch the cors plugin to accept an array or a function:
```ts
await app.register(cors, {
  origin: (origin, cb) => cb(null, true),  // demo-grade: allow all
  methods: ['GET', 'POST'],
})
```
(Use the function form rather than `origin: '*'` so credentials/`Access-Control-Allow-Credentials` still work.)

Verify with a quick smoke test from a non-localhost origin before the demo: `curl -i -H "Origin: https://example.com" https://pulse-backend.up.railway.app/api/calls/active` should return `access-control-allow-origin: https://example.com` (or `*` if you went with allow-all).
