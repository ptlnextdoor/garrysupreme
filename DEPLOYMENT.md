# Deployment Notes

## Frontend

Sean's frontend deploys from `main` to Vercel project `web`.

Public URL:
- https://web-five-ruby-11.vercel.app

## Backend: Railway

The Fastify backend lives at `yc-gbrain/server` and is configured by `railway.json`.
For the current demo, Railway can deploy directly from branch `aayu22809/starbucks-gbrain-demo` before merging to `main`.

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
- `VAPI_API_KEY=<from Vapi>`
- `VAPI_SECRET=<from Vapi>`
- `VAPI_ASSISTANT_ID=<from Vapi>`
- `VAPI_PHONE_NUMBER_ID=<from Vapi>`
- `PULSE_DEMO_TOKEN=<shared secret>` optional

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

## Convex follow-up

Convex is optional but supported. Current backend uses Convex when `CONVEX_URL` is set and falls back to file-backed demo state otherwise. To configure Convex:

1. `npx convex dev` to create/select a Convex deployment.
2. Deploy the schema/functions in `convex/`.
3. Store `CONVEX_URL` and `CONVEX_DEPLOYMENT` in Railway env.
4. Keep Fastify on Railway; Convex is persistence, not the HTTP host.

The Convex functions persist a full `stateSnapshots` document plus normalized `customers`, `orders`, `memoryCandidates`, `activeCalls`, and `workflowEvents` rows for dashboard/debug visibility.
