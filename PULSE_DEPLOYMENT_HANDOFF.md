# Pulse Deployment Handoff: Vercel Frontend, Railway Backend, Vapi, Convex

Repo:

```txt
https://github.com/aayu22809/garrysupreme
```

Main branch is the deployment branch.

---

## Current status

### Frontend

Sean's frontend is deployed on Vercel and working.

Public URLs:

```txt
https://web-five-ruby-11.vercel.app
https://web-aayushya-patels-projects.vercel.app
https://web-git-main-aayushya-patels-projects.vercel.app
```

Dashboard:

```txt
https://web-five-ruby-11.vercel.app/dashboard
```

Verified HTTP 200 for:

```txt
https://web-five-ruby-11.vercel.app
https://web-five-ruby-11.vercel.app/dashboard
https://web-aayushya-patels-projects.vercel.app
https://web-git-main-aayushya-patels-projects.vercel.app
```

Vercel project:

```txt
Project name: web
Owner/team: aayushya-patels-projects
```

Important: older failed Vercel deploys exist in history because config had to be fixed. Ignore old failed deploys. The active production deployment is ready.

Vercel SSO deployment protection was disabled because default aliases were returning 401.

---

## Files already added/changed on main

Deployment-related commits were pushed to `main`.

Important files now in repo:

```txt
vercel.json
railway.json
DEPLOYMENT.md
.github/workflows/deploy-railway-backend.yml
yc-gbrain/server/Procfile
```

Frontend auto-deploy is wired through Vercel Git integration. Pushes to `main` trigger Vercel.

Backend auto-deploy workflow exists but currently fails because Railway secrets are missing.

---

# Backend

## Existing backend location

The current backend is **not Convex yet**. It is a Fastify server here:

```txt
yc-gbrain/server
```

Important files:

```txt
yc-gbrain/server/src/index.ts
yc-gbrain/server/src/store.ts
yc-gbrain/server/src/vapi.ts
yc-gbrain/server/src/seed.ts
```

Backend package:

```txt
yc-gbrain/server/package.json
```

Backend scripts:

```json
{
  "build": "tsc -p tsconfig.json",
  "start": "node dist/index.js",
  "typecheck": "tsc -p tsconfig.json --noEmit"
}
```

Root build works locally:

```bash
npm install
npm run typecheck
npm run build
```

This was validated from a clean `origin/main` checkout.

---

## Backend endpoints

Once deployed, expected backend endpoints are:

```txt
GET  /health
GET  /api/dashboard
GET  /api/calls/active
GET  /api/customers/:id
POST /api/context
POST /api/save_order
POST /api/learn
POST /api/memory/approve
POST /api/memory/reject
POST /api/demo/start_call
POST /api/demo/end_call
POST /api/demo/reset
POST /api/vapi/webhook
WS   /ws
```

Vapi webhook endpoint should be:

```txt
https://<railway-domain>/api/vapi/webhook
```

If Vapi is using direct tool URLs, use:

```txt
https://<railway-domain>/api/context
https://<railway-domain>/api/save_order
```

---

# Railway deployment

## What is already configured

Root `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm --workspace @pulse/server run build"
  },
  "deploy": {
    "startCommand": "npm --workspace @pulse/server run start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 120,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

GitHub Actions workflow exists:

```txt
.github/workflows/deploy-railway-backend.yml
```

Workflow name:

```txt
Deploy Backend to Railway
```

Workflow URL:

```txt
https://github.com/aayu22809/garrysupreme/actions/workflows/deploy-railway-backend.yml
```

The workflow currently fails because `RAILWAY_TOKEN` is missing.

Observed failed run message:

```txt
Missing RAILWAY_TOKEN secret
```

---

## What the agent needs to do for Railway

### Option A: Use GitHub Actions auto-deploy

This is preferred because then every push to `main` redeploys backend.

1. In Railway, create or select a project for Pulse backend.
2. Create a Railway API token.
3. Add repo secrets in GitHub.

Required:

```txt
RAILWAY_TOKEN
```

Recommended:

```txt
RAILWAY_PROJECT_ID
RAILWAY_SERVICE_ID
RAILWAY_ENVIRONMENT_ID
```

GitHub secrets page:

```txt
https://github.com/aayu22809/garrysupreme/settings/secrets/actions
```

Then rerun:

```txt
Deploy Backend to Railway
```

from:

```txt
https://github.com/aayu22809/garrysupreme/actions/workflows/deploy-railway-backend.yml
```

### Option B: Use local Railway CLI

If the agent has Railway auth/token locally:

```bash
cd /path/to/garrysupreme
railway link
railway up --detach --ci
```

or with explicit IDs:

```bash
railway up --detach --ci \
  --project <RAILWAY_PROJECT_ID> \
  --service <RAILWAY_SERVICE_ID> \
  --environment <RAILWAY_ENVIRONMENT_ID>
