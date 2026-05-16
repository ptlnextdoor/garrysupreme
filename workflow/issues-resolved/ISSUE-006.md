---
id: ISSUE-006
severity: critical
related_task: TASK-S02
files: ["apps/backend/tsconfig.json", "apps/backend/src/routes/context.ts", "apps/backend/src/routes/save-order.ts", "apps/backend/src/routes/review.ts", "packages/scorer/src/score-item.ts"]
---

## Problem
Backend route files reach across the monorepo with relative paths that escape `rootDir`. `apps/backend/tsconfig.json` sets `"rootDir": "src"`, but `context.ts`, `save-order.ts`, and `review.ts` all import via `../../../../packages/.../src/index.js`. TypeScript will reject these with TS6059 ("File is not under 'rootDir' 'src'"). The scorer package has the same pattern importing types from backend. `pnpm build` fails for both backend and scorer.

This is a structural blocker — fix ISSUE-002 (workspace `@pulse/*` deps + `@pulse/types` package), then update these imports to use the package names, not relative paths.

## Evidence

`apps/backend/tsconfig.json:4-6`:
```json
"noEmit": false,
"outDir": "dist",
"rootDir": "src"
```

Offending imports:
- `apps/backend/src/routes/context.ts:3-5`:
```ts
import { GBrainClient, CompanyBrain, CustomerBrain } from '../../../../packages/gbrain/src/index.js'
import { parseSession, rankMenu } from '../../../../packages/scorer/src/index.js'
```
- `apps/backend/src/routes/save-order.ts:3`:
```ts
import { GBrainClient, CustomerBrain, normalizePhone } from '../../../../packages/gbrain/src/index.js'
...
const { triggerIngest } = await import('../../../../packages/gstack/src/index.js')   // line 131, runtime path probably wrong too
```
- `apps/backend/src/routes/review.ts:3`:
```ts
import { GBrainClient, CustomerBrain } from '../../../../packages/gbrain/src/index.js'
```
- `packages/scorer/src/score-item.ts:1`:
```ts
import type { MenuItem, CustomerProfile, Session } from '../../../apps/backend/src/types.js'
```

Even ignoring rootDir, these relative paths point at `packages/gbrain/src/index.js` — which won't exist until the package is built (compiled to `packages/gbrain/dist/index.js`). At dev time `tsx` may resolve `.js` → `.ts`, but the production `tsc` build emits `require('../../../../packages/gbrain/src/index.js')` into `apps/backend/dist/...` and that path is wrong from the dist tree.

## Fix
After ISSUE-002 lands (workspace deps + `@pulse/types`):

1. In `apps/backend/src/routes/context.ts`:
```ts
import { GBrainClient, CompanyBrain, CustomerBrain } from '@pulse/gbrain'
import { parseSession, rankMenu } from '@pulse/scorer'
import type { CustomerProfile, MenuItem } from '@pulse/types'
```
2. In `apps/backend/src/routes/save-order.ts`:
```ts
import { GBrainClient, CustomerBrain, normalizePhone } from '@pulse/gbrain'
import type { MemoryFact } from '@pulse/types'
...
const { triggerIngest } = await import('@pulse/gstack')
```
3. In `apps/backend/src/routes/review.ts`:
```ts
import { GBrainClient, CustomerBrain } from '@pulse/gbrain'
```
4. In `packages/scorer/src/score-item.ts`:
```ts
import type { MenuItem, CustomerProfile, Session } from '@pulse/types'
```
5. Add `@pulse/scorer` and `@pulse/gstack` as workspace deps in `apps/backend/package.json` (extend ISSUE-003 fix). Add `@pulse/types` as a workspace dep in `packages/scorer/package.json`.

Once those are wired, `rootDir` is no longer violated and runtime resolution flows through pnpm symlinks → each package's `main: dist/index.js`. Smart Coder must `pnpm -r build` before `pnpm dev` so the `dist/` outputs exist for backend to import at runtime.
