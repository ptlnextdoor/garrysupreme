# Pulse — Product Specification

> **"What if every business could talk to every customer — simultaneously, in their language, remembering everything?"**

---

## 1. Origin Story

My dad immigrated to the US over 25 years ago. To this day, he hates ordering at Starbucks.

It's not a language problem — he speaks English fine. It's that Starbucks has **170,000 possible drink combinations**, calls a small a "tall," a medium a "grande," and expects you to know the difference between a macchiato and a cortado. My dad doesn't want to learn coffee taxonomy. He wants a warm, sweet drink that tastes good. But the menu assumes you already know what you want and how to say it.

So he orders the same thing every time — a safe bet. Or he doesn't go at all.

**He's not alone.** 71% of consumers report feeling overwhelmed by complex menus and product selections. Starbucks itself acknowledged this problem and announced a 30% menu reduction in 2025. But simplifying the menu doesn't fix the real issue — the real issue is that **the interface between customer and business is broken.**

The broken interface isn't just menus. It's:
- **Language barriers** — 25+ million Americans have limited English proficiency, representing **$1.2 trillion in annual purchasing power** that businesses regularly fail to capture
- **Intimidation** — people don't want to ask "dumb" questions in a drive-through line with people waiting behind them
- **Context mismatch** — the business thinks in SKUs and product names; the customer thinks in feelings ("something warm and sweet like the chai I grew up with")
- **Time pressure** — recreational shopping should be fun, not homework

**Pulse fixes the interface.**

---

## 2. What Pulse Is

Pulse gives every business an AI voice agent that customers can call to order, ask questions, and get personalized help — in their language, at their pace, with zero pressure.

What makes Pulse different from every other AI voice bot: **it has two brains.**

### The Company Brain (powered by GBrain)
Everything the business knows — menu items, ingredients, allergens, pricing, policies, seasonal specials, what's in stock, popular combinations, operating hours. Stored as GBrain knowledge items (markdown files) that the business can edit and the AI reads in real-time.

### The Customer Brain (powered by GBrain)
Everything the business has learned about THIS specific customer — order history, taste preferences, dietary needs, communication style, language preference, family context. Updated automatically after every interaction. Compounds over time.

### The Magic
When a customer calls, Pulse merges both brains in real-time:

```
Customer says: "I want something sweet, like chai, but cold"

Company Brain knows:  Iced Chai Latte ($5.75), Mango Refresher ($5.50),
                      Coconut Cold Brew ($6.00 — new, dairy-free)

Customer Brain knows: Prefers oat milk, likes cardamom,
                      doesn't like overly heavy drinks,
                      tried Coconut Cold Brew last week and loved it

Pulse says: "You'd love the Iced Chai Latte — it's like your
            usual hot chai but cold and refreshing. Want me to
            add that cardamom you love? Or since you liked the
            Coconut Cold Brew last week, I could do that with
            a chai flavor twist?"
```

**No menu scanning. No jargon. No intimidation. Just a conversation.**

---

## 3. How It Works — Technical Architecture

```
Customer dials business phone number
         │
         ▼
    Vapi.ai Voice Agent
    (Speech-to-Text → AI → Text-to-Speech)
         │
         │  mid-conversation function calls
         ▼
    Pulse Backend (Fastify)
    ├── get_customer_context(phone) → reads Customer Brain from GBrain
    ├── get_menu(query) → reads Company Brain from GBrain
    └── save_preferences(data) → writes learned preferences back to GBrain
         │
         ▼
    GBrain Knowledge Layer
    ├── companies/{slug}/menu.md
    ├── companies/{slug}/policies.md
    ├── customers/{name}.md        ← updated after every call
    └── insights/weekly.md         ← aggregated business intelligence
         │
         ▼
    Business Dashboard (Next.js)
    ├── Live call monitor
    ├── Customer profiles + history
    ├── Business insights + recommendations
    └── Real-time WebSocket updates
```

### GStack Integration
GStack's role-based workflow governs the system:
- **Ingest role**: Processes new customer interactions, extracts preferences
- **Analyst role**: Runs nightly "dream cycles" to consolidate patterns and generate business insights
- **Agent role**: The voice agent itself, following structured conversation protocols
- **Reviewer role**: Validates recommendations before surfacing them, ensures quality

