# Deployment Notes

## Frontend

Sean's frontend deploys from `main` to Vercel project `web`.

Public URL:
- https://web-five-ruby-11.vercel.app

## Backend: Railway

The Fastify backend lives at `yc-gbrain/server` and is configured by `railway.json`.

Required GitHub secrets for auto-deploy:

- `RAILWAY_TOKEN` required
- `RAILWAY_PROJECT_ID` optional but recommended
- `RAILWAY_SERVICE_ID` optional but recommended
- `RAILWAY_ENVIRONMENT_ID` optional but recommended

Once deployed, set these Railway env vars if desired:

- `DASHBOARD_ORIGIN=https://web-five-ruby-11.vercel.app`
- `PULSE_DEMO_TOKEN=<shared secret>` optional
- `NODE_ENV=production`

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

Convex is not configured yet. Current backend uses file-backed demo state in `yc-gbrain/server/src/store.ts`. To move to Convex:

1. `npx convex dev` to create/select a Convex deployment.
2. Add tables for customers, orders, memory candidates, active calls, company catalog.
3. Port Fastify route logic into Convex `httpAction`s or keep Fastify and use Convex as persistence.
4. Store `CONVEX_URL` / deploy key in Railway env.
