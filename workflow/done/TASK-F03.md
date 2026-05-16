---
id: TASK-F03
priority: P0
status: done
assigned_at: 2026-05-16T13:22:00
completed_at: 2026-05-16T13:35:00
files_changed:
  - packages/types/src/index.ts
  - packages/gbrain/src/customer.ts
  - apps/backend/src/routes/save-order.ts
---

## Notes from Worker
Added id: string to MemoryFact in @pulse/types. Updated customer.ts: addMemoryFact computes id as `${callId}-${ts}`, uses it as storage path key, passes it through serializeMemoryFact (now writes id to frontmatter), and parseMemoryFact reads id from frontmatter with fallback derivation. Updated save-order.ts to set id: `${callId}-${ts}` when constructing each MemoryFact before broadcasting. Could not run pnpm -r typecheck — node_modules not installed yet. Changes are structurally consistent.
