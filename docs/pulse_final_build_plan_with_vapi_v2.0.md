# Pulse — Final Build Plan + Vapi Agent Call Implementation

> **"Talk to any business like they're your best friend."**  
> 12-hour hackathon. 4 people. No Pi. All focus on one perfect demo.

---

## What We're Building

A live phone number that any customer can call to talk to a business. The AI agent:

- **Knows the business** — full menu, ingredients, policies, what's in stock
- **Knows the customer** — preferences, history, dietary needs, language, communication style
- **Learns in real-time** — every call makes the next call better
- **Handles parallel calls** — Sarah's bakery never misses a call again

The dashboard shows the business owner their customers, live calls, and insights they've never had access to before.

---

## Core Product Thesis

Pulse is not just an AI phone bot.

Voice AI answers the phone. Pulse gives the business memory.

Every business gets:

1. **Company Brain** — everything the business knows
2. **Customer Brain** — everything the business has learned about each customer
3. **Session Brain** — what the customer wants right now

The agent merges all three in real time, then makes safe, personalized recommendations.

---

## Architecture

```txt
Customer calls ──► Vapi.ai (voice) ──► Pulse Backend (Fastify)
                                            │
                                    ┌───────┴───────┐
                                    ▼               ▼
                              Company Brain    Customer Brain
                               (GBrain)         (GBrain)
                                    │               │
                                    └───────┬───────┘
                                            ▼
                                    Context Merger
                                            │
                                            ▼
                                   Personalized Response
                                            │
                                            ▼
                              Vapi speaks ──► Customer hears
                                            │
                                            ▼
                              Profile updated in real-time
                                            │
                                            ▼
                              Dashboard updates (WebSocket)
```

---

## Stack

| Layer | Tool | Notes |
|---|---|---|
| Voice | Vapi.ai | Handles STT, TTS, phone number, function calling |
| Backend | Fastify | Context merger, GBrain reads/writes, WebSocket events |
| Memory | GBrain | Markdown knowledge items for companies + customers |
| Dashboard | Next.js | Business dashboard, live calls, insights |
| Competitive intel | The Hog | Optional competitor activity demo moment |
| AI | OpenAI / Anthropic | Powers Vapi conversational logic |
| Workflow | GStack | Build/review/QA/sync workflow trace |

---

# Vapi Agent Call Implementation

## Two meanings of “agent call”

### 1. Customer calls agent

This is the best hackathon demo. Least legal/privacy risk. Most legible.

```txt
Customer phone
  → Vapi phone number
  → Vapi assistant
  → tool call: /api/context
  → backend fetches Company Brain + Customer Brain
  → Vapi talks back
  → tool call: /api/save_order
  → dashboard updates
```

Build this first.

### 2. Agent calls customer

Useful later. Higher legal/privacy risk. Requires clear consent.

```txt
Owner clicks “Call customer”
  → backend calls Vapi outbound API
  → Vapi places call
  → agent says “Hi, this is Pulse calling from Sarah’s Bakery…”
  → customer interacts
  → transcript + result saved
```

For the hackathon, avoid outbound unless a judge asks. Inbound is cleaner.

---

## Minimal Vapi Assistant Setup

Create a Vapi assistant with this core instruction:

```txt
You are Pulse, the phone concierge for Sunrise Coffee.

When a caller asks for food or drinks, call get_context first.
Use company menu and customer profile.
Ask one clarifying question if unsure.
Never guess allergies.
Confirm final order before saving.
After order confirmation, call save_order.
```

Use one combined tool instead of separate `get_customer_profile` and `get_menu`.

Faster:

```txt
get_context(phone_number, request)
```

Not:

```txt
get_customer_profile(phone_number)
get_menu(query)
```

Reason: fewer tool calls, fewer failure points, faster demo.

---

## Backend Endpoints

Fastify needs two must-have endpoints:

```txt
POST /api/context
POST /api/save_order
```

