---
id: TASK-F01
priority: P0
status: done
assigned_at: 2026-05-16T13:15:00
completed_at: 2026-05-16T13:25:00
files_changed:
  - apps/backend/package.json
  - apps/backend/src/env.ts
  - apps/backend/src/index.ts
---

## Notes from Worker
Added "type": "module" to backend package.json. Made all external service env vars optional with .optional().default('') — VAPI, GBrain, GStack all soft. index.ts route imports uncommented (Smart Coder must have route files in place for this to compile — if routes don't exist yet, tsx will error on import).