```

Then get domain:

```bash
railway domain
```

or inspect service in Railway dashboard.

---

## Railway environment variables

Set these in Railway service env:

```txt
NODE_ENV=production
DASHBOARD_ORIGIN=https://web-five-ruby-11.vercel.app
```

Optional security token:

```txt
PULSE_DEMO_TOKEN=<shared secret>
```

Important: If `PULSE_DEMO_TOKEN` is set, Vapi/tool requests must include:

```txt
x-pulse-demo-token: <shared secret>
```

or query:

```txt
?token=<shared secret>
```

If you want fastest demo, leave `PULSE_DEMO_TOKEN` unset initially.

---

## Validate Railway backend

After deploy, validate:

```bash
curl https://<railway-domain>/health
```

Expected response:

```json
{
  "ok": true,
  "service": "pulse-api"
}
```

Then test context:

```bash
curl -X POST https://<railway-domain>/api/context \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+15555550172",
    "request": "I want something cold and not too sweet"
  }'
```

Then test save order:

```bash
curl -X POST https://<railway-domain>/api/save_order \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Maria Delgado",
    "phone_number": "+15555550172",
    "items": ["Iced Chai Latte, oat milk"],
    "new_preferences": ["Prefers oat milk"],
    "confidence": 0.9
  }'
