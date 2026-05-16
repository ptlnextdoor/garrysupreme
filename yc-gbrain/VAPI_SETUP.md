# Vapi Setup

Use this checklist before demo. The phone call is the product; do not rely only on dashboard buttons.

## 1. Start Pulse locally

```bash
npm install
npm run dev
```

Backend health check:

```bash
curl http://localhost:3001/health
```

## 2. Expose the backend

```bash
ngrok http 3001
```

Use the `https://...ngrok-free.app` URL for all Vapi server URLs. If `PULSE_DEMO_TOKEN` is set, append `?token=YOUR_TOKEN` to every Vapi server URL and open the dashboard once as `http://localhost:3000?token=YOUR_TOKEN`.

## 3. Create the Vapi assistant

1. Create a new assistant in Vapi.
2. Paste `yc-gbrain/vapi-system-prompt.txt` as the system prompt.
3. Add the `get_context` function tool from `yc-gbrain/vapi-tools.json`.
4. Add the `save_order` function tool from `yc-gbrain/vapi-tools.json`.
5. Replace `https://YOUR_PUBLIC_URL` with the ngrok URL.
6. Assign a Vapi phone number to the assistant.

## 4. Test the exact demo path

1. Open `http://localhost:3000`.
2. Click `Reset`, then `Start call`.
3. Call the Vapi phone number on speaker.
4. Say: "I want something cold, sweet, not too heavy, no dairy."
5. Confirm the agent calls `/api/context` in server logs.
6. Accept the iced chai recommendation.
7. Add: "My mom wants hot chai, sweet."
8. Confirm the agent calls `/api/save_order`.
9. Verify the dashboard shows confirmed order, pending memory, and customer brain update after approval.

## 5. Known fallback

If the live phone call fails, keep the dashboard open and run the visual story with:

1. `Reset`
2. `Start call`
3. `Simulate context`
4. `Confirm demo order`
5. `Approve` one memory candidate

This fallback still proves the backend context merge, dashboard update, and memory approval loop.