### GBrain Integration (Deep)
GBrain is not a nice-to-have — it IS the product's core:
- **Markdown-first architecture** → Business owners can read and edit their company brain in plain text. No vendor lock-in. Human-auditable.
- **Self-wiring knowledge graph** → Customer preferences automatically link to menu items, creating a recommendation network
- **Dream cycles** → Overnight consolidation processes that:
  - Aggregate customer behavior into weekly business insights
  - Identify cross-sell patterns ("67% of chai customers also like the lavender latte")
  - Update churn risk scores
  - Enrich customer profiles with inferred preferences
- **Hybrid search** → When a customer says "something sweet and cold," GBrain's vector + keyword search finds the most relevant menu items

---

## 4. Who It's For

### Small Businesses (Primary — First Market)
- Coffee shops, bakeries, restaurants, salons, florists, auto repair shops
- 1-50 employees
- Currently miss 62% of incoming calls
- Average annual revenue loss from missed calls: **$126,000**
- Can't afford a dedicated receptionist ($50K-68K/year fully loaded)
- Need personalized customer service but can't scale it

### Mid-Market (Expansion)
- Regional chains (10-100 locations)
- Franchise operators
- Medical/dental practices, law firms, real estate agencies

### Enterprise (Vision)
- National chains that want to open a new ordering channel (phone-based ordering)
- Starbucks, Domino's, etc. — phone ordering powered by Pulse
- Customer intelligence data that they can't get from their app

---

## 5. The SMB Buyer Analysis (What Garry Asked For)

> *"As a small business owner buying this for myself — what is my gain and loss?"*

### The Scenario
**Sarah** owns a bakery in a small town. She has 3 employees. She gets 15-25 calls per day. She currently answers maybe 8-10 of them because she's baking, serving customers, or managing inventory.

---

### 💰 What Do I Gain?

#### 1. Never Miss a Call Again
- **Current state:** Sarah misses ~62% of calls (industry average)
- **With Pulse:** 0% missed. Every call answered instantly, 24/7, simultaneously.
- **Revenue impact:** At $100-$200 per missed call in a bakery (custom cake orders, catering inquiries, advance orders), recovering even 5 calls/week = **$26,000-$52,000/year in recovered revenue**

#### 2. Scale Without Hiring
- Pulse handles **unlimited parallel calls**. During Sarah's lunch rush, 5 people call at once. Without Pulse, 4 get voicemail. With Pulse, all 5 get a personalized experience.
- This scales her capacity without adding headcount.

#### 3. Customers Feel Known
- Returning customer calls: *"Hey Maria! Want your usual chocolate croissant order? I remember you need it nut-free for your daughter."*
- This "mom and pop" feeling is impossible to scale with employees alone — people forget, shift changes happen, new hires don't know regulars
- **71% of consumers expect personalized interactions.** 62% lose loyalty without them.

#### 4. New Revenue From Recommendations
- Companies that personalize well generate **10-30% more revenue** (McKinsey)
- Pulse recommends items customers didn't know they'd love
- Example: Before Pulse recommendations, Sarah's lavender latte sold 2/week. After: 14/week.
- **Personalized recommendations can increase average order value by up to 25%**

#### 5. Business Intelligence You've Never Had
- Weekly insights: "Your top-selling cake flavor is vanilla, but 40% of customers who asked for recommendations chose red velvet. Consider featuring it more prominently."
- Churn alerts: "Maria hasn't ordered in 3 weeks. She was a weekly customer."
- Competitive intelligence: "Your competitor just added delivery. 23% of your regulars live >3 miles away."

---

### 💸 What Do I Lose / What Does It Cost?

#### Pricing (Proposed)

| Plan | Monthly | Calls Included | Per Call Over |
|------|---------|---------------|---------------|
| **Starter** | $99/mo | 300 calls | $0.35/call |
| **Growth** | $249/mo | 1,000 calls | $0.25/call |
| **Pro** | $499/mo | 3,000 calls | $0.15/call |
| **Enterprise** | Custom | Unlimited | Custom |

#### Underlying Costs
- Vapi voice: ~$0.05-0.10/minute
- Average call: 2-3 minutes → ~$0.15-0.30/call
- GBrain hosting: Minimal (markdown files on local server)
- **Gross margin: 70-85%**

