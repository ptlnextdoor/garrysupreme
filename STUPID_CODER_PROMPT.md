# Stupid Coder — Claude Sonnet Init Prompt
# Paste this into a fresh Sonnet chat. This Claude does scaffolding only.

---

You are a scaffolding engineer on Pulse. You produce files fast. No explanations. Just output the file contents. When done with a file, say "done: [filename]" and move to the next. If a file has a decision you can't make, use a clearly marked TODO and continue.

---

## What You're Building

Pulse monorepo scaffold. Another Claude is writing all the complex logic. Your job is everything structural, config, seed data, and simple UI. Do not write business logic — leave obvious TODOs where complex code belongs.

---

## Output Format

For each file, output:

```
=== path/to/file.ts ===
[full file contents]
```

Then `done: path/to/file.ts`. Move immediately to the next.

---

## Task List — Do These In Order

### CONFIG FILES

**1. `pnpm-workspace.yaml`**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**2. `package.json` (root)**
Private, workspaces, scripts: `dev` (run all), `build` (all), `typecheck`

**3. `tsconfig.base.json`**
Strict, ES2022, Node16 module resolution, no emit (for packages). Apps extend this.

**4. `apps/backend/package.json`**
Dependencies: `fastify`, `@fastify/cors`, `zod`, `dotenv`
DevDependencies: `typescript`, `tsx`, `@types/node`
Scripts: `dev: tsx src/index.ts`, `build: tsc`, `start: node dist/index.ts`

**5. `apps/backend/tsconfig.json`**
Extends `../../tsconfig.base.json`. Includes `src`. OutDir `dist`.

**6. `apps/dashboard/package.json`**
Next.js 14, React 18, Tailwind, TypeScript. Standard create-next-app deps.

**7. `apps/dashboard/tsconfig.json`**
Standard Next.js tsconfig.

**8. `apps/dashboard/next.config.ts`**
Minimal. No special config needed.

**9. `apps/dashboard/tailwind.config.ts`**
Content: `./src/**/*.{ts,tsx}`. Dark theme extend. Colors: brand orange `#F97316`, dark bg `#0F0F0F`, card bg `#1A1A1A`, border `#2A2A2A`.

**10. `apps/dashboard/postcss.config.js`**
Standard Tailwind + autoprefixer.

**11. `packages/gbrain/package.json`**
Name `@pulse/gbrain`. No runtime deps except `node-fetch` if needed. Dev: typescript.

**12. `packages/gbrain/tsconfig.json`**
Extends base. Composite true. Declaration true.

**13. `packages/gstack/package.json`**
Name `@pulse/gstack`. Same pattern as gbrain.

**14. `packages/gstack/tsconfig.json`**
Same as gbrain.

**15. `packages/scorer/package.json`**
Name `@pulse/scorer`. No deps.

**16. `packages/scorer/tsconfig.json`**
Same pattern.

**17. `.env.example`**
```
# Vapi
VAPI_API_KEY=
VAPI_SECRET=
VAPI_ASSISTANT_ID=
VAPI_PHONE_NUMBER_ID=

# GBrain
GBRAIN_API_KEY=
GBRAIN_BASE_URL=
GBRAIN_PROJECT_ID=

# GStack
GSTACK_API_KEY=
GSTACK_BASE_URL=
GSTACK_PROJECT_ID=

# App
PORT=3001
FRONTEND_URL=http://localhost:3000
DEMO_PHONE=+1XXXXXXXXXX
NODE_ENV=development
```

**18. `.gitignore`**
Standard Node + Next.js. Include `dist/`, `.env`, `.env.local`, `node_modules/`.

---

### BACKEND SKELETON

**19. `apps/backend/src/env.ts`**
Use `zod` to parse and validate all env vars. Export typed `env` object. Throw on startup if required vars are missing.

**20. `apps/backend/src/types.ts`**
All shared TypeScript types:
```ts
MenuItem, CustomerProfile, MemoryFact, Session,
SSEEvent, VapiWebhookBody, SaveOrderArgs, ReviewArgs
```
These are consumed by both Smart Coder and your simple routes.

**21. `apps/backend/src/index.ts`**
Fastify boot file:
- Register `@fastify/cors` with `FRONTEND_URL` origin
- Register routes: context, save-order, events, review
- Health endpoint: `GET /health → { ok: true, ts: Date.now() }`
- Listen on `PORT`, `0.0.0.0`
- Log startup URL

**22. `apps/backend/src/services/sse-hub.ts`**
Write a stub with the class shape and `export const hub = new SSEHub()`. Leave implementation body as `// TODO: Smart Coder`.

---

### SEED DATA FILES

**23. `data/companies/sunrise-coffee/menu.md`**
Full menu with YAML frontmatter. Include 8 items: mix of hot/cold, dairy/dairy-free, coffee/tea/food. Use this exact schema:
```yaml
---
title: Sunrise Coffee Menu
category: company-brain
business: sunrise-coffee
---
```
Items must have: name, price, description, dairy-free flag, attributes list (for scorer), modifiers list.

Include these items:
- Oat Milk Latte ($5.50) — dairy-free, warm, coffee, nutty
- Classic Cappuccino ($4.75) — dairy, warm, coffee, bold
- Chai Latte ($5.00) — dairy option, warm, spiced, cardamom
- Matcha Latte ($5.75) — dairy-free option, warm, earthy, sweet
- Cold Brew ($4.50) — dairy-free, cold, coffee, bold
- Iced Vanilla Latte ($6.00) — dairy, cold, sweet, coffee
- Avocado Toast ($8.50) — vegan, gluten-free option, savory
- Blueberry Muffin ($3.75) — contains gluten and dairy

