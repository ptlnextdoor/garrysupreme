---
id: TASK-F02
priority: P0
status: done
assigned_at: 2026-05-16T13:18:00
completed_at: 2026-05-16T13:30:00
files_changed:
  - packages/types/package.json
  - packages/types/tsconfig.json
  - packages/types/src/index.ts
  - apps/backend/src/types.ts
  - apps/backend/package.json
  - packages/gbrain/package.json
  - packages/scorer/package.json
  - packages/gbrain/src/company.ts
  - packages/gbrain/src/customer.ts
---

## Notes from Worker
Created @pulse/types package with all type definitions from apps/backend/src/types.ts. apps/backend/src/types.ts is now a single re-export line. Added workspace:* deps to backend (gbrain, gstack, scorer, types), gbrain (@pulse/types), scorer (@pulse/types). Fixed both bad relative imports in gbrain/src/company.ts and gbrain/src/customer.ts → now import from @pulse/types. pnpm-workspace.yaml already covered packages/* from D01.
