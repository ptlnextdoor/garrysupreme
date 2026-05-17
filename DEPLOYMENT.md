# Deployment Notes

## Frontend

Sean's frontend deploys from `main` to Vercel project `web`.

Public URL:
- https://web-five-ruby-11.vercel.app

## Backend: Railway

The Fastify backend lives at `yc-gbrain/server` and is configured by `railway.json`.
Railway should deploy from `main`; `yc-gbrain/server` is the active demo backend.

Required GitHub secrets for auto-deploy:

- `RAILWAY_TOKEN` required
- `RAILWAY_PROJECT_ID` optional but recommended
- `RAILWAY_SERVICE_ID` optional but recommended
- `RAILWAY_ENVIRONMENT_ID` optional but recommended

Once deployed, set these Railway env vars if desired:

- `NODE_ENV=production`
- `FRONTEND_URL=https://web-five-ruby-11.vercel.app`
- `DASHBOARD_ORIGIN=https://web-five-ruby-11.vercel.app`
- `DEMO_PHONE=+13203648288`
- `CONVEX_URL=<from Convex dashboard>`
- `CONVEX_DEPLOYMENT=<from Convex dashboard>`
- `CONVEX_WRITE_ENABLED=true`
- `VAPI_API_KEY=<from Vapi>`
- `VAPI_SECRET=<from Vapi>`
- `VAPI_ASSISTANT_ID=<from Vapi>`
- `VAPI_PHONE_NUMBER_ID=<from Vapi>`
- `PULSE_DEMO_TOKEN=<shared secret>` optional, but leave it unset for the live demo unless Vapi is configured to send `x-pulse-demo-token` or `?token=...`

Optional sponsor sync env vars. Leave unset until real values exist; the backend logs once and continues:

- `GBRAIN_API_KEY`
- `GBRAIN_BASE_URL`
- `GBRAIN_PROJECT_ID`
- `GSTACK_API_KEY`
- `GSTACK_BASE_URL`
- `GSTACK_PROJECT_ID`

Health URL:

- `https://<railway-domain>/health`

Vapi webhook URL:

- `https://<railway-domain>/api/vapi/webhook`

Vapi tool endpoints if using direct tool URLs:

- `https://<railway-domain>/api/context`
- `https://<railway-domain>/api/save_order`

## Vapi

To update Vapi automatically we need `VAPI_API_KEY` and assistant/phone IDs. Without that, update the assistant dashboard manually to use the backend URL above.

Use these production URLs:

- Webhook/server URL: `https://<railway-domain>/api/vapi/webhook`
- Tool URL `get_context`: `https://<railway-domain>/api/context`
- Tool URL `save_order`: `https://<railway-domain>/api/save_order`

Keep the demo phone number attached to the same assistant:

- `+13203648288`

The `6697320048` returning-caller path depends on Vapi sending the real caller number through the webhook or tool payload. If the assistant says it is having technical or communication issues instead of loading past orders, first verify the deployment branch and Vapi URL wiring before changing code.

## Convex

Convex is now the durable demo state path when `CONVEX_URL` and `CONVEX_WRITE_ENABLED=true` are set. The backend still falls back to file-backed state for local development.

Deploy schema/functions:

```bash
npm run convex:deploy -- --env-file /path/to/.env.local
```

Seed HOG catalog data plus the default Costco-first demo state:

```bash
npm run convex:seed:hog
```

Store these in Railway env:

- `CONVEX_URL`
- `CONVEX_DEPLOYMENT`
- `CONVEX_WRITE_ENABLED=true`

Keep Fastify on Railway; Convex is persistence, not the HTTP host.

The Convex functions persist a full `stateSnapshots` document plus normalized `customers`, `orders`, `memoryCandidates`, `activeCalls`, `workflowEvents`, `companyCatalog`, and `companyPolicies` rows for dashboard/debug visibility.

## Real Local GBrain

Local real-GBrain testing is available from `main`.

- Convex writes are disabled unless `CONVEX_WRITE_ENABLED=true` is explicitly set.
- Local GBrain calls are disabled unless `GBRAIN_LOCAL_ENABLED=true` is explicitly set.
- Seed Costco into an isolated local GBrain with:

```bash
GBRAIN_LOCAL_ENABLED=true \
GBRAIN_HOME="$PWD/.context/real-gbrain-home" \
npm --workspace @pulse/server run gbrain:seed -- costco
```

- Query the seeded local GBrain via `POST /api/gbrain/local/query` or directly with:

```bash
GBRAIN_HOME="$PWD/.context/real-gbrain-home" gbrain search coffee
```

## If the assistant says "technical issues"

Check these in order:

1. Railway is running branch `aayu22809/starbucks-gbrain-demo` on commit `5ff1c13`, `90348b5`, or newer.
2. Vapi points at `https://<railway-domain>/api/vapi/webhook`, or the direct tool URLs above.
3. Railway logs show requests to `POST /api/vapi/webhook`, `POST /api/context`, or `POST /api/save_order`.
4. `PULSE_DEMO_TOKEN` is unset, or Vapi is sending `x-pulse-demo-token` or `?token=...`.
5. `https://<railway-domain>/health` returns `{"ok":true,"service":"pulse-api"}`.
