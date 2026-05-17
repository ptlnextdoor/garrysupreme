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

Set `DEMO_PHONE_MATCH` to the last 4-7 digits of the phone number you will call from so the planted live demo loads the selected company’s returning-customer brain.

## 3. Create the Vapi assistant

1. Create a new assistant in Vapi.
2. Paste `yc-gbrain/vapi-system-prompt.txt` as the system prompt.
3. Add the `get_context` function tool from `yc-gbrain/vapi-tools.json`.
4. Add the `save_order` function tool from `yc-gbrain/vapi-tools.json`.
5. Replace `https://YOUR_PUBLIC_URL` with the ngrok URL.
6. Assign a Vapi phone number to the assistant.

Primary demo rule: the assistant is the Costco concierge by default. It supports both personal household runs and office/bulk runs, and should pass `company_id: "costco"` unless the caller explicitly asks for the Starbucks demo.

Voice rule: tool calls are silent. The assistant should never say it is pulling up, grabbing, loading, checking, or looking up anything.

## 3A. Update existing multilingual assistant

Existing assistant ID:

```text
e629180c-f769-445d-923f-639c3c8ee37a
```

Recommended Vapi settings for English + Hindi/Hinglish:

- Transcriber: Deepgram, Nova 3, language/mode `multi`
- Voice: Azure `multilingual-auto` if available in the account, otherwise a multilingual-capable voice with Hindi support
- First message: bilingual English/Hindi greeting
- System prompt: `yc-gbrain/vapi-system-prompt.txt`
- Tools: `yc-gbrain/vapi-tools.json`, with `https://YOUR_PUBLIC_URL` replaced by your ngrok URL

If you have a Vapi API key locally, update the assistant directly:

```bash
export VAPI_API_KEY="..."
export VAPI_ASSISTANT_ID="e629180c-f769-445d-923f-639c3c8ee37a"
export PUBLIC_URL="https://YOUR_NGROK_URL.ngrok-free.app"
npm run vapi:update:multilingual
```

The assistant prompt now explicitly supports English, Hindi, and Hinglish. The tools also accept `language: "en" | "hi"` so the backend can return a language instruction with the catalog context.

## 4. Test the exact Costco demo path

1. Open `http://localhost:3000`.
2. Select `Costco`.
3. Click `Reset`, then `Start call`.
4. Call the Vapi phone number on speaker.
5. Say: “I’m doing a quick Costco run that may turn into the big monthly haul. Add my usual almond milk, salmon, and kids snacks.”
6. Confirm the agent calls `/api/context` with `company_id: "costco"` in server logs.
7. The agent should load Aarya’s household Customer Brain and use Mom/partner/kids memory naturally.
8. Confirm a safe order summary.
9. Confirm the agent calls `/api/save_order` with `company_id: "costco"`.
10. Verify the dashboard shows the workflow trace, catalog matches, confirmed order, pending memory, and customer brain update after approval.
11. For the office-event variant, say: “I need snacks and drinks for 35 people for the office next week, keep it under about $250.”

## 5. Secondary Starbucks demo

1. Switch dashboard to `Starbucks`.
2. Say: “I want something cold, not too sweet, with caffeine, but no dairy.”
3. Confirm the agent passes `company_id: "starbucks"`.
4. The agent should translate the plain-English request into Starbucks catalog matches and avoid strict allergen claims.

Hindi/Hinglish smoke tests:

- Costco: “Office ke 35 logon ke liye snacks aur drinks chahiye next week, budget lagbhag $250 hai.”
- Starbucks: “Mujhe kuch cold chahiye, zyada sweet nahi, caffeine ho, dairy nahi.”
- Switch language mid-call: “Ab Hindi mein baat karo.” / “Switch back to English.”

## 6. Known fallback

If the live phone call fails, keep the dashboard open and run the visual story with:

1. `Reset`
2. `Start call`
3. Click the first Costco `Vapi context` query
4. `Confirm demo order`
5. `Approve` one memory candidate

This fallback still proves the separate Company Brain, Customer Brain, Catalog Matcher, review gate, dashboard events, and memory write loop.
