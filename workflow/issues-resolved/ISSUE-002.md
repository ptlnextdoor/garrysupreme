---
id: ISSUE-002
severity: critical
related_task: TASK-S01
files: ["packages/gbrain/src/company.ts", "packages/gbrain/src/customer.ts", "packages/gbrain/package.json", "apps/backend/package.json"]
---

## Problem
`packages/gbrain` imports its shared types via a relative path that reaches *out of* the package into `apps/backend/src/types.js`. This breaks package boundaries in three ways:
1. `composite: true` on `packages/gbrain/tsconfig.json` will not allow importing files outside `rootDir: src` — `tsc` errors with TS6059 "File is not under 'rootDir'".
2. At consumption time, backend imports `@pulse/gbrain` and pnpm resolves to `packages/gbrain/dist/index.js`. The emitted `dist/company.js` would `require("../../../apps/backend/src/types.js")` — that path does not exist at runtime (backend's compiled output lives at `apps/backend/dist/...`, not `apps/backend/src/...`).
3. Creates a package cycle: backend depends on gbrain, gbrain depends on backend's source.

Worker flagged this in `TASK-S01.md` notes.

## Evidence

`packages/gbrain/src/company.ts:2`:
```ts
import type { MenuItem } from '../../../apps/backend/src/types.js'
```

`packages/gbrain/src/customer.ts:2`:
```ts
import type { CustomerProfile, MemoryFact } from '../../../apps/backend/src/types.js'
```

`packages/gbrain/tsconfig.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "rootDir": "src",
    ...
  }
}
```

## Fix
Create a `@pulse/types` workspace package (Stupid Coder territory) that owns the shared types, then:

1. Move type definitions from `apps/backend/src/types.ts` into `packages/types/src/index.ts`.
2. Add `packages/types/package.json`:
```json
{
  "name": "@pulse/types",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "build": "tsc", "typecheck": "tsc --noEmit" },
  "devDependencies": { "typescript": "^5.4.5" }
}
```
3. Add it as a dependency in both `packages/gbrain/package.json` and `apps/backend/package.json`:
```json
"dependencies": { "@pulse/types": "workspace:*" }
```
4. Replace the relative imports in `packages/gbrain/src/{company,customer}.ts`:
```ts
import type { MenuItem } from '@pulse/types'
import type { CustomerProfile, MemoryFact } from '@pulse/types'
```
5. Update `apps/backend/src/types.ts` to re-export from `@pulse/types` (or delete and update its consumers).
