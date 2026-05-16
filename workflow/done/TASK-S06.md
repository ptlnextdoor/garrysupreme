---
id: TASK-S06
priority: P0
status: done
assigned_at: 2026-05-16T13:28:00
completed_at: 2026-05-16T13:45:00
completed_by: CEO (took over from stalled Smart Coder)
files_changed:
  - apps/backend/src/routes/vapi-webhook.ts
  - apps/backend/src/index.ts
---

## Notes from Worker
Created vapi-webhook.ts: POST /api/vapi-webhook dispatcher that reads toolCallList from Vapi payload, delegates to handleGetContext or handleSaveOrder, returns { results: [{ toolCallId, result }] } in Vapi's expected format. Extracts phone/callId from message.call.customer.number. handleGetContext reuses same logic as context.ts (parallel GBrain reads + scorer ranking). handleSaveOrder replies immediately, persists async via setImmediate. Registered in index.ts.
