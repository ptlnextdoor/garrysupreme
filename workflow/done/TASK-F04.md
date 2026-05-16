---
id: TASK-F04
priority: P0
status: done
assigned_at: 2026-05-16T13:22:00
completed_at: 2026-05-16T13:40:00
files_changed:
  - apps/backend/src/index.ts
---

## Notes from Worker
ISSUE-005: Fixed by setting process.env.GBRAIN_DATA_ROOT = path.join(REPO_ROOT, 'data') in index.ts before any routes load. GBrainClient already reads GBRAIN_DATA_ROOT env var (client.ts:34) so all route instances pick it up automatically — no route file changes needed.
ISSUE-006: All route files (context.ts, save-order.ts, review.ts) already use @pulse/gbrain, @pulse/types, @pulse/scorer — no bad imports. packages/scorer/src/score-item.ts already uses @pulse/types.
ISSUE-007: env.ts already fixed by F01 — all GBrain/GStack/Vapi vars are optional().default('').
ESM fix: moved all route imports to top of index.ts (before any await) to comply with ESM static import requirement.