Nice-to-have dashboard endpoints:

```txt
GET  /api/calls/active
GET  /api/customers/:id
POST /api/learn
POST /api/memory/approve
```

---

## Minimal Fastify Server

```ts
import Fastify from "fastify";

const app = Fastify();

app.post("/api/context", async (req, reply) => {
  const body = req.body as any;
  const phone = body.phone_number ?? "unknown";

  const customer = phone.includes("YOUR_NUMBER")
    ? {
        name: "Aayushya",
        likes: ["sweet", "chai", "cardamom", "oat milk"],
        avoids: ["dairy"],
        style: "plain English, no menu jargon",
        lastOrder: "hot chai latte, extra sweet, oat milk"
      }
    : {
        name: "new customer",
        likes: [],
        avoids: [],
        style: "simple and friendly"
      };

  const company = {
    name: "Sunrise Coffee",
    menu: [
      {
        name: "Iced Chai Latte",
        price: 5.75,
        description: "Cold, sweet, spiced milk tea",
        dairyFree: true,
        modifiers: ["oat milk", "extra sweet", "cardamom"]
      },
      {
        name: "Coconut Cold Brew",
        price: 6.25,
        description: "Light cold coffee with coconut and vanilla",
        dairyFree: true,
        modifiers: ["vanilla", "caramel drizzle"]
      }
    ],
    rules: [
      "Never guess about allergies.",
      "Recommend max one best item and one backup."
    ]
  };

  return reply.send({ customer, company });
});

app.post("/api/save_order", async (req, reply) => {
  const order = req.body;

  console.log("ORDER SAVED", order);

  // TODO: write to GBrain markdown / DB
  // TODO: emit WebSocket dashboard event

  return reply.send({ ok: true });
});

app.listen({ port: 3001, host: "0.0.0.0" });
```

Expose local backend:

```bash
ngrok http 3001
```

Use the ngrok URL in Vapi tools:

```txt
https://your-ngrok-url.ngrok-free.app/api/context
https://your-ngrok-url.ngrok-free.app/api/save_order
```

---

## Vapi Tool Schemas

### Tool 1 — `get_context`

```json
{
  "name": "get_context",
  "description": "Get customer profile and company menu before making recommendations.",
  "parameters": {
    "type": "object",
    "properties": {
      "phone_number": {
        "type": "string",
        "description": "Caller phone number"
      },
      "request": {
        "type": "string",
        "description": "What the customer is asking for"
      }
    },
    "required": ["phone_number", "request"]
  }
}
```

### Tool 2 — `save_order`

```json
{
  "name": "save_order",
  "description": "Save confirmed order and learned preferences.",
  "parameters": {
    "type": "object",
    "properties": {
      "customer_name": { "type": "string" },
      "items": {
        "type": "array",
        "items": { "type": "string" }
      },
      "new_preferences": {
        "type": "array",
        "items": { "type": "string" }
      },
      "confidence": { "type": "number" }
    },
    "required": ["items"]
  }
}
```

---

## Vapi System Prompt

