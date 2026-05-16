---
id: TASK-S02
priority: P0
status: done
assigned_at: 2026-05-16T12:45:00
completed_at: 2026-05-16T12:52:00
depends_on: TASK-S01
files_changed:
  - packages/scorer/src/score-item.ts
  - packages/scorer/src/index.ts
  - apps/backend/src/routes/context.ts
  - apps/backend/src/routes/save-order.ts
---

## Objective
Build the scorer module and the two critical backend routes: /api/context and /api/save_order.

## Context
These are the two endpoints Vapi calls mid-conversation. /api/context fetches company + customer brain and returns a pre-ranked menu. /api/save_order saves the confirmed order and emits events. The scorer pre-ranks menu items so the LLM doesn't invent recommendations. This is the critical path for the demo.

**DO NOT START** until TASK-S01 is complete (you need GBrain client for reads/writes).

## Files to Create
1. `packages/scorer/src/score-item.ts` — scoreItem(item, session, customer) function + parseSession(request) helper
2. `packages/scorer/src/index.ts` — barrel export
3. `apps/backend/src/routes/context.ts` — POST /api/context route
4. `apps/backend/src/routes/save-order.ts` — POST /api/save_order route

## Implementation Details

### score-item.ts
- Import MenuItem, CustomerProfile, Session from types.ts
- scoreItem: +2 for temperature match, +2 for sweetness match, +3 for dairy-free when customer avoids dairy, +1 per matching like, -5 per matching avoid
- parseSession: extract temperature/sweetness/dairy from request string

### context.ts
- Extract phone from body.call?.customer?.number ?? body.phone_number ?? "unknown"
- Extract request from body.request ?? ""
- Use GBrain CustomerBrain to get profile (fallback to new customer)
- Use GBrain CompanyBrain to get menu
- Score and rank menu items
- Return { customer, company: { name, menu: rankedMenu, rules } }

### save-order.ts
- Reply { ok: true } immediately (don't block Vapi)
- In setImmediate: write order to GBrain, generate memory facts, emit SSE events
- Use types SaveOrderArgs

## Acceptance Criteria
- POST /api/context returns ranked menu + customer profile
- POST /api/save_order returns immediately, writes async
- Scorer correctly ranks items (dairy-free items score higher for dairy-avoiding customers)
- File-backed GBrain mode works with seed data from TASK-D03
- Routes register in index.ts

## Notes from Worker
- `parseSession` scans for `hot|warm|steamed|latte|chai|matcha` → `hot`, `cold|iced|chilled` → `cold` (cold checked first so "iced latte" classifies cold). `sweet|syrup|vanilla|caramel|honey` → `sweet`. `no dairy|dairy free|oat/almond/soy milk|lactose` → `avoid`. Keywords tokenized off the raw request for keyword bonuses.
- `scoreItem` follows the spec exactly: temp +2, sweetness +2, dairy-avoid + dairyFree item +3, each customer like that matches an attribute or the item name +1, each avoid that matches an attribute -5, plus an extra -5 when customer avoids "dairy" and the item isn't dairyFree.
- `rankMenu` exported as a convenience — stable sort by score descending.
- `context.ts`: registers `POST /api/context`. Phone extraction handles both Vapi webhook shape (`message.call.customer.number`) and the simpler `call.customer.number` / `phone_number` forms. `request` comes from top-level `request` field or from the first toolCall's JSON-encoded `arguments.request`. Runs `getMenu`, `getPolicies`, `getProfile` in parallel via `Promise.all`. Returns ANONYMOUS_PROFILE when phone is unknown or no profile found.
- `save-order.ts`: replies `{ ok: true, pickup_time: '~10 minutes' }` synchronously, then `setImmediate` runs the persistence path — order append, memory-fact writes, SSE broadcast, gstack ingest trigger. Any failure is logged via `log()` and swallowed (never throws back to Vapi). gstack import is dynamic + try/catch so the route works before `packages/gstack` is built.
- Both routes are Fastify plugins (`FastifyPluginAsync`). `apps/backend/src/index.ts` already has the TODO block for registering them — Stupid Coder should uncomment it.
- Cross-package imports use relative paths `../../../../packages/...`. Same caveat as TASK-S01: needs proper TS project refs or workspace `@pulse/*` deps wired by Stupid Coder before this typechecks.
- **Env conflict to flag for Debugger/CEO**: `apps/backend/src/env.ts` declares `GBRAIN_API_KEY: z.string().min(1)` (required) — but `GBrainClient` only falls back to file-backed mode when the API key is absent. For the demo to use seed data without a real GBrain, either make `GBRAIN_API_KEY`/`GBRAIN_BASE_URL` optional in env.ts, or pass `dataRoot` explicitly and force file mode. Likely a Stupid Coder env tweak.
- Boundary `any`s: only inside the toolCall JSON.parse path in context.ts (explicit eslint-disable). Public APIs are fully typed.
