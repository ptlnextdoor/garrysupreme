---
id: ISSUE-005
severity: critical
related_task: TASK-S01
files: ["packages/gbrain/src/client.ts", "apps/backend/src/routes/context.ts", "apps/backend/src/routes/save-order.ts", "apps/backend/src/routes/review.ts"]
---

## Problem
`GBrainClient` defaults `dataRoot` to `path.resolve(process.cwd(), 'data')`. The backend `dev` script (`tsx src/index.ts`) runs with cwd = `apps/backend/` (pnpm runs workspace scripts from their package directory). So the client looks for seed data under `apps/backend/data/`, which doesn't exist — every file-backed read returns `null`/`[]`, the menu is empty, customer profiles are missing, and the demo falls through to `ANONYMOUS_PROFILE` with no menu.

This silently breaks the entire happy-path demo unless GBRAIN_API_KEY is configured (and even then, the FIXME-stubbed REST endpoints aren't real yet).

## Evidence

`packages/gbrain/src/client.ts:34`:
```ts
this.dataRoot = cfg.dataRoot ?? process.env.GBRAIN_DATA_ROOT ?? path.resolve(process.cwd(), 'data')
```

`apps/backend/package.json`:
```json
"scripts": { "dev": "tsx src/index.ts" }
```
→ cwd = `apps/backend/`, so default `dataRoot` = `apps/backend/data` (does not exist).

Routes construct the client with no config:
- `apps/backend/src/routes/context.ts:70`: `new GBrainClient()`
- `apps/backend/src/routes/save-order.ts:82`: `new GBrainClient()`
- `apps/backend/src/routes/review.ts:17`: `new GBrainClient()`

Seed data lives at `<repo-root>/data/companies/sunrise-coffee/{menu,policies,allergens}.md` and `<repo-root>/data/customers/demo-customer.md`.

## Fix
Resolve `dataRoot` from a stable anchor instead of cwd. Two acceptable fixes — pick one:

**Option A (preferred)**: Have the backend pass an explicit `dataRoot` derived from `import.meta.url`:
```ts
// in each route file, near the GBrainClient construction
import { fileURLToPath } from 'node:url'
import * as path from 'node:path'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../')
const DATA_ROOT = path.join(REPO_ROOT, 'data')
const client = new GBrainClient({ dataRoot: DATA_ROOT })
```
(This requires ISSUE-001's `"type": "module"` fix so `import.meta.url` is available.)

**Option B**: Set `GBRAIN_DATA_ROOT` in `.env` to an absolute path and document it. Less robust because the demo runner has to remember it.

Also recommend constructing `GBrainClient` once in `apps/backend/src/index.ts` and sharing it across routes (Fastify `decorate`), so the dataRoot resolution lives in one place instead of three.
