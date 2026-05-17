<p align="center">
  <img src=".github/assets/heyg-banner.png" alt="hey, G! Never miss a call again. AI voice concierge with memory." width="100%">
</p>

# Pulse HOG Demo

Pulse is a voice concierge demo for HOG-backed company brains. The live demo is Costco-first, with Starbucks as a second proof point.

## Current Demo Path

- Backend: `yc-gbrain/server`, deployed on Railway from `main`.
- Dashboard: `web`, deployed on Vercel.
- Durable state: Convex, using `convex/`.
- Runtime HOG data: `yc-gbrain/server/data/`.
- Explicit HOG data mirror: `hog-data/`.
- Optional real local GBrain: `yc-gbrain/server/src/gbrain-local.ts`.

Railway currently builds and starts the `yc-gbrain/server` app via `railway.json`. Aarya's `apps/` and `packages/gbrain` work remains in the repo, but it is not the active Railway service.

## HOG Data

The HOG data lives in two places:

- `hog-data/` is the obvious source/provenance folder for review.
- `yc-gbrain/server/data/` is the runtime copy loaded by the Railway backend.

Catalog counts:

- Costco: 5,329 product rows.
- Starbucks: 935 product rows.

Costco and Starbucks are kept as separate company brains throughout the app.

## Local Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm run build
npm --workspace @pulse/server run typecheck
npm --workspace @pulse/server run build
```

## Backend API

- `GET /health`
- `GET /api/dashboard`
- `GET /api/companies`
- `POST /api/context`
- `POST /api/search`
- `POST /api/save_order`
- `POST /api/demo/reset`
- `POST /api/vapi/webhook`

Vapi should point at:

```txt
https://<railway-domain>/api/vapi/webhook
```

## Convex

Convex stores durable demo state and mirrored HOG catalog/policy data.

Required runtime env for Railway Convex writes:

```txt
CONVEX_URL=https://<deployment>.convex.cloud
CONVEX_DEPLOYMENT=dev:<deployment-name>
CONVEX_WRITE_ENABLED=true
```

Deploy Convex functions:

```bash
npm run convex:deploy -- --env-file /path/to/.env.local
```

Seed HOG data and reset demo state into Convex:

```bash
npm run convex:seed:hog
```

The seed script loads `.env.local` if present and accepts `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL`.

## Railway Env

Minimum:

```txt
NODE_ENV=production
FRONTEND_URL=https://web-five-ruby-11.vercel.app
DASHBOARD_ORIGIN=https://web-five-ruby-11.vercel.app
DEMO_PHONE=+13203648288
```

Vapi:

```txt
VAPI_API_KEY=
VAPI_SECRET=
VAPI_ASSISTANT_ID=
VAPI_PHONE_NUMBER_ID=
```

Optional sponsor/local GBrain:

```txt
GBRAIN_API_KEY=
GBRAIN_BASE_URL=
GBRAIN_PROJECT_ID=
GSTACK_API_KEY=
GSTACK_BASE_URL=
GSTACK_PROJECT_ID=
GBRAIN_LOCAL_ENABLED=false
```

## Demo Calls

Costco smoke prompt:

```txt
Can you reorder my usual breakroom stuff from Costco? My number is 6697320048.
```

Costco event prompt:

```txt
I need snacks and drinks for 35 people under $250, no peanuts, preferably Kirkland.
```

Starbucks smoke prompt:

```txt
I do not know Starbucks words. I want something warm, cozy, oat milk, and not too sweet.
```
