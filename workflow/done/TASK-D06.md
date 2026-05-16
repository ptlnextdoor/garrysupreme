---
id: TASK-D06
priority: P0
status: done
assigned_at: 2026-05-16T13:12:00
completed_at: 2026-05-16T13:18:00
files_changed:
  - Procfile
  - apps/dashboard/vercel.json
  - scripts/seed-gbrain.ts
  - scripts/setup-vapi.ts
  - scripts/test-call.ts
---

## Notes from Worker
Procfile points to compiled backend dist. vercel.json uses @pulse_backend_url env var and rewrites /api/* to Railway URL. seed-gbrain.ts walks data/ recursively, validates all .md files readable, then POSTs each to GBrain with frontmatter parsed as metadata. setup-vapi.ts reads vapi/ files and creates assistant via Vapi API, logs VAPI_ASSISTANT_ID to paste into .env. test-call.ts POSTs a fake get_context webhook body to localhost:3001/api/context and prints response.