```txt
You are Pulse, a friendly, personalized AI phone concierge for {{company_name}}.

YOUR JOB:
You help customers order by translating normal human language into the right menu item.
You are not a menu reader. You are a translator between human desire and business inventory.

YOUR PERSONALITY:
- Warm, casual, and genuinely helpful — like a calm local shop employee
- Never robotic or scripted
- Match the customer's energy and communication style
- If they are casual, be casual
- If they are formal, be formal
- Use their name only when natural
- Never say "as an AI"

YOU HAVE THREE SOURCES OF CONTEXT:

1. COMPANY BRAIN:
You know the menu, ingredients, allergens, prices, stock status, policies, hours, seasonal items, and popular combinations.

2. CUSTOMER BRAIN:
If this is a returning customer, you know their order history, taste preferences, dietary needs, language preference, and communication style.

3. SESSION BRAIN:
You track what the customer wants right now. Today's request beats old preferences.

CORE BEHAVIORS:
- If someone does not know what they want, ask simple questions.
- Do not list the whole menu.
- Ask: hot or cold? sweet or not? coffee or tea? light or filling?
- If someone uses simple language, keep your language simple.
- If someone seems confused by menu terms, explain in plain English.
- Never make someone feel dumb for not knowing menu jargon.
- Recommend max one best item and one backup.
- If they mention dietary needs, filter recommendations automatically.
- If allergen information is incomplete, never guess. Escalate to a human.
- If they say "same as last time," retrieve order history first.
- If they interrupt or correct themselves, adapt immediately.
- Confirm the final order before saving.

MEMORY RULES:
- Use Customer Brain only when relevant.
- Do not mention creepy details.
- Do not claim certainty about stale memories.
- If a memory is low confidence, ask naturally.
- Keep household members separate.
- Never invent order history.
- After the call, summarize learned preferences with evidence and confidence.

AFTER ORDER CONFIRMATION:
Call save_order with:
1. customer name
2. ordered items
3. learned preferences
4. confidence
```

---

## Demo Agent Call Script

Call the Vapi number live on speakerphone.

### Agent

> Hey, welcome back to Sunrise Coffee. What sounds good today?

### You

> I want something cold, sweet, not too heavy, no dairy.

Agent calls:

```txt
/api/context
```

### Agent

> Best match is an iced chai with oat milk and extra cardamom. It’s cold, sweet, and still tastes like the chai you usually like. Want that?

### You

> Yeah. And my mom wants hot chai, sweet.

### Agent

> Got it. Hot chai, extra sweet. Should I add cardamom like last time?

### You

> Yes.

Agent calls:

```txt
/api/save_order
```

Dashboard shows:

```txt
Live call: Aayushya

Order:
- Iced Chai Latte, oat milk, cardamom
- Hot Chai Latte, extra sweet, cardamom

Memory learned:
- Customer likes cold chai variants
- Mom likes hot sweet chai
```

This is the core demo. Do not overcomplicate.

---

# Demo Script — 2:30

## [0:00 - 0:25] The Problem — Personal Story

> My dad immigrated to the US over 25 years ago. He still hates ordering at Starbucks. Not because he can't speak English — he can. But he doesn't know what a venti is, he doesn't know the difference between a latte and a macchiato, and he doesn't want to hold up the line asking. So he gets the same drink every time — or he doesn't go at all.
>
> This isn't a language problem. It's a context problem. And it costs businesses billions in lost sales every year.

## [0:25 - 0:45] The Solution — One Sentence

> Pulse lets any customer call any business and talk to an AI that knows the entire business and knows them personally. It is like having a best friend who works at every store you shop at.

## [0:45 - 1:40] The Demo — Live Phone Call

- Show dashboard: "Sunrise Coffee" with storefront, customers, and live call panel.
- Say: "Let me call Sunrise Coffee right now."
- Dial the number live on speakerphone.
- Agent answers.
- You order the cold sweet no-dairy drink.
- Agent recommends from Company Brain + Customer Brain.
- You add mom's chai.
- Agent remembers mom's preference.
- Dashboard updates live.

## [1:40 - 2:00] The Scale

> Now here's why this matters for business.
>
> Sarah used to miss calls during rush. Pulse can handle multiple calls at once.
>
> She gets cleaner orders, customer memory, and insight into what people actually want when there is no pressure and no confusion.

Show:

```txt
3 active calls
2 orders confirmed
1 human escalation
$86 estimated recovered revenue today
```

## [2:00 - 2:30] The Close

> Pulse fixes the interface between customers and businesses.
>
> Every customer gets a personal concierge. Every business gets a sales team that never sleeps, never forgets, and knows when to hand off to a human.
>
> We start with coffee shops and bakeries, then expand across every local business where phone calls still matter.

