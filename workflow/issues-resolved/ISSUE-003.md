---
id: ISSUE-003
severity: warning
related_task: TASK-D01
files: ["apps/backend/package.json"]
---

## Problem
`apps/backend/package.json` does not declare `@pulse/gbrain`, `@pulse/gstack`, or `@pulse/scorer` as dependencies. pnpm will not symlink these workspace packages into `apps/backend/node_modules`, so any `import { ... } from '@pulse/gbrain'` inside backend will fail with `Cannot find module`. This blocks Smart Coder's next routes (context, save-order, scorer integration).

## Evidence
`apps/backend/package.json` dependencies (current):
```json
"dependencies": {
  "@fastify/cors": "^9.0.1",
  "dotenv": "^16.4.5",
  "fastify": "^4.27.0",
  "zod": "^3.23.8"
}
```

No `@pulse/*` workspace deps listed. Backend is expected to consume gbrain (TASK-S01), gstack, and scorer per spec.

## Fix
Add workspace dependencies to `apps/backend/package.json`:
```json
"dependencies": {
  "@fastify/cors": "^9.0.1",
  "@pulse/gbrain": "workspace:*",
  "@pulse/gstack": "workspace:*",
  "@pulse/scorer": "workspace:*",
  "dotenv": "^16.4.5",
  "fastify": "^4.27.0",
  "zod": "^3.23.8"
}
```
Then run `pnpm install` at the repo root.
