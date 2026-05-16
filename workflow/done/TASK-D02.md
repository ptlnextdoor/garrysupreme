---
id: TASK-D02
priority: P0
status: done
assigned_at: 2026-05-16T10:00:00
completed_at: 2026-05-16T10:15:00
files_changed:
  - apps/backend/src/types.ts
  - apps/backend/src/env.ts
  - apps/backend/src/index.ts
  - apps/backend/src/services/sse-hub.ts
---

## Objective
Create shared TypeScript types and the backend boot file.

## Notes from Worker
types.ts exports all types: MenuItem, CustomerProfile, MemoryFact, Session, SSEEvent (union), VapiWebhookBody, SaveOrderArgs, ReviewArgs. env.ts uses Zod, exits on invalid env. index.ts boots Fastify with CORS, has /health, route registrations are commented out (Smart Coder will uncomment when routes exist). sse-hub.ts stub also created as it was referenced in the spec.