---

# 12-Hour Build Plan

## Priority Order

If time dies, follow this order.

1. **Voice agent works** — real phone call, real conversation
2. **Agent reads context** — responses reference actual business/customer data
3. **Dashboard shows live call** — visual proof
4. **Profile updates in real time** — the learning moment
5. **Memory review queue** — safe memory with evidence
6. **Parallel-call simulation** — scale moment
7. **Pixel-art UI** — nice, not core
8. **The Hog integration** — only if everything else works

---

## Phase 1: Setup — Hours 0-1

Everyone:

- [ ] Create monorepo in `yc-gbrain/`
- [ ] Set up Vapi account
- [ ] Get Vapi phone number
- [ ] Get API keys
- [ ] Set up GBrain locally or file-backed GBrain-shaped markdown
- [ ] Start Fastify server
- [ ] Start Next.js dashboard
- [ ] Read demo script aloud once
- [ ] Assign tasks

Gate:

```txt
By hour 1, everyone knows the demo path.
```

---

## Phase 2: Foundation — Hours 1-4

### Product / Pitch

Write fixture data:

- [ ] `company/sunrise-coffee/menu.md`
- [ ] `company/sunrise-coffee/policies.md`
- [ ] `company/sunrise-coffee/allergens.md`
- [ ] `company/sarahs-bakery/menu.md`
- [ ] `customers/aayushya.md`
- [ ] `customers/dad.md`
- [ ] `customers/mom.md`
- [ ] `customers/sarah-chen.md`
- [ ] `customers/new-customer.md`

Write:

- [ ] Vapi system prompt
- [ ] 2:30 demo script
- [ ] Q&A answers
- [ ] ROI cards for dashboard

### Designer / Frontend

Build dashboard:

- [ ] business storefront view
- [ ] live call card
- [ ] customer profile panel
- [ ] order panel
- [ ] memory review queue
- [ ] insight cards
- [ ] basic responsive layout

### Coder #1 — Voice

Critical path:

- [ ] Create Vapi assistant
- [ ] Configure `get_context`
- [ ] Configure `save_order`
- [ ] Test inbound call
- [ ] Verify agent can call backend
- [ ] Verify agent uses context in response

### Coder #2 — Backend

Build Fastify:

- [ ] `POST /api/context`
- [ ] `POST /api/save_order`
- [ ] `GET /api/calls/active`
- [ ] `GET /api/dashboard`
- [ ] WebSocket or SSE for live dashboard events
- [ ] GBrain/file-backed markdown reader
- [ ] GBrain/file-backed markdown writer

Gate:

```txt
By hour 4, phone call should hit backend.
```

---

## Phase 3: Integration — Hours 4-8

### Product / Pitch

- [ ] Test full call flow
- [ ] Tune prompt
- [ ] Test edge cases:
  - "I don't know what I want"
  - "What's popular?"
  - "I'm allergic to nuts"
  - "No dairy"
  - "Same as last time"
  - "My mom wants chai"
- [ ] Rehearse pitch
- [ ] Record backup video

### Designer / Frontend

- [ ] live call appears instantly
- [ ] transcript snippets appear
- [ ] current recommendation appears
- [ ] order cart updates
- [ ] memory learned appears
- [ ] owner can approve/reject memory
- [ ] insight panel appears

### Coder #1 — Voice

- [ ] Improve Vapi function calling
- [ ] Add order confirmation before save
- [ ] Handle correction/interruption
- [ ] Test second customer profile
- [ ] Test no-profile caller

### Coder #2 — Backend

- [ ] Save order to GBrain/file markdown
- [ ] Emit WebSocket/SSE events
- [ ] Generate memory facts:
  - preference
  - dietary
  - communication style
  - household note
- [ ] Add confidence score
- [ ] Add memory evidence quote
- [ ] Add analytics endpoint

Gate:

```txt
By hour 8, full demo should work once cleanly.
```

