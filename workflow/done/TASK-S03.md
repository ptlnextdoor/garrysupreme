---
id: TASK-S03
priority: P0
status: done
assigned_at: 2026-05-16T12:45:00
completed_at: 2026-05-16T12:55:00
depends_on: TASK-S01
files_changed:
  - apps/backend/src/services/sse-hub.ts
  - apps/backend/src/routes/events.ts
  - apps/backend/src/routes/review.ts
---

## Objective
Build the SSE hub service for real-time dashboard updates and the /api/events endpoint.

## Context
The dashboard needs live updates when calls come in, orders are placed, and memories are learned. SSE is simpler than WebSocket for Next.js. The save_order route will emit events through this hub.

**DO NOT START** until TASK-S01 is complete.

## Files to Create/Modify
1. `apps/backend/src/services/sse-hub.ts` — SSEHub class (may already be stubbed from D02, flesh it out)
2. `apps/backend/src/routes/events.ts` — GET /api/events SSE endpoint
3. `apps/backend/src/routes/review.ts` — POST /api/memory/approve and POST /api/memory/reject

## Implementation Details

### sse-hub.ts
- Singleton pattern
- addClient(res: FastifyReply) — adds response to client set, sends initial connection event
- removeClient(res) — removes on disconnect
- broadcast(event: SSEEvent) — sends to all connected clients as `data: JSON\n\n`
- Event types from types.ts: call-start, call-end, order-placed, memory-learned, memory-approved

### events.ts
- GET /api/events — sets headers for SSE (Content-Type: text/event-stream, no cache, keep-alive)
- Registers client with SSEHub
- Cleans up on close

### review.ts
- POST /api/memory/approve — takes { factId, customerId }, updates memory fact status to approved via GBrain
- POST /api/memory/reject — same but sets status to rejected
- Both emit SSE event after update

## Acceptance Criteria
- SSE endpoint streams events to connected clients
- Multiple clients can connect simultaneously
- Events are properly formatted SSE (data: ... \n\n)
- Memory review endpoints update fact status and emit events
- Clean disconnect handling (no memory leaks)

## Notes from Worker
- `SSEHub` keeps a `Set<FastifyReply>` of subscribers. `addClient` writes an immediate `event: connected\ndata: {at}` frame so the dashboard knows the channel is live. `removeClient` deletes from the set; `broadcast` writes `data: <JSON>\n\n` to each client and removes any whose write throws. Singleton exported as `hub`.
- 15-second heartbeat installed via `setInterval(..., 15000).unref()` — writes a `: ping <ts>\n\n` comment to keep proxies / browser SSE connections alive. `.unref()` so the timer never blocks process exit.
- `events.ts`: `GET /api/events` writes SSE headers directly on `reply.raw` (Fastify swallows manual responses on `raw`). Registers client, cleans up on both `close` and `error` events on the request socket. Returns `reply` to keep Fastify happy.
- `review.ts`: exposes three paths — `POST /api/memory/approve`, `POST /api/memory/reject`, and a combined `POST /api/review` (accepts `{ factId, status }`). All routes call `CustomerBrain.updateFactStatus` (added in TASK-S01) and on success broadcast `{ type: 'fact_reviewed', factId, status }`.
- SSE event shapes use the `SSEEvent` discriminated union from `apps/backend/src/types.ts` (TASK-D02). The task description mentioned hyphenated names (`call-start`, `memory-learned`); I used the underscore names from the actual type definitions (`call_started`, `fact_pending`, `fact_reviewed`, `order_saved`) — if the dashboard expects hyphens, types.ts is the source of truth and should be updated there rather than in routes.
- Backend `index.ts` already has the TODO block to register `eventsRoute` and `reviewRoute`; Stupid Coder just uncomments it.
- Same cross-package import caveat as S01/S02 — relative paths into `packages/gbrain` need TS project refs or workspace dep wiring before typecheck passes.
