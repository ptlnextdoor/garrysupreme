---
id: ISSUE-011
severity: warning
related_task: TASK-F03
files: ["apps/backend/src/routes/save-order.ts"]
---

## Problem
`save-order.ts` builds the fact `id` as `${callId}-${ts}` where `ts` is derived from `placedAt` (a single timestamp captured once for the whole order). When a call extracts multiple `new_preferences`, every iteration computes the *same* id — and `CustomerBrain.addMemoryFact` writes to `customers/memory-facts/${id}`, so each pref overwrites the previous one. Only the last preference per call survives to disk.

The newer dispatcher path in `vapi-webhook.ts` already gets this right (id suffixed with `-${i}`). The two paths should agree.

## Evidence

`apps/backend/src/routes/save-order.ts:114-128`:
```ts
for (const pref of args.new_preferences ?? []) {
  const ts = placedAt.replace(/[:.]/g, '-')
  const fact: MemoryFact = {
    id: `${callId}-${ts}`,            // ← identical across loop iterations
    ...
  }
  const ok = await customers.addMemoryFact(fact)
  if (ok) hub.broadcast({ type: 'fact_pending', fact })
}
```

vs. `apps/backend/src/routes/vapi-webhook.ts:87-100`:
```ts
for (let i = 0; i < (args.new_preferences ?? []).length; i++) {
  const pref = args.new_preferences![i]
  const ts = placedAt.replace(/[:.]/g, '-')
  const fact: MemoryFact = {
    id: `${callId}-${ts}-${i}`,       // ← unique per pref
    ...
  }
```

`packages/gbrain/src/customer.ts:55-60`:
```ts
const id = fact.id || `${fact.callId}-${ts}`
const itemPath = `customers/memory-facts/${id}`
...
return await this.client.writeItem(itemPath, content)   // overwrites if id collides
```

## Fix
Match the vapi-webhook approach — include an index in the id. In `apps/backend/src/routes/save-order.ts:114`:
```ts
const prefs = args.new_preferences ?? []
for (let i = 0; i < prefs.length; i++) {
  const pref = prefs[i]
  const ts = placedAt.replace(/[:.]/g, '-')
  const fact: MemoryFact = {
    id: `${callId}-${ts}-${i}`,
    ...
  }
  ...
}
```
The dashboard already keys on `fact.id`, so distinct ids also fix the React key duplication when multiple facts arrive from the same call.
