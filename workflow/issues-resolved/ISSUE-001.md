---
id: ISSUE-001
severity: critical
related_task: TASK-D02
files: ["apps/backend/package.json", "apps/backend/src/index.ts"]
---

## Problem
Backend uses top-level `await` and `.js`-suffixed ESM imports, but `apps/backend/package.json` has no `"type": "module"`. With `module: "Node16"` (from `tsconfig.base.json`), TypeScript treats `.ts` files as CommonJS when the package isn't marked ESM — and CommonJS forbids top-level `await`. `tsc` will fail with TS1378, and `node dist/index.js` would also reject the construct. Dev via `tsx` may mask this, but `pnpm build` and the production start path are broken.

## Evidence

`apps/backend/src/index.ts:7,24`:
```ts
await app.register(cors, { ... })
...
await app.listen({ port: env.PORT, host: '0.0.0.0' })
```

`apps/backend/package.json` (no `"type"` field):
```json
{
  "name": "@pulse/backend",
  ...
}
```

`tsconfig.base.json:5`: `"module": "Node16"`

## Fix
Add `"type": "module"` to `apps/backend/package.json`:
```json
{
  "name": "@pulse/backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  ...
}
```

This also legitimizes the existing `.js` import suffixes (`./env.js`, `../types.js`, etc.) which are correct for Node16-ESM.
