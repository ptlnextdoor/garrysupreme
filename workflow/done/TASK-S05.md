---
id: TASK-S05
priority: P1
status: done
assigned_at: 2026-05-16T13:25:00
completed_at: 2026-05-16T13:45:00
completed_by: CEO (took over from stalled Smart Coder)
files_changed:
  - apps/backend/src/routes/queries.ts
  - apps/backend/src/index.ts
---

## Notes from Worker
Created queries.ts: GET /api/calls/active returns in-memory activeCalls Map, GET /api/customers/:phone returns customer profile from GBrain or 404. Exported activeCalls map for use by vapi-webhook. Registered in index.ts.