---

## Phase 4: Polish + Rehearse — Hours 8-12

### Product / Pitch

- [ ] Rehearse full demo 5 times
- [ ] Cut anything over 2:30
- [ ] Record final backup video
- [ ] Prepare live failure fallback
- [ ] Prepare judge Q&A

### Designer / Frontend

- [ ] Polish dashboard
- [ ] Test on projector resolution
- [ ] Add micro-animations
- [ ] Add business value cards
- [ ] Add memory review queue polish

### Coder #1 — Voice

- [ ] Final Vapi test
- [ ] Set up planted phone
- [ ] Confirm agent phone number works
- [ ] Confirm backend URL still works
- [ ] Keep ngrok alive

### Coder #2 — Backend

- [ ] Stress test endpoints
- [ ] Confirm WebSocket/SSE stable
- [ ] Confirm fallback fixtures work
- [ ] Stand by for bugs

Gate:

```txt
By hour 10, stop adding features. Rehearse only.
```

---

# Critical Dependencies

```txt
Vapi account + phone number
         │
         ▼
Vapi agent receives calls
         │
         ▼
Fastify API returns context
         │
         ▼
Vapi calls Fastify mid-conversation
         │
         ▼
Dashboard shows live call data
         │
         ▼
Profile updates in real time
         │
         ▼
Full rehearsal passes
```

## Gates

### Gate 1 — Hour 2

```txt
Can call Vapi number and hear agent respond.
```

If fail: fix Vapi config.

### Gate 2 — Hour 3

```txt
Vapi calls /api/context successfully.
```

If fail: hardcode context into Vapi prompt temporarily.

### Gate 3 — Hour 5

```txt
Agent uses customer/company data in response.
```

If fail: simplify tool schema.

### Gate 4 — Hour 7

```txt
Dashboard updates from backend.
```

If fail: use polling instead of WebSocket.

### Gate 5 — Hour 9

```txt
Full call → order → dashboard update works.
```

If fail: use backup video for live call and demo dashboard live.

---

# Fallback Plan

## If Vapi breaks by hour 3

Switch to Bland or Retell.

Do not debug Vapi for 4 hours.

## If all phone infra breaks

Use browser mic:

```txt
Browser mic
  → Web Speech API / OpenAI Realtime
  → backend
  → dashboard
```

But phone call is stronger. Keep Vapi first.

## If GBrain breaks

Use file-backed markdown and call it “GBrain-shaped local memory” in dev.

Still preserve the abstraction:

```txt
company brain
customer brain
session brain
memory facts
evidence
```

## If dashboard live updates break

Use polling every 1 second.

## If everything breaks

Play backup video, then show local dashboard.

---

# GBrain Data Files

## Company Brain

```md
# Sunrise Coffee

## Menu

### Iced Chai Latte
Price: $5.75
Plain English: Cold, sweet, spiced milk tea.
Attributes: cold, sweet, medium-light, chai, cardamom, cinnamon
Dairy-free: Yes, with oat milk
Allergens: milk by default
Modifiers: oat milk, extra sweet, cardamom, less ice

### Coconut Cold Brew
Price: $6.25
Plain English: Light cold coffee with coconut and vanilla.
Attributes: cold, sweet, light, coffee, coconut, vanilla
Dairy-free: Yes
Allergens: possible coconut
Modifiers: vanilla, caramel drizzle, oat milk
```

## Customer Brain

```md
# Aayushya

## Preferences
- Likes sweet drinks
- Likes chai
- Likes cardamom
- Prefers oat milk
- Avoids dairy
- Likes simple explanations, no coffee jargon

## Order History
- Hot chai latte, extra sweet, oat milk
- Iced chai latte, cardamom

## Household
### Mom
- Likes hot chai
- Likes extra sweet
- Likes cardamom
- Prefers simple explanations
```

## Memory Fact

