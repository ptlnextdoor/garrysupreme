---
id: ISSUE-004
severity: critical
related_task: TASK-S02
files: ["apps/backend/src/routes/save-order.ts", "apps/backend/src/types.ts", "packages/gbrain/src/customer.ts", "apps/dashboard/src/hooks/useSSE.ts", "apps/dashboard/src/components/MemoryReview.tsx"]
---

## Problem
`fact_pending` SSE payload is missing a stable `id`, breaking the Memory Review approve/reject flow end-to-end.

- Backend's `MemoryFact` type has no `id` field. `save-order.ts:126` broadcasts `{ type: 'fact_pending', fact }` where `fact` is a bare `MemoryFact`.
- Dashboard's `useSSE` treats `event.fact` as `PendingFact`, which requires `id`. The pushed object has `id === undefined`.
- `MemoryReview` keys cards on `fact.id` (all undefined → React key collisions, list collapses).
- Approve/reject sends `factId: undefined` to `/api/memory/{approve,reject}` → backend's `CustomerBrain.updateFactStatus` reads `customers/memory-facts/undefined`, returns `false`, no SSE `fact_reviewed` emitted, optimistic dismiss never reverts because the backend silently no-ops.
- The fact's actual storage key is `${callId}-${sanitizedExtractedAt}` (customer.ts:57) — that string is never returned to the client.

## Evidence

`apps/backend/src/routes/save-order.ts:114-127`:
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
}
const ok = await customers.addMemoryFact(fact)
if (ok) hub.broadcast({ type: 'fact_pending', fact })
```

`packages/gbrain/src/customer.ts:55-59`:
```ts
const ts = fact.extractedAt.replace(/[:.]/g, '-')
const itemPath = `customers/memory-facts/${fact.callId}-${ts}`
...
return await this.client.writeItem(itemPath, content)
```

`apps/dashboard/src/hooks/useSSE.ts:106` and `apps/dashboard/src/components/MemoryReview.tsx:97`:
```ts
setPendingFacts((prev) => [...prev, event.fact as PendingFact])  // fact.id is undefined
...
<div key={fact.id} ...>                                          // duplicate undefined keys
```

`apps/dashboard/src/lib/api.ts:27-29`:
```ts
export async function approveFact(factId: string): Promise<void> {
  await post('/api/memory/approve', { factId })
}
```
…called with `fact.id` which is undefined.

## Fix
Add a fact `id` to the type and propagate it through the broadcast.

1. In `apps/backend/src/types.ts`, add `id` to `MemoryFact`:
```ts
export type MemoryFact = {
  id: string
  phone: string
  callId: string
  ...
}
```
2. In `packages/gbrain/src/customer.ts:55`, compute the id once and use it for both the storage key and the fact object:
```ts
const ts = fact.extractedAt.replace(/[:.]/g, '-')
const id = `${fact.callId}-${ts}`
const itemPath = `customers/memory-facts/${id}`
const content = serializeMemoryFact({ ...fact, id, phone: normalized })
```
Also include `id` in `serializeMemoryFact` frontmatter and `parseMemoryFact` so reads round-trip the id.
3. In `apps/backend/src/routes/save-order.ts:114`, set `id` when constructing the fact:
```ts
const ts = placedAt.replace(/[:.]/g, '-')
const fact: MemoryFact = {
  id: `${callId}-${ts}`,
  ...
}
```
Now `hub.broadcast({ type: 'fact_pending', fact })` carries `fact.id` and the dashboard's existing handler works without changes.