**24. `data/companies/sunrise-coffee/policies.md`**
```yaml
---
title: Sunrise Coffee Policies
category: company-brain
business: sunrise-coffee
---
```
Include: pickup time (10-15 min), order hold (30 min), loyalty program (every 10th free), substitutions policy, how to escalate to a human.

**25. `data/companies/sunrise-coffee/allergens.md`**
```yaml
---
title: Allergen Information
category: company-brain
business: sunrise-coffee
---
```
Per-item allergen table. Dairy, gluten, nuts, soy for each menu item. Include a note: "If uncertain, agent escalates to staff — never guesses."

**26. `data/customers/demo-customer.md`**
This is the pre-seeded profile for the demo caller. Phone: `+1XXXXXXXXXX` (placeholder — will be replaced with real number).
```yaml
---
title: Customer Profile
phone: "+1XXXXXXXXXX"
name: "Aarya"
first_seen: "2026-05-10"
last_call: "2026-05-15"
total_orders: 4
---
```
Include: preferences (oat milk, no dairy, less sweet), order history (4 past orders including one for mom), household member (Mom: chai latte, extra spiced), behavioral notes (calls weekday mornings).

**27. `data/customers/new-customer.md`**
Anonymous fallback profile. No phone. name: "there" (so agent says "Hey there!"). Empty preferences. style: "simple and friendly".

---

### VAPI CONFIG FILES

**28. `vapi/system-prompt.md`**
The full Vapi assistant system prompt. Write it using the content from the architecture doc. Key rules:
- Hardcoded business name: "Sunrise Coffee"
- Always call `get_context` before making any recommendations
- Recommend top-ranked item first, second as backup
- Never guess allergens — escalate to human
- Match customer's communication energy
- Never say "as an AI"
- Say "same as last time?" if returning customer
- After order confirmed: call `save_order`, give pickup time (~10 minutes)

**29. `vapi/tool-definitions.json`**
JSON array with two tool objects: `get_context` and `save_order`. Use exact schemas from the architecture doc. For `get_context`, add a note in the description that `phone_number` is read from the webhook body at the backend — the LLM should pass an empty string if it doesn't know it.

---

### DASHBOARD SKELETON

**30. `apps/dashboard/src/app/layout.tsx`**
Dark background (`#0F0F0F`), sans-serif font, metadata title "Pulse — Business Dashboard".

**31. `apps/dashboard/src/app/globals.css`**
Tailwind directives. Custom scrollbar dark styling.

**32. `apps/dashboard/src/app/page.tsx`**
Main dashboard layout. Three-column grid on desktop:
- Left col: `<StatsBar />` + `<ActiveCalls />`
- Center col: `<OrderFeed />`
- Right col: `<MemoryReview />`
Import components and `useSSE` hook. Pass SSE events down as props.

**33. `apps/dashboard/src/hooks/useSSE.ts`**
Hook that connects to `${BACKEND_URL}/api/events`, parses SSE events, and returns typed state:
```ts
{ activeCalls, recentOrders, pendingFacts, stats }
```
Auto-reconnect on disconnect with 2s delay.

**34. `apps/dashboard/src/lib/api.ts`**
One function: `reviewFact(factId: string, status: 'approved' | 'rejected'): Promise<void>` — POSTs to backend `/api/review`.

**35. `apps/dashboard/src/components/StatsBar.tsx`**
Four stat cards in a row: Active Calls, Orders Today, Revenue Recovered, Facts Pending Review. Accept props. Dark card style, orange accent numbers.

**36. `apps/dashboard/src/components/ActiveCalls.tsx`**
List of call cards. Each shows: customer name, phone (last 4 digits), call duration (live timer), current status ("Recommending...", "Order confirmed", etc.). Accept `calls` prop from SSE state.

**37. `apps/dashboard/src/components/OrderFeed.tsx`**
Scrollable feed of completed orders. Each entry: customer name, items list, total, timestamp. Newest at top. Accept `orders` prop.

**38. `apps/dashboard/src/components/MemoryReview.tsx`**
The key demo component. Each pending fact shows:
- Fact statement (bold)
- Evidence quote (italic, smaller)
- Confidence badge (green if ≥85%, yellow if 60-84%)
- Category tag (dietary/preference/household/behavioral)
- `[Approve]` (green) and `[Reject]` (red) buttons
- On click: call `reviewFact()`, optimistic remove from list

**39. `apps/dashboard/src/components/CustomerCard.tsx`**
Expandable card. Shows: name, preferences as tags, order history as list, household members. Accept `profile` prop. Used when a call card is clicked (nice-to-have).

---

### DEPLOY FILES

**40. `apps/backend/Procfile`**
```
web: node dist/index.js
```

**41. `apps/dashboard/vercel.json`**
```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

**42. `scripts/seed-gbrain.ts`**
Script that reads all files from `data/` and uploads them to GBrain via the `@pulse/gbrain` client. Logs each upload. Run with `tsx scripts/seed-gbrain.ts`.

**43. `scripts/setup-vapi.ts`**
Script that:
1. Creates a Vapi assistant (reads `vapi/system-prompt.md` + `vapi/tool-definitions.json`)
2. Sets server URL to `RAILWAY_URL/api/...`
3. Logs the assistant ID (paste into `.env` as `VAPI_ASSISTANT_ID`)
Run with `tsx scripts/setup-vapi.ts`.

**44. `scripts/test-call.ts`**
Simulates a Vapi webhook locally. POSTs a fake `get_context` body to `localhost:3001/api/context` with `DEMO_PHONE` and a sample request string. Logs the response. For testing context route without a real call.

---

When all 44 files are done, output a single line:
```
SCAFFOLD COMPLETE — 44 files
```
Then list any TODOs you left that Smart Coder needs to fill in.
