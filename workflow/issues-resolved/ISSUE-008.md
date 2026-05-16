---
id: ISSUE-008
severity: critical
related_task: TASK-F02
files: ["apps/backend/src/routes/save-order.ts"]
---

## Problem
TASK-F02 made `id` a **required** field on `MemoryFact` (packages/types/src/index.ts:21) and updated GBrain's `addMemoryFact`/`serializeMemoryFact` to use it. But `save-order.ts` still constructs `MemoryFact` without an `id`, so `pnpm build` now fails with TS2741 ("Property 'id' is missing in type ... but required in type 'MemoryFact'") and the dashboard's `fact_pending` SSE event still arrives with `event.fact.id === undefined` (the original symptom from ISSUE-004).

## Evidence

`packages/types/src/index.ts:20-30`:
```ts
export type MemoryFact = {
  id: string         // ← now required
  phone: string
  callId: string
  ...
}
```

`apps/backend/src/routes/save-order.ts:114-124` (unchanged by F02):
```ts
const fact: MemoryFact = {
  phone: normalized,
  callId,
  fact: pref.fact,
  evidence: pref.evidence ?? '',
  confidence: pref.confidence ?? 0.8,
  category: pref.category ?? 'preference',
  status: 'pending_review',
  extractedAt: placedAt,
}                                     // ← no `id` set
const ok = await customers.addMemoryFact(fact)
if (ok) hub.broadcast({ type: 'fact_pending', fact })   // ← fact.id is undefined on the wire
```

## Fix
Set `id` when constructing the fact in `save-order.ts:114`:
```ts
const ts = placedAt.replace(/[:.]/g, '-')
const fact: MemoryFact = {
  id: `${callId}-${ts}`,
  phone: normalized,
  callId,
  fact: pref.fact,
  evidence: pref.evidence ?? '',
  confidence: pref.confidence ?? 0.8,
  category: pref.category ?? 'preference',
  status: 'pending_review',
  extractedAt: placedAt,
}
```
This matches the id `addMemoryFact` would have computed (customer.ts:56-58 derives the same `${callId}-${ts}`), so storage path and broadcast id stay consistent, and the dashboard's approve/reject can target it via `/api/memory/{approve,reject}`.
