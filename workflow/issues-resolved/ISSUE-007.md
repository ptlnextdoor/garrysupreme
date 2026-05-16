---
id: ISSUE-007
severity: warning
related_task: TASK-D02
files: ["apps/backend/src/env.ts"]
---

## Problem
`env.ts` requires `GBRAIN_API_KEY`, `GBRAIN_BASE_URL`, `GBRAIN_PROJECT_ID`, `GSTACK_API_KEY`, `GSTACK_BASE_URL`, `GSTACK_PROJECT_ID` all as `z.string().min(1)` / `z.string().url()`. Without these, `env.ts` calls `process.exit(1)` at boot. But `GBrainClient` is designed to fall back to file-backed mode when the API key is absent — that is the demo's primary path until the real GBrain REST endpoints are wired up. The required-env check is fighting the file-backed fallback. Worker flagged this in TASK-S02 notes.

## Evidence

`apps/backend/src/env.ts:10-16`:
```ts
GBRAIN_API_KEY: z.string().min(1),
GBRAIN_BASE_URL: z.string().url(),
GBRAIN_PROJECT_ID: z.string().min(1),

GSTACK_API_KEY: z.string().min(1),
GSTACK_BASE_URL: z.string().url(),
GSTACK_PROJECT_ID: z.string().min(1),
```

`packages/gbrain/src/client.ts:36-43`:
```ts
if (apiKey && baseUrl) {
  this.mode = 'api'
  ...
} else {
  this.mode = 'file'
}
```
→ file mode is only reached when the api key is *missing*. Cannot reach file mode while env validation forces it present.

## Fix
Make the GBrain/GStack env vars optional:
```ts
GBRAIN_API_KEY: z.string().optional(),
GBRAIN_BASE_URL: z.string().url().optional(),
GBRAIN_PROJECT_ID: z.string().optional(),

GSTACK_API_KEY: z.string().optional(),
GSTACK_BASE_URL: z.string().url().optional(),
GSTACK_PROJECT_ID: z.string().optional(),

GBRAIN_DATA_ROOT: z.string().optional(),
```
The clients already handle missing creds correctly. Keep `VAPI_API_KEY` / `VAPI_SECRET` required since voice is the demo's user-facing path.
