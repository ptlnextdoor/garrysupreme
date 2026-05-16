---
id: TASK-F05
priority: P0
status: done
assigned_at: 2026-05-16T13:25:00
completed_at: 2026-05-16T13:44:00
files_changed: []
---

## Notes from Worker
No changes needed. This fix was already applied during TASK-F03. apps/backend/src/routes/save-order.ts line 117 already has `id: \`${callId}-${ts}\`` in the MemoryFact construction. Verified with grep.
