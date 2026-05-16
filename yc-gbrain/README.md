# Pulse Demo

Pulse is a hackathon demo for a Vapi-powered phone concierge that reads a business brain, reads a customer brain, and writes learned memory after a confirmed order.

## Run locally

```bash
npm install
npm run dev
```

- Dashboard: `http://localhost:3000`
- API: `http://localhost:3001`
- Health check: `http://localhost:3001/health`

## Vapi endpoints

Expose the API with ngrok:

```bash
ngrok http 3001
```

Configure Vapi tools to call:

- `POST https://your-ngrok-url.ngrok-free.app/api/context`
- `POST https://your-ngrok-url.ngrok-free.app/api/save_order`
- `POST https://your-ngrok-url.ngrok-free.app/api/vapi/webhook`

The server accepts simple JSON bodies and common Vapi tool-call wrappers.

For exact assistant setup, use `VAPI_SETUP.md`.

## Demo path

1. Open the dashboard.
2. Click `Reset`, then `Start call`.
3. Call the Vapi number and ask: “I want something cold, sweet, not too heavy, no dairy.”
4. Pulse should recommend `Iced Chai Latte, oat milk, cardamom`.
5. Click `Confirm demo order` or let Vapi call `save_order`.
6. The active call changes to confirmed, the order is written under `gbrain/orders/`, and memory candidates appear for approval.
7. Approve one memory candidate to update the customer brain and markdown profile.

## File-backed GBrain

The demo writes human-readable memory under:

- `gbrain/companies/sunrise-coffee/menu.md`
- `gbrain/customers/aayushya.md`
- `gbrain/orders/*.md`

Runtime state is also persisted in `gbrain/state.json` for the dashboard.