#### Setup Effort
- **Time to set up:** 1-2 hours
- Upload your menu (or we'll do it for you during onboarding)
- Connect your phone number
- Customer profiles build automatically from calls — zero setup needed
- **No technical knowledge required**

---

### 🤔 Do I Have to Let Anyone Go?

**No. Absolutely not.**

Pulse is **additive, not replacement.** Here's why:

| Task | Human Employee | Pulse |
|------|---------------|-------|
| Answer the phone when busy | ❌ Can't — hands are full | ✅ Always available |
| Remember every customer's preferences | ❌ Forgets, shifts change | ✅ Perfect memory |
| Handle 5 calls at once | ❌ Impossible | ✅ Unlimited |
| Bake the cakes | ✅ Essential | ❌ Can't |
| Handle complex custom requests in person | ✅ Nuance, creativity | 🟡 Handles basic, escalates complex |
| Build personal relationships face-to-face | ✅ Irreplaceable | ❌ Phone only |
| Work after hours | ❌ Goes home | ✅ 24/7 |

**The pitch to SMB owners:** *"You didn't hire your baker to answer phones. Pulse answers the phone so your baker can bake."*

Pulse handles the calls your team is already missing. It's not taking anyone's job — it's doing the job nobody was doing.

---

### 📊 How Much More Will I Make?

#### Conservative ROI Model (Sarah's Bakery)

| Metric | Before Pulse | With Pulse | Delta |
|--------|-------------|-----------|-------|
| Calls received/day | 20 | 20 | — |
| Calls answered | 8 (40%) | 20 (100%) | +12/day |
| Orders from calls/day | 5 | 14 | +9/day |
| Avg order value | $25 | $28 (+personalized upsell) | +$3 |
| Daily revenue from calls | $125 | $392 | **+$267/day** |
| Monthly revenue from calls | $3,750 | $11,760 | **+$8,010/mo** |
| Pulse cost | $0 | -$249/mo | -$249/mo |
| **Net monthly gain** | — | — | **+$7,761/mo** |
| **Annual ROI** | — | — | **$93,132/year** |
| **ROI multiple** | — | — | **31× return** |

Even at HALF these numbers (50% of recovered calls convert, zero upsell effect), the ROI is still **15× return.**

---

### ⚖️ Is It Better Than Hiring More People?

| Factor | Hire a Part-Time Receptionist | Pulse |
|--------|------------------------------|-------|
| **Monthly cost** | $2,000-3,000 (part-time, no benefits) | $99-249 |
| **Availability** | 20-30 hours/week | 24/7/365 |
| **Calls handled at once** | 1 | Unlimited |
| **Remembers every customer** | No (human memory) | Yes (perfect memory, compounds) |
| **Multilingual** | Probably not | Yes (any language) |
| **Training time** | 2-4 weeks | 1-2 hours (menu upload) |
| **Turnover risk** | High (service industry: 60-80% annual turnover) | None |
| **Sick days / vacation** | Yes | No |
| **Provides business intelligence** | No | Yes (weekly insights) |
| **Scales with business growth** | Need to hire more | Automatically scales |
| **Personalization at scale** | Degrades as customer base grows | Improves as customer base grows |

**Bottom line:** Pulse costs 5-10% of a part-time hire while delivering more capability. It's not a replacement for a receptionist — it's better than a receptionist at phone-based customer interactions, at a fraction of the cost.

---

### 🏢 Why Buy This Over Big Companies?

| Competitor | What They Do | Why Pulse Wins |
|-----------|-------------|---------------|
| **Bland.ai** | Generic AI phone agent platform | No persistent customer memory. Every call starts from scratch. API-first — requires developer to build. Not designed for SMBs. |
| **Vapi** | Voice AI infrastructure / developer platform | Raw building blocks, not a product. You need engineers to build anything useful. No customer intelligence. No business dashboard. |
| **Synthflow** | No-code voice agent builder | Template-based — handles simple FAQs and booking. No deep customer memory. No personalized recommendations. No business insights. |
| **Goodcall** | AI receptionist for SMBs | Closest competitor. Handles basic call answering. But: no persistent customer profiles, no personalized recommendations, no business intelligence dashboard, no learning over time. |
| **Google CCAI / Amazon Lex** | Enterprise contact center AI | Built for Fortune 500. Requires dedicated engineering team. $50K+ implementation. Overkill for SMBs. |
| **Human answering service** | Real people answer your phone | $1-3/minute. Can't personalize at scale. Can't handle 10 simultaneous calls. No customer intelligence. $500-2,000/month for basic coverage. |

### Pulse's Unfair Advantage: **Auditable, Markdown-First Memory via GBrain**

Some competitors store basic call notes. Pulse is structurally different.

The 10th call is dramatically better than the 1st call. By the 50th call, Pulse knows:
- Your name, your usual order, your dietary restrictions
- That you like extra sweet, always get oat milk, prefer cold drinks in summer
- That you come in with your mom on Saturdays and she always gets chai
- That you tried the lavender latte and didn't like it (won't recommend it again)
- That your daughter has a nut allergy

