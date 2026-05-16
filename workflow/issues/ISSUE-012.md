---
id: ISSUE-012
severity: warning
related_task: TASK-S05
files: ["apps/backend/src/routes/queries.ts", "apps/backend/src/routes/vapi-webhook.ts", "apps/dashboard/src/lib/types.ts"]
---

## Problem
The Active Calls panel — one of the most visually prominent demo elements — will be empty during a real call. Two gaps:

1. `activeCalls` (queries.ts:12) is an exported `Map` but **nothing ever writes to it**. The vapi-webhook only handles `tool-calls` messages, not `status-update` / `end-of-call-report`. So `GET /api/calls/active` always returns `{ calls: [] }`, and `call_started` / `call_ended` SSE events are never broadcast.
2. The `ActiveCall` type in `queries.ts` declares `startedAt: string`, but `apps/dashboard/src/lib/types.ts` declares `startedAt: number` and `<CallDuration startedAt={call.startedAt}>` does `Date.now() - startedAt` arithmetic. If the backend later populates the map with strings, the duration timer renders `NaN:NaN` or crashes.

## Evidence

`apps/backend/src/routes/queries.ts:4-12`:
```ts
interface ActiveCall {
  callId: string
  phone: string
  customerName: string
  startedAt: string                    // ← string
}
export const activeCalls = new Map<string, ActiveCall>()
```

`apps/dashboard/src/lib/types.ts:1-7`:
```ts
export type ActiveCall = {
  callId: string
  phone: string
  customerName: string
  startedAt: number                    // ← number
  status: string
}
```

`apps/backend/src/routes/vapi-webhook.ts` — only branches on `tc.function.name`; never inspects `message.type` for call lifecycle:
```ts
if (toolCallList.length === 0) {
  log('no toolCallList in webhook payload')
  return reply.send({ results: [] })   // status-update / end-of-call dropped silently
}
```

## Fix
In `apps/backend/src/routes/vapi-webhook.ts`, handle non-tool messages too. Add a branch before the `toolCallList` early-return:

```ts
const msgType = message?.type as string | undefined

if (msgType === 'status-update' || msgType === 'call-start') {
  if (callId !== 'unknown-call') {
    const existing = activeCalls.get(callId)
    if (!existing) {
      // Try to enrich with customer name via GBrain
      const profile = phone !== 'unknown' ? await customerBrain.getProfile(phone) : null
      const customerName = profile?.name ?? 'Caller'
      activeCalls.set(callId, { callId, phone, customerName, startedAt: Date.now() })
      hub.broadcast({ type: 'call_started', callId, phone, customerName })
    } else {
      hub.broadcast({ type: 'call_status', callId, status: (message as Record<string, unknown>).status as string ?? 'connected' })
    }
  }
  return reply.send({ ok: true })
}

if (msgType === 'end-of-call-report' || msgType === 'call-end') {
  if (callId !== 'unknown-call') {
    activeCalls.delete(callId)
    hub.broadcast({ type: 'call_ended', callId })
  }
  return reply.send({ ok: true })
}
```

Also change `queries.ts:8` to `startedAt: number` (match the dashboard) — or better, drop the local interface and import `ActiveCall` from `@pulse/types` to make the dashboard/backend contract single-source.

Verify the exact `message.type` strings against the Vapi webhook payload — recent Vapi versions use `status-update` with `status: 'in-progress' | 'ended' | ...` rather than separate `call-start` / `call-end` messages. Add a `log()` of `msgType` once at the top of the handler so you can confirm the live payload during dev.