```md
# Memory Fact: Customer likes cold chai variants

Customer: Aayushya
Type: preference
Confidence: 0.86
Status: pending_review
Evidence: "I want something cold, sweet, not too heavy, no dairy."
Call ID: call_demo_001
Created: 2026-05-16
```

---

# Dashboard Requirements

## Must-have

- [ ] Active call card
- [ ] Customer profile
- [ ] Current recommendation
- [ ] Order cart
- [ ] Saved memory facts
- [ ] Business value cards

## Should-have

- [ ] Memory review queue
- [ ] Live transcript snippets
- [ ] Insight cards
- [ ] Simulated parallel calls

## Nice-to-have

- [ ] Pixel-art storefront
- [ ] Animated customer characters
- [ ] The Hog competitor intel
- [ ] GStack workflow trace

---

# Memory Review Queue

This is the highest-leverage dashboard feature.

Show:

```txt
Pulse wants to remember:

1. Customer avoids dairy
   Evidence: "no dairy"
   Confidence: 92%
   [Approve] [Reject]

2. Mom likes hot sweet chai
   Evidence: "my mom wants hot chai, sweet"
   Confidence: 84%
   [Approve] [Reject]

3. Customer likes cold chai variants
   Evidence: "something cold, sweet..."
   Confidence: 86%
   [Approve] [Reject]
```

Why this matters:

- Makes GBrain visible
- Makes privacy safe
- Shows memory is auditable
- Separates Pulse from generic voice bots

---

# Recommendation Logic

Do not let the LLM freely invent menu items.

Use a simple scoring layer.

```ts
function scoreItem(item, session, customer) {
  let score = 0;

  if (session.temperature && item.attributes.includes(session.temperature)) score += 2;
  if (session.sweetness && item.attributes.includes(session.sweetness)) score += 2;
  if (session.dairy === "avoid" && item.dairyFree) score += 3;

  for (const like of customer.likes) {
    if (item.attributes.includes(like)) score += 1;
  }

  for (const avoid of customer.avoids) {
    if (item.attributes.includes(avoid)) score -= 5;
  }

  return score;
}
```

Decision gate:

```txt
confidence >= 0.85 → recommend
0.60–0.84 → ask one clarifying question
< 0.60 → offer two options or escalate
allergen uncertainty → human handoff
```

---

# Judge Q&A Prep

| Question | Answer |
|---|---|
| How is this different from a chatbot? | Chatbots know FAQs. Pulse knows the business and the customer. Your 10th call is better than your 1st because the Customer Brain compounds. |
| Why wouldn't Starbucks build this? | They might for themselves. But millions of small businesses cannot build voice agents, memory graphs, and dashboards. Pulse is the Shopify of customer conversations. |
| What's the GBrain integration? | GBrain is the persistence layer. Company Brain and Customer Brain are durable knowledge items. Every call writes new memory facts with evidence and confidence. |
| What about privacy? | Memory is transparent and reviewable. Customers can ask what Pulse remembers, and businesses can approve or reject memories. Cross-business sharing is future-only and opt-in. |
| What's your go-to-market? | Start with coffee shops and bakeries. High repeat customers, complex menus, and phone orders. Then expand to salons, restaurants, medical offices, and local services. |
| Revenue model? | Start around $99/month for small cafés, $249/month for higher volume, and $499/month for multi-agent analytics. Price by included minutes, not fake unlimited calls. |
| Does this replace workers? | No. Pulse answers routine calls staff already miss. Humans still handle food, walk-ins, angry customers, custom work, and relationship-building. |
| What if the AI gets an allergy wrong? | It should not guess. If allergen data is incomplete, Pulse escalates to a human. Safe handoff beats confident wrong answers. |

---

# Final Build Mantra

```txt
Voice bots answer calls.
Pulse remembers customers.
```

```txt
No confident wrong orders.
Ask or escalate.
```

```txt
The memory review queue wins the demo.
```