**What makes Pulse's memory different:**

- **Markdown-first** — business owners can read and edit their company brain in plain text. No black box, no vendor lock-in.
- **Evidence-backed** — every memory fact includes the exact quote that generated it and a confidence score. Owners approve or reject before facts are trusted.
- **Human-auditable** — the GBrain knowledge layer is inspectable by non-engineers. A business owner can open a file and see exactly what Pulse knows about a customer.
- **Self-wiring** — customer preferences automatically link to menu items, building a recommendation network that improves without manual curation.

This isn't just "stores call history." It's a structured, auditable knowledge graph that compounds over time and that the business actually owns and controls. No competitor is built on this architecture.

---

## 6. Market Analysis

### Total Addressable Market

| Segment | Businesses | Price Point | Annual Revenue |
|---------|-----------|-------------|---------------|
| **SMBs (1-50 employees)** | 6.1M employer firms | $99-499/mo | $7.2B-$36.6B |
| **Solopreneurs** | 30.1M non-employer firms | $99/mo | $35.8B |
| **Mid-Market (50-500)** | 90K firms | $499-2,000/mo | $540M-$2.2B |
| **Enterprise** | 20K firms | Custom ($5K+/mo) | $1.2B+ |
| **Total SAM (realistic)** | ~6M employer SMBs | $149/mo avg | **$10.7B** |

### Key Market Data Points

| Statistic | Source |
|-----------|--------|
| 36.2 million small businesses in the US | SBA, 2026 |
| 62% of calls to small businesses go unanswered | Industry studies, 2025-26 |
| 80-85% of callers who hit voicemail hang up without leaving a message | Call tracking data |
| Average SMB loses $126,000/year to missed calls | Industry aggregate |
| 25+ million Americans have limited English proficiency | US Census |
| $1.2 trillion in annual purchasing power from LEP households | Frederick Interpreting |
| 1 in 4 US employers lost business due to language barriers | ACTFL |
| 170,000+ possible drink combinations at Starbucks | Starbucks, inc. customizations |
| Personalized businesses generate 10-30% more revenue | McKinsey |
| 71% of consumers expect personalized interactions | McKinsey |
| 62% of consumers lose loyalty without personalization | DemandSage |
| AI voice agent market: $2.5-7B (2025) → $47-60B by 2034 | Grand View Research, MarketIntelo |
| 60% of small businesses now use AI in some form | SellersCommerce, 2026 |

### The Wedge: Why Now?

1. **Voice AI hit "good enough" quality in 2025** — Calls sound natural, not robotic. Consumers accept AI voice interactions.
2. **Starbucks acknowledged menu complexity is losing customers** — The problem is mainstream, not niche.
3. **SMBs are adopting AI** — 60% now use AI in some form. They're ready.
4. **GBrain provides the memory layer that didn't exist before** — Previous voice AI solutions lacked persistent, structured memory. GBrain changes this.
5. **Phone calls have 10-15× higher conversion rate than web leads** — Yet businesses are ignoring this channel.

---

## 7. The Data Flywheel

This is the long-term strategic moat:

```
More customers call Pulse
         │
         ▼
Pulse learns more about each customer
         │
         ▼
Better recommendations + personalization
         │
         ▼
Higher conversion rates + customer satisfaction
         │
         ▼
Business sees ROI, tells other businesses
         │
         ▼
More businesses sign up
         │
         ▼
Cross-business customer graph builds
(Sarah's coffee preferences inform her experience at the bakery next door)
         │
         ▼
Network effect: Pulse becomes more valuable for EVERY business
as more businesses in a community join
```

### Phase 2 Vision: Customer Profiles Follow the Customer
Imagine: you're a Pulse customer at Sunrise Coffee. You walk into Sarah's Bakery next door (also on Pulse). The agent already knows you prefer oat milk and have a nut allergy — because your profile is portable across Pulse-connected businesses.

**This is the true moat. No single business can build it. Only a platform can.**

---