```

---

# Vapi setup

## What needs to be updated

Once Railway backend is live, set Vapi webhook/server URL to:

```txt
https://<railway-domain>/api/vapi/webhook
```

If Vapi tools use separate endpoint URLs:

```txt
get_context -> https://<railway-domain>/api/context
save_order  -> https://<railway-domain>/api/save_order
```

Existing Vapi config files in repo:

```txt
yc-gbrain/vapi-system-prompt.txt
yc-gbrain/vapi-tools.json
```

There is also newer PR code with `vapi/system-prompt.md`, but main currently uses `yc-gbrain`.

## Required Vapi credentials if updating by API

To update Vapi automatically, agent needs:

```txt
VAPI_API_KEY
VAPI_ASSISTANT_ID
VAPI_PHONE_NUMBER_ID
```

Without those, update Vapi manually in the dashboard.

## Manual Vapi dashboard steps

1. Open Vapi dashboard.
2. Select the Pulse assistant connected to the phone number.
3. Set server/webhook URL:

```txt
https://<railway-domain>/api/vapi/webhook
```

4. Ensure tools match:

```txt
get_context
save_order
```

5. If using `PULSE_DEMO_TOKEN`, add header:

```txt
x-pulse-demo-token: <token>
```

6. Make test call to the Vapi phone number.

---

# Convex

## Current state

Convex is not configured.

Observed CLI output:

```txt
No CONVEX_DEPLOYMENT set, run `npx convex dev` to configure a Convex project
```

There is no:

```txt
convex/
convex.json
```

in main.

## Important architecture note

Convex is **not** a drop-in host for the current Fastify server.

Current backend uses:

```txt
yc-gbrain/server/src/store.ts
```

with file-backed state under a local `gbrain` directory.

Convex should be used either as a persistence layer behind Fastify or as a later rewrite using Convex `httpAction`s.

### Short-term recommended approach

Keep Fastify on Railway. Use Convex only as persistence.

Flow:

```txt
Vapi -> Railway Fastify API -> Convex tables
Frontend -> Railway API and/or Convex queries
```

### Longer-term approach

Port endpoints into Convex `httpAction`s.

Equivalent Convex HTTP routes needed:

```txt
POST /api/context
POST /api/save_order
POST /api/vapi/webhook
GET  /api/dashboard
POST /api/memory/approve
POST /api/memory/reject
```

## Convex schema to create

Suggested tables:

```ts
customers
orders
memoryCandidates
activeCalls
companyCatalog
companyPolicies
```

Suggested fields:

### customers

```ts
{
  phone: string,
  name: string,
  likes: string[],
  avoids: string[],
  style: string,
  language: string,
  household: Array<{ name: string, notes: string[] }>,
  confidence: number,
  updatedAt: number
}
```

### orders

```ts
{
  customerPhone: string,
  customerName: string,
  items: string[],
  newPreferences: string[],
  confidence: number,
  createdAt: number
}
```

### memoryCandidates

```ts
{
  customerPhone: string,
  customerName: string,
  claim: string,
  evidence: string,
  confidence: number,
  status: "pending" | "approved" | "rejected",
  createdAt: number
}
```

### activeCalls

```ts
{
  callId: string,
  customerName: string,
  phone: string,
  startedAt: number,
  status: string,
  intent: string,
  transcript: string[],
  currentOrder: string[]
}
```

### companyCatalog

```ts
{
  companyId: string,
  name: string,
  priceBand?: string,
  price?: number,
  description: string,
  tags: string[],
  allergens: string[],
  modifiers: string[],
  stock: string
}
```

---

# Recommended next sequence

Give the next agent this exact sequence:

## Step 1: Railway

1. Add `RAILWAY_TOKEN` GitHub secret.
2. Add project/service/environment IDs if available.
3. Rerun GitHub workflow.
4. Verify `/health`.

## Step 2: Vapi

1. Take Railway backend URL.
2. Set Vapi webhook:

```txt
https://<railway-domain>/api/vapi/webhook
```

3. Ensure `get_context` and `save_order` tools point to backend.
4. Make a test phone call.
5. Confirm order save updates backend state.

## Step 3: Frontend API wiring

Sean's frontend currently appears mostly static/mock.

Mocks live under:

```txt
web/lib/mock/
```

Wire dashboard to Railway:

```txt
NEXT_PUBLIC_API_URL=https://<railway-domain>
```

Possible frontend API endpoints:

```txt
GET /api/dashboard
GET /api/calls/active
GET /api/customers/:id
```

If websocket is desired:

```txt
wss://<railway-domain>/ws
```

## Step 4: Convex

After Railway + Vapi are working, introduce Convex for persistence. Do not block demo on Convex unless specifically required.

---

# Known gotchas

## Vercel

There are old failed deployments. Ignore them if latest production is Ready.

Check latest:

```bash
cd web
npx vercel ls web
```

Active frontend should be:

```txt
https://web-five-ruby-11.vercel.app
```

If aliases return 401, disable Vercel SSO protection:

```bash
npx vercel project protection disable web --sso
```

## Railway

Railway CLI cannot login non-interactively unless token is present.

Use:

```txt
RAILWAY_TOKEN
```

in environment or GitHub Actions secret.

## Backend token

If `PULSE_DEMO_TOKEN` is set, unauthenticated Vapi calls will fail with 401 unless Vapi sends the token.

For fastest demo, leave `PULSE_DEMO_TOKEN` unset until everything works.

## Main branch vs PRs

Do not merge PR #6 directly yet.

PR #6 has useful Costco demo content, but it:

- conflicts with main
- adds a separate `apps/dashboard`
- does not integrate Sean's `web/`
- includes seeded/unverified Costco claims/prices

If needed, cherry-pick Costco data/prompt ideas later, not the whole PR.