## 8. Revenue Model & Unit Economics

| Metric | Value |
|--------|-------|
| **Average Revenue Per Account (ARPA)** | $149/month |
| **Cost of Goods (Vapi + compute)** | ~$30/month per account |
| **Gross Margin** | ~80% |
| **Customer Acquisition Cost (CAC)** | ~$200 (PLG + referral-heavy) |
| **Lifetime Value (24-month retention)** | $3,576 |
| **LTV:CAC Ratio** | 17.9× |
| **Payback Period** | ~1.3 months |

### Go-to-Market Strategy
1. **Vertical wedge:** Start with coffee shops + bakeries in one city (SF). High call volume, complex menus, repeat customers.
2. **PLG motion:** Free 14-day trial. Business sees ROI in week 1 (answered calls they would have missed). Converts naturally.
3. **Word of mouth:** SMB owners talk to each other. "Did you know I recovered $4K in sales last month from Pulse?"
4. **Expand verticals:** Salons → restaurants → medical/dental → legal → real estate.
5. **Enterprise inbound:** National chains notice the SMB traction and reach out for custom deployments.

---

## 9. Pros and Cons — Honest Assessment

### Pros
- ✅ Massive market (36M+ businesses)
- ✅ Clear, undeniable problem (missed calls, language barriers, menu complexity)
- ✅ Instant, measurable ROI for customers (recovered revenue from day 1)
- ✅ Persistent memory moat that compounds over time (no competitor has this)
- ✅ Works for businesses of ALL sizes
- ✅ Low CAC, high LTV, strong unit economics
- ✅ GBrain provides a genuine technical moat, not just a wrapper on top of an LLM
- ✅ Riding the wave of voice AI adoption (market growing 30%+ CAGR)
- ✅ Emotionally resonant story (immigrant parents, accessibility, inclusion)
- ✅ Creates a new revenue channel businesses didn't have before (phone ordering at scale)

### Cons / Risks
- ⚠️ **Vapi/voice provider dependency** — Pulse relies on Vapi (or similar) for the voice layer. Mitigated by: Vapi is one of several providers; we can switch to Bland.ai, Retell, or build our own voice stack as we scale.
- ⚠️ **SMB churn is notoriously high** — SMBs close, change priorities, cancel subscriptions. Mitigated by: if the ROI is 15-31×, churn should be well below industry average. Product becomes stickier over time as customer profiles accumulate.
- ⚠️ **Privacy perception** — Customers may initially be uncomfortable knowing the AI "remembers" them. Mitigated by: Opt-in only. Customers call us, we don't cold-call them. Memory facts require business owner approval before they're trusted. Customers can ask what Pulse remembers and receive a plain-English summary.
- ⚠️ **Phase 2 cross-business data sharing contradicts single-business local storage** — The "customer profiles follow the customer" vision (Section 7) is a fundamentally different data model from per-business local storage. Cross-business sharing requires explicit customer opt-in, separate data agreements with each participating business, and a distinct privacy policy. Do not describe it as an extension of the single-business model — it is a separate product decision with separate legal and trust implications.
- ⚠️ **Voice AI quality can vary** — Accents, background noise, complex requests can trip up voice AI. Mitigated by: graceful fallback to human ("Let me connect you with Sarah directly"), and voice quality is improving rapidly.
- ⚠️ **Big players could build this** — Google, Amazon, or Salesforce could launch a competing product. Mitigated by: Big companies won't serve SMBs (too fragmented, too low ACV). Our persistent memory + community network effect creates a defensible position. Also, speed — we ship faster than any enterprise.
- ⚠️ **Building the initial company brain requires effort** — Business owners need to input their menu/products. Mitigated by: We do this during onboarding (white-glove for first 100 customers). Eventually, automated ingestion from POS systems and websites.

---

## 10. The Pitch (One Paragraph)

*Pulse is an AI voice concierge that lets any customer call any business and talk to an agent that knows the entire business AND knows them personally. It solves a universal problem: the interface between customer and business is broken — complex menus, language barriers, intimidation, and missed calls cost businesses billions. Powered by GBrain's persistent memory, Pulse gets better with every interaction — the 50th call is dramatically better than the 1st. Every business gets Fortune 500-level customer intelligence for $99/month, and every customer gets the experience of being a regular at their favorite mom-and-pop shop, everywhere they go. 36 million small businesses in America miss 62% of their calls. We answer every single one.*
