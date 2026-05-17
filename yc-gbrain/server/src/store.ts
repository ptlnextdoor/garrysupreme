import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  companyDefinitions,
  ensureCompanyBrains,
  getCompanies,
  getCompanyCatalog,
  getDemoQueries,
  normalizeCompanyId,
  searchCatalog,
  type CatalogSearchResponse,
  type CompanyId
} from "./catalog.js";
import { loadConvexState, saveConvexState } from "./convex-state.js";
import { syncSponsorEvent } from "./sponsor-sync.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const gbrainDir = path.join(rootDir, "gbrain");
const statePath = path.join(gbrainDir, "state.json");

export type CustomerProfile = {
  id: string;
  companyId: CompanyId;
  phone: string;
  name: string;
  likes: string[];
  avoids: string[];
  style: string;
  language: string;
  lastOrder: string;
  recurringItems: string[];
  budgetThreshold?: number;
  household: Array<{ name: string; notes: string[] }>;
  confidence: number;
};

export type MemoryCandidate = {
  id: string;
  companyId: CompanyId;
  customer: string;
  claim: string;
  evidence: string;
  confidence: number;
  status: "pending" | "approved" | "rejected";
};

export type ActiveCall = {
  id: string;
  companyId: CompanyId;
  customerName: string;
  phone: string;
  startedAt: string;
  status: "ringing" | "context loaded" | "ordering" | "confirmed" | "escalated" | "ended";
  intent: string;
  transcript: string[];
  currentOrder: string[];
  flow?: CallFlow;
};

export type Order = {
  id: string;
  company_id: CompanyId;
  customer_name?: string;
  phone_number?: string;
  items: string[];
  new_preferences: string[];
  confidence: number;
  created_at: string;
};

export type WorkflowEvent = {
  id: string;
  node: "Call" | "Company Brain" | "Customer Brain" | "Catalog Matcher" | "Review Gate" | "Order/Memory Write";
  label: string;
  status: "idle" | "active" | "done" | "review";
  detail: string;
  created_at: string;
};

export type CallFlowMatch = {
  name: string;
  why: string;
  confidence?: number;
  confidence_label?: "high" | "medium" | "low";
  review_reasons?: string[];
  stock?: string;
};

export type CallFlow = {
  language: string;
  request: string;
  companySignals: string[];
  customerSignals: string[];
  matchedItems: CallFlowMatch[];
  decision: "ready-to-order" | "review" | "clarify" | "no-match";
  clarifyingQuestion?: string | null;
  agentReply: string;
  nextAction: string;
};

export type GraphNodeType = "company" | "catalog_item" | "customer" | "preference" | "insight" | "call";

export type GraphLinkKind =
  | "prefers"
  | "orders"
  | "avoids"
  | "hosts"
  | "shops_for"
  | "translated_to"
  | "recommended"
  | "learned_from_call"
  | "related_to";

export type GraphNode = {
  id: string;
  label: string;
  type: GraphNodeType;
  companyId: CompanyId;
  side: "business" | "customer" | "bridge";
  detail: string;
  markdown: string;
  active?: boolean;
  previewForCallId?: string | null;
};

export type GraphLink = {
  id: string;
  source: string;
  target: string;
  kind: GraphLinkKind;
  companyId: CompanyId;
  detail: string;
  active?: boolean;
  previewForCallId?: string | null;
};

export type GraphState = {
  nodes: GraphNode[];
  links: GraphLink[];
  focusCallId: string | null;
  lastMutationAt: string | null;
};

export type State = {
  selectedCompanyId: CompanyId;
  activeCalls: ActiveCall[];
  customers: Record<string, CustomerProfile>;
  memoryCandidates: MemoryCandidate[];
  orders: Order[];
  workflowEvents: WorkflowEvent[];
  lastSearch: CatalogSearchResponse | null;
  graph: GraphState;
};

let writeQueue: Promise<unknown> = Promise.resolve();

const costcoHouseholdCustomer: CustomerProfile = {
  id: "aarya-costco-household",
  companyId: "costco",
  phone: "+17028619093",
  name: "Aarya",
  likes: ["Executive member", "Kirkland Signature", "organic produce", "almond milk", "salmon", "kids lunchbox snacks", "Apple ecosystem"],
  avoids: ["dairy", "highly processed kids snacks", "non-organic produce when an organic option exists"],
  style: "direct and friendly Costco member, mixes quick fill-in trips with big monthly household hauls",
  language: "English, Hindi/Hinglish supported",
  lastOrder: "Two Costco rotisserie chickens for game night, almond milk, berries, cauliflower pizza, and bath tissue",
  recurringItems: ["Kirkland almond milk", "Kirkland organic coffee", "salmon fillets", "Goldfish variety pack", "Kirkland bath tissue", "Kirkland paper towels"],
  budgetThreshold: 500,
  household: [
    {
      name: "Mom",
      notes: ["Vitamin D3 supplements", "Kirkland cold brew coffee", "Stanley tumbler gifts", "prefers premium staples"]
    },
    {
      name: "Partner",
      notes: ["Apple and tech deals", "organic chicken", "air fryer-friendly foods", "giftable electronics"]
    },
    {
      name: "Kids, ages 5 and 8",
      notes: ["Goldfish crackers", "Welch's fruit snacks", "granola bars", "organic bananas", "blueberries", "avoid overly processed snacks when possible"]
    }
  ],
  confidence: 0.94
};

const costcoOfficeCustomer: CustomerProfile = {
  id: "office-manager",
  companyId: "costco",
  phone: "+15551234567",
  name: "Maya Patel",
  likes: ["Kirkland", "office", "breakroom", "value", "healthy snacks"],
  avoids: ["peanuts for team events"],
  style: "concise office manager, wants clear review reasons",
  language: "English, Hindi/Hinglish supported",
  lastOrder: "Kirkland water, coffee cups, granola bars, paper towels, disinfecting wipes",
  recurringItems: ["Kirkland water", "coffee cups", "paper towels", "trash bags", "disinfecting wipes", "granola bars"],
  budgetThreshold: 250,
  household: [
    {
      name: "Office team",
      notes: ["default headcount 35", "two gluten-free snack options preferred", "avoid peanuts for shared snacks"]
    }
  ],
  confidence: 0.91
};

const starbucksCustomer: CustomerProfile = {
  id: "aayushya-starbucks",
  companyId: "starbucks",
  phone: "+15557654321",
  name: "Aayushya",
  likes: ["masala chai flavor", "extra spice", "sweet hot drinks", "Hindi/Hinglish comfort", "plain English translation when needed"],
  avoids: ["dairy"],
  style: "Hindi-friendly, wants Starbucks translated into plain language and home-style chai guidance",
  language: "Hindi/Hinglish preferred, English okay",
  lastOrder: "Grande hot chai latte with extra spice, ordered in Hindi",
  recurringItems: ["grande chai latte", "extra spice", "hot sweet chai"],
  budgetThreshold: 35,
  household: [
    {
      name: "Emma",
      notes: ["Grande Strawberry Acai Lemonade", "light ice"]
    }
  ],
  confidence: 0.9
};

const newCustomer: CustomerProfile = {
  id: "new-customer",
  companyId: "costco",
  phone: "unknown",
  name: "new customer",
  likes: [],
  avoids: [],
  style: "simple and friendly",
  language: "English, Hindi/Hinglish supported",
  lastOrder: "none yet",
  recurringItems: [],
  household: [],
  confidence: 0
};

const seededCostcoHostingFlow: CallFlow = {
  language: "en",
  request: "Actually hosting 15 people Saturday, mostly vegetarian.",
  companySignals: [
    "Costco party-size packaging and pantry/bakery/frozen event coverage",
    "Saturday hosting plan should include a stock check before committing perishables"
  ],
  customerSignals: [
    "Returning customer last bought rotisserie chickens for game night",
    "Event size is 15 guests and mostly vegetarian"
  ],
  matchedItems: [
    {
      name: "Spinach artichoke dip tray",
      why: "Vegetarian appetizer for a crowd with minimal prep",
      confidence: 0.95,
      confidence_label: "high",
      review_reasons: ["closest-warehouse stock check"],
      stock: "check nearest Costco"
    },
    {
      name: "Four pound berries",
      why: "Simple fruit side that scales well for 15 guests",
      confidence: 0.91,
      confidence_label: "high",
      review_reasons: ["weekend produce availability"],
      stock: "check nearest Costco"
    },
    {
      name: "Cauliflower pizza two pack",
      why: "Vegetarian main that fits the hosting brief quickly",
      confidence: 0.88,
      confidence_label: "medium",
      review_reasons: ["frozen inventory check"],
      stock: "check nearest Costco"
    }
  ],
  decision: "review",
  clarifyingQuestion: "Want me to check stock at your closest Costco?",
  agentReply: "Got it, switching it up. Spinach artichoke dip tray, the four pound berries, cauliflower pizza two pack. Covers app, fruit, main. Want me to check stock at your closest Costco?",
  nextAction: "Await stock-check approval before finalizing the basket."
};

const seededStarbucksHindiFlow: CallFlow = {
  language: "hi",
  request: "Mujhe India jaisi chai chahiye, spicy, sweet, hot, bilkul ghar jaisi.",
  companySignals: [
    "Translate a home-style chai request into the closest Starbucks hot chai build",
    "Stay in Hindi/Hinglish and avoid jargon unless it helps close the order"
  ],
  customerSignals: [
    "Caller explicitly feels more comfortable speaking Hindi",
    "Preference is spicy, sweet, hot chai that feels like home"
  ],
  matchedItems: [
    {
      name: "Grande Chai Latte",
      why: "Closest standard Starbucks drink to a sweet hot chai base",
      confidence: 0.96,
      confidence_label: "high",
      review_reasons: [],
      stock: "standard menu item"
    },
    {
      name: "Extra spice customization",
      why: "Pushes the flavor closer to masala chai expectations",
      confidence: 0.9,
      confidence_label: "high",
      review_reasons: [],
      stock: "modifier availability may vary by store"
    }
  ],
  decision: "ready-to-order",
  clarifyingQuestion: null,
  agentReply: "Bilkul. Lagta hai aapko ek grande chai latte extra spice ke saath chahiye. Kya main woh order kar doon?",
  nextAction: "Order is ready to place after the caller's yes."
};

function seededActiveCalls(now = Date.now()): ActiveCall[] {
  return [
    {
      id: "call_live_costco",
      companyId: "costco",
      customerName: "Aarya",
      phone: "+17028619093",
      startedAt: new Date(now).toISOString(),
      status: "ordering",
      intent: "Hosting 15 people Saturday, mostly vegetarian",
      transcript: [
        "Hey, welcome back. Last time you grabbed the rotisserie chickens for game night. Doing something similar?",
        "Actually hosting 15 people Saturday, mostly vegetarian.",
        "Got it, switching it up. Spinach artichoke dip tray, the four pound berries, cauliflower pizza two pack. Covers app, fruit, main. Want me to check stock at your closest Costco?",
        "Awesome!"
      ],
      currentOrder: ["Spinach artichoke dip tray", "Four pound berries", "Cauliflower pizza two pack"],
      flow: seededCostcoHostingFlow
    },
    {
      id: "call_live_costco_office",
      companyId: "costco",
      customerName: "Maya Patel",
      phone: "+15551234567",
      startedAt: new Date(now - 30_000).toISOString(),
      status: "context loaded",
      intent: "Ready for Costco office-event demo",
      transcript: ["Pulse: Office-event customer brain is ready for Maya."],
      currentOrder: []
    },
    {
      id: "call_live_starbucks",
      companyId: "starbucks",
      customerName: "Aayushya",
      phone: "+15557654321",
      startedAt: new Date(now - 45_000).toISOString(),
      status: "confirmed",
      intent: "Hindi chai translation demo",
      transcript: [
        "Hey, this is Starbucks, how can I help?",
        "Hi, I feel easier talking in Hindi, can I order in Hindi?",
        "Bilkul, aap Hindi mein order kar sakte hain. Main kaise help karun?",
        "Mujhe India jaisi chai chahiye, spicy, sweet, hot, bilkul ghar jaisi.",
        "Bilkul. Lagta hai aapko ek grande chai latte extra spice ke saath chahiye. Kya main woh order kar doon?",
        "Yes."
      ],
      currentOrder: ["Grande Chai Latte", "Extra spice"],
      flow: seededStarbucksHindiFlow
    },
    {
      id: "call_live_review",
      companyId: "costco",
      customerName: "Community event",
      phone: "+15555550109",
      startedAt: new Date(now - 90_000).toISOString(),
      status: "escalated",
      intent: "Food and supplies for 80-person breakfast",
      transcript: ["Pulse: Large perishable community event needs review for timing and dietary details."],
      currentOrder: []
    }
  ];
}

function initialState(companyId: CompanyId = "costco"): State {
  const activeCalls = seededActiveCalls();
  const state: State = {
    selectedCompanyId: companyId,
    activeCalls,
    customers: {
      [costcoHouseholdCustomer.id]: costcoHouseholdCustomer,
      [costcoOfficeCustomer.id]: costcoOfficeCustomer,
      [starbucksCustomer.id]: starbucksCustomer,
      [newCustomer.id]: newCustomer
    },
    memoryCandidates: [
      {
        id: "mem_costco_household",
        companyId: "costco",
        customer: "Aarya",
        claim: "Customer has a household of four and wants Mom, partner, and kids preferences remembered separately.",
        evidence: "Aarya PR #6 Costco household customer brain seed.",
        confidence: 0.9,
        status: "pending"
      },
      {
        id: "mem_costco_budget",
        companyId: "costco",
        customer: "Maya Patel",
        claim: "Customer prefers Kirkland/private-label substitutions when an office order risks exceeding $250.",
        evidence: "Research default plus seeded office manager customer brain.",
        confidence: 0.84,
        status: "pending"
      },
      {
        id: "mem_starbucks_plain_english",
        companyId: "starbucks",
        customer: "Aayushya",
        claim: "Customer prefers Hindi/Hinglish ordering support and home-style spicy hot chai guidance.",
        evidence: "Seeded Starbucks Hindi comfort demo for live calls.",
        confidence: 0.88,
        status: "pending"
      }
    ],
    orders: [
      {
        id: "seed_costco_household_1",
        company_id: "costco",
        customer_name: "Aarya",
        phone_number: "+17028619093",
        items: ["Kirkland almond milk", "salmon fillets", "Goldfish variety pack", "Kirkland bath tissue"],
        new_preferences: [],
        confidence: 0.94,
        created_at: new Date(Date.now() - 5 * 60 * 60_000).toISOString()
      },
      {
        id: "seed_costco_1",
        company_id: "costco",
        customer_name: "Maya Patel",
        phone_number: "+15551234567",
        items: ["Kirkland water", "coffee cups", "granola bars", "paper towels"],
        new_preferences: [],
        confidence: 0.91,
        created_at: new Date(Date.now() - 4 * 60 * 60_000).toISOString()
      },
      {
        id: "seed_starbucks_1",
        company_id: "starbucks",
        customer_name: "Aayushya",
        phone_number: "+15557654321",
        items: ["Grande chai latte", "Extra spice"],
        new_preferences: [],
        confidence: 0.9,
        created_at: new Date(Date.now() - 2 * 60 * 60_000).toISOString()
      }
    ],
    workflowEvents: workflowTemplate(),
    lastSearch: null,
    graph: initialGraphState(activeCalls)
  };

  const seededCostcoCall = activeCalls.find((call) => call.id === "call_live_costco");
  if (seededCostcoCall?.flow) {
    previewGraphForCall(state, {
      call: seededCostcoCall,
      companyId: "costco",
      customer: costcoHouseholdCustomer,
      request: seededCostcoCall.flow.request,
      language: "en",
      result: catalogSearchFromFlow("costco", seededCostcoCall.flow),
      flow: seededCostcoCall.flow
    });
  }

  const seededStarbucksCall = activeCalls.find((call) => call.id === "call_live_starbucks");
  if (seededStarbucksCall?.flow) {
    previewGraphForCall(state, {
      call: seededStarbucksCall,
      companyId: "starbucks",
      customer: starbucksCustomer,
      request: seededStarbucksCall.flow.request,
      language: "hi",
      result: catalogSearchFromFlow("starbucks", seededStarbucksCall.flow),
      flow: seededStarbucksCall.flow
    });
    commitGraphForCall(state, seededStarbucksCall.id, {
      companyId: "starbucks",
      customer: starbucksCustomer,
      call: seededStarbucksCall,
      order: {
        id: "seed_starbucks_graph_commit",
        company_id: "starbucks",
        customer_name: "Aayushya",
        phone_number: seededStarbucksCall.phone,
        items: seededStarbucksCall.currentOrder,
        new_preferences: [],
        confidence: 0.96,
        created_at: seededStarbucksCall.startedAt
      }
    });
  }

  return state;
}

async function ensureDirs() {
  await mkdir(path.join(gbrainDir, "companies"), { recursive: true });
  await mkdir(path.join(gbrainDir, "customers"), { recursive: true });
  await mkdir(path.join(gbrainDir, "orders"), { recursive: true });
  await ensureCompanyBrains(gbrainDir);
}

export async function loadState(): Promise<State> {
  await ensureDirs();

  const convexState = await loadConvexState();
  if (convexState) return migrateState(convexState);

  try {
    const raw = await readFile(statePath, "utf8");
    return migrateState(JSON.parse(raw) as Partial<State>);
  } catch (error) {
    if (isNotFound(error)) {
      const state = initialState("costco");
      await saveState(state);
      await writeBrainMarkdown(state);
      return structuredClone(state);
    }

    console.error("Failed to load Pulse state", error);
    throw error;
  }
}

async function saveState(state: State) {
  await ensureDirs();
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  await saveConvexState(state);
}

function isNotFound(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

async function updateState<T>(mutate: (state: State) => Promise<T> | T): Promise<T> {
  const run = async () => {
    const state = await loadState();
    const result = await mutate(state);
    await saveState(state);
    await writeBrainMarkdown(state);
    return result;
  };

  const result = writeQueue.then(run, run);
  writeQueue = result.catch(() => undefined);
  return result;
}

export async function getDashboard() {
  const state = await loadState();
  const selectedCompanyId = state.selectedCompanyId;
  const catalog = await getCompanyCatalog(selectedCompanyId);
  const companies = await getCompanies();
  const demoQueries = await getDemoQueries(selectedCompanyId);
  const companyOrders = state.orders.filter((order) => order.company_id === selectedCompanyId);
  const orderRevenue = companyOrders.reduce((total, order) => total + estimateOrderValue(order), 0);
  const company = {
    ...companyDefinitions[selectedCompanyId],
    catalogCount: catalog.length,
    sampleItems: catalog.slice(0, 8)
  };

  return {
    selectedCompanyId,
    companies,
    company,
    activeCalls: state.activeCalls.filter((call) => call.companyId === selectedCompanyId),
    allActiveCalls: state.activeCalls,
    customers: Object.values(state.customers).filter((customer) => customer.companyId === selectedCompanyId || customer.id === "new-customer"),
    memoryCandidates: state.memoryCandidates.filter((candidate) => candidate.companyId === selectedCompanyId),
    orders: companyOrders,
    workflowEvents: state.workflowEvents,
    lastSearch: state.lastSearch?.company_id === selectedCompanyId ? state.lastSearch : null,
    graph: graphSnapshot(state.graph),
    demoQueries,
    metrics: {
      activeCalls: state.activeCalls.filter((call) => call.companyId === selectedCompanyId).length,
      ordersConfirmed: companyOrders.length,
      humanEscalations: state.activeCalls.filter((call) => call.companyId === selectedCompanyId && call.status === "escalated").length,
      recoveredRevenueToday: Math.round(orderRevenue + (selectedCompanyId === "costco" ? 420 : 58))
    }
  };
}

export async function listCompanies() {
  return getCompanies();
}

export async function searchCompanyCatalog(companyIdInput: unknown, query: string, customerId?: string) {
  const companyId = normalizeCompanyId(companyIdInput);
  return updateState(async (state) => {
    state.selectedCompanyId = companyId;
    const customer = customerId ? state.customers[customerId] : primaryCustomer(state, companyId);
    pushWorkflow(state, "Company Brain", "done", `${companyDefinitions[companyId].name} brain loaded`, companyDefinitions[companyId].catalogLabel);
    pushWorkflow(state, "Customer Brain", "done", `${customer.name} profile loaded`, customer.lastOrder);
    const result = await searchCatalog({ companyId, query, customer });
    state.lastSearch = result;
    const call = activeCallFor(state, companyId, "");
    if (call) {
      call.flow = flowFromSearch({
        companyName: companyDefinitions[companyId].name,
        customer,
        language: "en",
        request: query,
        result
      });
      previewGraphForCall(state, {
        call,
        companyId,
        customer,
        request: query,
        language: "en",
        result,
        flow: call.flow
      });
    }
    pushWorkflow(state, "Catalog Matcher", "done", `${result.results.length} matches`, `${result.decision} · ${result.meta.latency_ms}ms`);
    pushWorkflow(state, "Review Gate", result.decision === "ready-to-order" ? "done" : "review", result.decision, result.meta.clarifying_question ?? "No clarifying question needed");
    return result;
  });
}

export async function getContext(companyIdInput: unknown, phoneNumber: string, request: string, language: "en" | "hi" = "en") {
  const companyId = normalizeCompanyId(companyIdInput);
  return updateState(async (state) => {
    state.selectedCompanyId = companyId;
    const customer = customerForPhone(state, companyId, phoneNumber);
    const company = companyDefinitions[companyId];
    const result = await searchCatalog({ companyId, query: request, customer });
    state.lastSearch = result;

    const call = activeCallFor(state, companyId, phoneNumber);
    if (call) {
      call.status = "context loaded";
      call.intent = request || call.intent;
      call.transcript.push(`Caller: ${request || "Asked for help."}`);
      call.transcript.push(`Pulse: Loaded separate ${company.name} Company Brain + ${customer.name} Customer Brain (${language}).`);
      call.transcript.push(`Pulse: Catalog Matcher decision is ${result.decision}.`);
      call.flow = flowFromSearch({
        companyName: company.name,
        customer,
        language,
        request,
        result
      });
      previewGraphForCall(state, {
        call,
        companyId,
        customer,
        request,
        language,
        result,
        flow: call.flow
      });
    }

    pushWorkflow(state, "Call", "done", `${company.name} inbound request`, request || "No request text");
    pushWorkflow(state, "Company Brain", "done", `${company.name} Company Brain`, `${result.meta.catalog_count} catalog rows`);
    pushWorkflow(state, "Customer Brain", "done", `${customer.name} Customer Brain`, customer.lastOrder);
    pushWorkflow(state, "Catalog Matcher", "done", `${result.results.length} ranked matches`, result.results[0]?.name ?? "No match");
    pushWorkflow(state, "Review Gate", result.decision === "ready-to-order" ? "done" : "review", result.decision, result.meta.clarifying_question ?? "Ready after confirmation");

    return {
      customer: {
        ...customer,
        sourceMarkdown: await readCustomerMarkdown(customer.id)
      },
      company: {
        ...company,
        catalogCount: result.meta.catalog_count,
        sourceMarkdown: await readCompanyMarkdown(companyId)
      },
      session: {
        request,
        language,
        language_instruction: language === "hi"
          ? "Respond in Hindi/Hinglish. Keep product names, SKUs, company names, and sizes in English."
          : "Respond in English unless the caller switches languages.",
        safety: "Official facts and seeded demo data are separated. Review strict allergy, local stock, timing, and high-spend requests.",
        matches: result.results,
        decision: result.decision,
        clarifying_question: result.meta.clarifying_question
      }
    };
  });
}

export async function saveOrder(input: {
  company_id?: unknown;
  customer_name?: string;
  phone_number?: string;
  items?: string[];
  new_preferences?: string[];
  confidence?: number;
}) {
  const companyId = normalizeCompanyId(input.company_id);
    const order = await updateState((state) => {
    state.selectedCompanyId = companyId;
    const nextOrder: Order = {
      id: `order_${Date.now()}`,
      company_id: companyId,
      customer_name: input.customer_name ?? primaryCustomer(state, companyId).name,
      phone_number: input.phone_number,
      items: input.items ?? [],
      new_preferences: input.new_preferences ?? [],
      confidence: input.confidence ?? 0.7,
      created_at: new Date().toISOString()
    };

    state.orders.unshift(nextOrder);
    const call = activeCallFor(state, companyId, input.phone_number ?? "");
    if (call) {
      call.status = "confirmed";
      call.currentOrder = nextOrder.items;
      call.transcript.push(`Pulse: Confirmed ${nextOrder.items.join(" and ")}.`);
      call.flow = {
        ...(call.flow ?? flowFromOrderFallback(state, companyId, nextOrder)),
        decision: "ready-to-order",
        agentReply: `Confirmed ${nextOrder.items.join(", ")}.`,
        nextAction: nextOrder.new_preferences.length
          ? `Order saved and ${nextOrder.new_preferences.length} memory candidate(s) queued.`
          : "Order saved."
      };
      commitGraphForCall(state, call.id, {
        companyId,
        customer: customerForGraph(state, companyId, nextOrder.customer_name, input.phone_number),
        call,
        order: nextOrder
      });
    }

    for (const preference of nextOrder.new_preferences) {
      state.memoryCandidates.unshift({
        id: `mem_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        companyId,
        customer: nextOrder.customer_name ?? "unknown customer",
        claim: preference,
        evidence: `Learned from confirmed ${companyDefinitions[companyId].name} order ${nextOrder.id}.`,
        confidence: nextOrder.confidence,
        status: "pending"
      });
      commitPreferenceToGraph(state, {
        companyId,
        customer: customerForGraph(state, companyId, nextOrder.customer_name, input.phone_number),
        preference,
        confidence: nextOrder.confidence,
        callId: call?.id ?? null
      });
    }

    pushWorkflow(state, "Order/Memory Write", "done", "Order saved", `${nextOrder.items.length} items · ${nextOrder.new_preferences.length} memory candidates`);
    return nextOrder;
  });

  const md = [
    `# ${order.id}`,
    "",
    `Company: ${companyDefinitions[order.company_id].name}`,
    `Customer: ${order.customer_name}`,
    `Phone: ${order.phone_number ?? "unknown"}`,
    `Created: ${order.created_at}`,
    `Confidence: ${order.confidence}`,
    "",
    "## Items",
    ...order.items.map((item) => `- ${item}`),
    "",
    "## New Preferences",
    ...(order.new_preferences.length ? order.new_preferences.map((pref) => `- ${pref}`) : ["- none"])
  ].join("\n");
  await writeFile(path.join(gbrainDir, "orders", `${order.id}.md`), `${md}\n`);
  void syncSponsorEvent({
    type: "order_saved",
    companyId: order.company_id,
    payload: order,
    createdAt: order.created_at
  });

  return order;
}

export async function approveMemory(id: string) {
  return updateState((state) => {
    const memory = state.memoryCandidates.find((candidate) => candidate.id === id);
    if (!memory) return null;
    memory.status = "approved";

    const customer = primaryCustomer(state, memory.companyId);
    const normalized = normalizeMemoryClaim(memory.claim);
    if (!customer.likes.includes(normalized)) customer.likes.push(normalized);
    customer.confidence = Math.min(0.99, customer.confidence + 0.01);
    commitPreferenceToGraph(state, {
      companyId: memory.companyId,
      customer: customerByName(state, memory.companyId, memory.customer) ?? customer,
      preference: normalized,
      confidence: memory.confidence,
      callId: state.graph.focusCallId
    });
    pushWorkflow(state, "Order/Memory Write", "done", "Memory approved", memory.claim);
    void syncSponsorEvent({
      type: "memory_approved",
      companyId: memory.companyId,
      payload: memory
    });
    return memory;
  });
}

export async function rejectMemory(id: string) {
  return updateState((state) => {
    const memory = state.memoryCandidates.find((candidate) => candidate.id === id);
    if (!memory) return null;
    memory.status = "rejected";
    discardPreviewPreference(state, memory.companyId, memory.claim);
    pushWorkflow(state, "Order/Memory Write", "review", "Memory rejected", memory.claim);
    return memory;
  });
}

export async function learnPreference(customerName: string, preference: string, confidence: number, companyIdInput: unknown = "costco") {
  const companyId = normalizeCompanyId(companyIdInput);
  return updateState((state) => {
    const memory: MemoryCandidate = {
      id: `mem_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      companyId,
      customer: customerName,
      claim: preference,
      evidence: "Manually learned from demo endpoint.",
      confidence,
      status: "pending"
    };
    state.memoryCandidates.unshift(memory);
    commitPreferenceToGraph(state, {
      companyId,
      customer: customerByName(state, companyId, customerName) ?? primaryCustomer(state, companyId),
      preference,
      confidence,
      callId: state.graph.focusCallId
    });
    pushWorkflow(state, "Order/Memory Write", "done", "Memory candidate created", preference);
    return memory;
  });
}

export async function recordVapiLifecycle(input: {
  event: string;
  status?: unknown;
  company_id?: unknown;
  call_id?: string;
  phone_number?: string;
  customer_name?: string;
}) {
  const lifecycle = classifyVapiLifecycleEvent(input.event, input.status);
  const event = lifecycle.event;
  const companyId = normalizeCompanyId(input.company_id);
  const isStart = lifecycle.isStart;
  const isEnd = lifecycle.isEnd;
  if (!isStart && !isEnd) return null;

  return updateState((state) => {
    state.selectedCompanyId = companyId;
    const phone = input.phone_number || "unknown";
    const customer = input.customer_name
      ? Object.values(state.customers).find((candidate) => candidate.companyId === companyId && candidate.name === input.customer_name)
      : customerForPhone(state, companyId, phone);
    const callId = input.call_id ? `vapi_${input.call_id}` : `vapi_${companyId}_${phone.replace(/\W+/g, "") || Date.now()}`;
    let call = state.activeCalls.find((candidate) => candidate.id === callId);

    if (!call && isStart) {
      call = {
        id: callId,
        companyId,
        customerName: customer?.name ?? input.customer_name ?? "Caller",
        phone,
        startedAt: new Date().toISOString(),
        status: "ringing",
        intent: `${companyDefinitions[companyId].name} live Vapi call`,
        transcript: [`Vapi: ${input.event}`],
        currentOrder: []
      };
      state.activeCalls.unshift(call);
      ensureCallNode(state.graph, call);
    }

    if (!call) return null;
    if (isStart) {
      call.status = "ringing";
      call.phone = phone;
      call.customerName = customer?.name ?? call.customerName;
      call.transcript.push(`Vapi: ${input.event}`);
      touchGraph(state.graph, call.id);
      setGraphNodeActive(state.graph, callNodeId(call.id), true);
      pushWorkflow(state, "Call", "active", "Vapi call lifecycle", `${call.customerName} · ${input.event}`);
    }
    if (isEnd) {
      call.status = "ended";
      call.transcript.push(`Vapi: ${input.event}`);
      commitGraphForCall(state, call.id, {
        companyId,
        customer: customer ?? primaryCustomer(state, companyId),
        call
      });
      pushWorkflow(state, "Call", "done", "Vapi call ended", call.customerName);
    }
    void syncSponsorEvent({
      type: "vapi_lifecycle",
      companyId,
      payload: { event: input.event, call }
    });
    return call;
  });
}

export function classifyVapiLifecycleEvent(eventInput: unknown, statusInput?: unknown) {
  const event = String(eventInput ?? "unknown").toLowerCase();
  const status = String(statusInput ?? "").toLowerCase();
  const statusUpdate = event.includes("status-update");
  const isEnd = event.includes("end-of-call-report") ||
    event.includes("call-end") ||
    event.includes("call_ended") ||
    event.includes("ended") ||
    ["ended", "completed", "failed"].includes(status);
  const isStart = !isEnd && (
    event.includes("call-start") ||
    event.includes("call_started") ||
    event.includes("in-progress") ||
    (statusUpdate && (!status || ["queued", "ringing", "in-progress", "started"].includes(status)))
  );

  return { event, status, isStart, isEnd };
}

export async function startDemoCall(companyIdInput: unknown = "costco") {
  const companyId = normalizeCompanyId(companyIdInput);
  return updateState((state) => {
    state.selectedCompanyId = companyId;
    const call = activeCallFor(state, companyId, "");
    if (!call) return null;
    call.startedAt = new Date().toISOString();
    call.status = "ringing";
    call.intent = companyId === "costco" ? "Incoming Costco office-event call" : "Incoming Starbucks menu-translation call";
    call.currentOrder = [];
    call.transcript = [`Pulse: Incoming call for ${companyDefinitions[companyId].name}.`];
    ensureCallNode(state.graph, call);
    touchGraph(state.graph, call.id);
    setGraphNodeActive(state.graph, callNodeId(call.id), true);
    state.workflowEvents = workflowTemplate();
    pushWorkflow(state, "Call", "active", "Inbound call started", companyDefinitions[companyId].name);
    return call;
  });
}

export async function endDemoCall(companyIdInput: unknown = "costco") {
  const companyId = normalizeCompanyId(companyIdInput);
  return updateState((state) => {
    const call = activeCallFor(state, companyId, "");
    if (!call) return null;
    call.status = "ended";
    call.transcript.push("Pulse: Call ended.");
    commitGraphForCall(state, call.id, {
      companyId,
      customer: customerForGraph(state, companyId, call.customerName, call.phone),
      call
    });
    return call;
  });
}

export async function resetDemo(companyIdInput: unknown = "costco") {
  const companyId = normalizeCompanyId(companyIdInput);
  const state = initialState(companyId);
  await saveState(state);
  await writeBrainMarkdown(state);
  return getDashboard();
}

async function writeBrainMarkdown(state: State) {
  for (const customer of Object.values(state.customers)) {
    if (customer.id === "new-customer") continue;
    const md = [
      `# ${customer.name} Customer Brain`,
      "",
      `Company: ${companyDefinitions[customer.companyId].name}`,
      `Phone: ${customer.phone}`,
      `Language: ${customer.language}`,
      `Communication style: ${customer.style}`,
      `Confidence: ${customer.confidence}`,
      customer.budgetThreshold ? `Budget threshold: ${customer.budgetThreshold}` : "",
      "",
      "## Likes",
      ...customer.likes.map((like) => `- ${like}`),
      "",
      "## Avoids",
      ...customer.avoids.map((avoid) => `- ${avoid}`),
      "",
      "## Recurring Items",
      ...customer.recurringItems.map((item) => `- ${item}`),
      "",
      "## Last Order",
      customer.lastOrder,
      "",
      "## Household Or Team",
      ...customer.household.map((member) => `- ${member.name}: ${member.notes.join("; ")}`)
    ].filter((line) => line !== "").join("\n");

    await writeFile(path.join(gbrainDir, "customers", `${customer.companyId}-${customer.id}.md`), `${md}\n`);
  }
}

async function readCompanyMarkdown(companyId: CompanyId) {
  try {
    return await readFile(path.join(gbrainDir, "companies", companyId, "company.md"), "utf8");
  } catch {
    return "";
  }
}

async function readCustomerMarkdown(id: string) {
  try {
    const state = await loadState();
    const customer = state.customers[id];
    if (!customer) return "";
    return await readFile(path.join(gbrainDir, "customers", `${customer.companyId}-${customer.id}.md`), "utf8");
  } catch {
    return "";
  }
}

function migrateState(input: Partial<State>): State {
  const fallback = initialState(normalizeCompanyId(input.selectedCompanyId));
  const fallbackCalls = new Map(fallback.activeCalls.map((call) => [call.id, call]));
  const inputCalls = Array.isArray(input.activeCalls) ? input.activeCalls as ActiveCall[] : [];
  const mergedCalls = fallback.activeCalls.map((fallbackCall) => {
    const existing = inputCalls.find((candidate) => candidate.id === fallbackCall.id);
    if (!existing) return fallbackCall;
    const preserveExistingFlow = Boolean(existing.flow);
    return {
      ...fallbackCall,
      ...existing,
      transcript: preserveExistingFlow ? existing.transcript : fallbackCall.transcript,
      currentOrder: preserveExistingFlow ? existing.currentOrder : fallbackCall.currentOrder,
      flow: existing.flow ?? fallbackCall.flow
    };
  }).concat(
    inputCalls.filter((call) => !fallbackCalls.has(call.id))
  );
  return {
    ...fallback,
    ...input,
    selectedCompanyId: normalizeCompanyId(input.selectedCompanyId),
    customers: {
      ...fallback.customers,
      ...(input.customers ?? {})
    },
    activeCalls: mergedCalls,
    memoryCandidates: Array.isArray(input.memoryCandidates) && input.memoryCandidates.every((memory) => "companyId" in memory) ? input.memoryCandidates : fallback.memoryCandidates,
    orders: Array.isArray(input.orders) && input.orders.every((order) => "company_id" in order) ? input.orders : fallback.orders,
    workflowEvents: input.workflowEvents?.length ? input.workflowEvents : fallback.workflowEvents,
    lastSearch: input.lastSearch ?? null,
    graph: isGraphState(input.graph) ? migrateGraph(input.graph, mergedCalls) : fallback.graph
  };
}

function primaryCustomer(state: State, companyId: CompanyId) {
  return Object.values(state.customers).find((customer) => customer.companyId === companyId && customer.id !== "new-customer") ?? state.customers["new-customer"];
}

function customerForPhone(state: State, companyId: CompanyId, phoneNumber: string) {
  const demoMatch = process.env.DEMO_PHONE_MATCH ?? "YOUR_NUMBER";
  const demoPhone = process.env.DEMO_PHONE;
  const normalized = phoneNumber || "unknown";
  const digits = normalized.replace(/\D/g, "");
  if (demoPhone && digits === demoPhone.replace(/\D/g, "")) return primaryCustomer(state, companyId);
  if (demoPhone && process.env.DEMO_PHONE_FALLBACK_TO_PRIMARY !== "false" && digits.length >= 7) return primaryCustomer(state, companyId);
  if (normalized.includes(demoMatch) || normalized.includes("1234567")) return primaryCustomer(state, companyId);
  return Object.values(state.customers).find((customer) => customer.companyId === companyId && customer.phone === normalized) ?? state.customers["new-customer"];
}

function activeCallFor(state: State, companyId: CompanyId, phoneNumber: string) {
  return (
    state.activeCalls.find((call) => call.companyId === companyId && phoneNumber && call.phone === phoneNumber) ??
    state.activeCalls.find((call) => call.companyId === companyId)
  );
}

function pushWorkflow(state: State, node: WorkflowEvent["node"], status: WorkflowEvent["status"], label: string, detail: string) {
  state.workflowEvents = [
    {
      id: `wf_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      node,
      label,
      status,
      detail,
      created_at: new Date().toISOString()
    },
    ...state.workflowEvents
  ].slice(0, 24);
}

function flowFromSearch(input: {
  companyName: string;
  customer: CustomerProfile;
  language: "en" | "hi";
  request: string;
  result: CatalogSearchResponse;
}): CallFlow {
  const topSignals = [
    input.customer.lastOrder,
    ...input.customer.likes.slice(0, 2)
  ].filter(Boolean);

  return {
    language: input.language,
    request: input.request,
    companySignals: [
      `${input.companyName} company brain loaded`,
      `Catalog size: ${input.result.meta.catalog_count} rows`
    ],
    customerSignals: topSignals,
    matchedItems: input.result.results.slice(0, 5).map((match) => ({
      name: match.name,
      why: match.match_evidence[0] ?? match.category,
      confidence: match.confidence,
      confidence_label: match.confidence_label,
      review_reasons: match.review_reasons,
      stock: match.stock_seed
    })),
    decision: input.result.decision,
    clarifyingQuestion: input.result.meta.clarifying_question,
    agentReply: input.result.meta.clarifying_question ?? `Best match: ${input.result.results[0]?.name ?? "No match found."}`,
    nextAction: input.result.decision === "ready-to-order"
      ? "Ready to save the order."
      : input.result.decision === "review"
        ? "Needs confirmation or review before ordering."
        : input.result.decision === "clarify"
          ? "Ask a clarifying question before ordering."
          : "No safe match yet."
  };
}

function flowFromOrderFallback(state: State, companyId: CompanyId, order: Order): CallFlow {
  const customer = primaryCustomer(state, companyId);
  return {
    language: "en",
    request: order.items.join(", "),
    companySignals: [`${companyDefinitions[companyId].name} order save path`],
    customerSignals: [customer.lastOrder],
    matchedItems: order.items.map((item) => ({
      name: item,
      why: "Confirmed item in the saved order"
    })),
    decision: "ready-to-order",
    clarifyingQuestion: null,
    agentReply: `Confirmed ${order.items.join(", ")}.`,
    nextAction: "Order saved."
  };
}

function catalogSearchFromFlow(companyId: CompanyId, flow: CallFlow): CatalogSearchResponse {
  return {
    company_id: companyId,
    query: flow.request,
    results: flow.matchedItems.map((match, index) => ({
      rank: index + 1,
      sku: `${companyId}_${slugify(match.name)}_${index + 1}`,
      catalog_id: `${companyId}_${slugify(match.name)}_${index + 1}`,
      name: match.name,
      description: match.why,
      category: "Seeded demo graph match",
      score: match.confidence ?? 0.9,
      confidence: match.confidence ?? 0.9,
      confidence_label: match.confidence_label ?? "high",
      personalized: index === 0,
      personalization_note: index === 0 ? flow.customerSignals[0] ?? null : null,
      match_evidence: [match.why],
      review_reasons: match.review_reasons ?? [],
      can_auto_order: flow.decision === "ready-to-order",
      stock_seed: match.stock?.includes("out")
        ? "out_of_stock"
        : match.stock?.includes("low")
          ? "low_stock"
          : match.stock?.includes("check") || match.stock?.includes("location")
            ? "location_required"
            : "in_stock",
      price_band_seed: "seeded"
    })),
    decision: flow.decision,
    meta: {
      catalog_count: flow.matchedItems.length,
      latency_ms: 112,
      low_confidence_overall: flow.matchedItems.some((match) => (match.confidence ?? 0) < 0.8),
      ambiguous_query: flow.decision !== "ready-to-order" && flow.matchedItems.length > 1,
      review_required: flow.decision !== "ready-to-order",
      clarifying_question: flow.clarifyingQuestion ?? null
    }
  };
}


function workflowTemplate(): WorkflowEvent[] {
  return (["Call", "Company Brain", "Customer Brain", "Catalog Matcher", "Review Gate", "Order/Memory Write"] as WorkflowEvent["node"][]).map((node) => ({
    id: `wf_seed_${node.replace(/\W+/g, "_")}`,
    node,
    label: "Waiting",
    status: "idle",
    detail: "Node will light up from real backend events.",
    created_at: new Date().toISOString()
  }));
}

function estimateOrderValue(order: Order) {
  const base = order.company_id === "costco" ? 38 : 7;
  return order.items.reduce((total) => total + base, 0);
}

function normalizeMemoryClaim(claim: string) {
  return claim
    .replace(/^customer prefers\s+/i, "")
    .replace(/^customer likes\s+/i, "")
    .replace(/\.$/, "")
    .trim();
}

function initialGraphState(calls: ActiveCall[]): GraphState {
  const graph: GraphState = {
    nodes: [],
    links: [],
    focusCallId: null,
    lastMutationAt: new Date().toISOString()
  };

  for (const companyId of Object.keys(companyDefinitions) as CompanyId[]) {
    upsertNode(graph, companyNode(companyId));
  }

  upsertNode(graph, insightNode("costco", "party-size-assortments", "Party-size assortments", "The Costco company brain emphasizes crowd coverage, frozen mains, and warehouse stock checks."));
  upsertNode(graph, insightNode("starbucks", "menu-translation", "Menu translation", "Starbucks translates plain-language comfort drink requests into concrete menu items and modifiers."));
  upsertNode(graph, customerNode(costcoHouseholdCustomer));
  upsertNode(graph, customerNode(costcoOfficeCustomer));
  upsertNode(graph, customerNode(starbucksCustomer));
  upsertNode(graph, preferenceNode("costco", "organic-produce", "Organic produce", "Aarya leans organic when there is a clear option."));
  upsertNode(graph, preferenceNode("costco", "nut-free-team-snacks", "Nut-free team snacks", "Maya avoids peanuts for shared office orders."));
  upsertNode(graph, preferenceNode("starbucks", "hindi-hinglish-support", "Hindi/Hinglish support", "Aayushya prefers ordering support in Hindi/Hinglish."));
  upsertNode(graph, preferenceNode("starbucks", "extra-spice", "Extra spice", "Aayushya likes chai drinks pushed closer to masala chai."));

  upsertNode(graph, catalogNode("costco", "Rotisserie chicken", "Previous Costco game-night anchor item."));
  upsertNode(graph, catalogNode("costco", "Spinach artichoke dip tray", "Vegetarian appetizer suggestion for a 15-person Costco hosting run."));
  upsertNode(graph, catalogNode("costco", "Four pound berries", "Fruit-side recommendation for crowd hosting."));
  upsertNode(graph, catalogNode("costco", "Cauliflower pizza two pack", "Vegetarian frozen main for Costco group hosting."));
  upsertNode(graph, catalogNode("starbucks", "Grande Chai Latte", "Closest standard Starbucks drink to a sweet hot chai request."));
  upsertNode(graph, catalogNode("starbucks", "Extra spice customization", "Modifier used to translate a home-style chai preference."));

  upsertLink(graph, graphLink("costco", companyNodeId("costco"), insightNodeId("costco", "party-size-assortments"), "related_to", "Business-side assortment context."));
  upsertLink(graph, graphLink("starbucks", companyNodeId("starbucks"), insightNodeId("starbucks", "menu-translation"), "related_to", "Business-side translation context."));
  upsertLink(graph, graphLink("costco", customerNodeId(costcoHouseholdCustomer.id), preferenceNodeId("costco", "organic-produce"), "prefers", "Customer leans organic."));
  upsertLink(graph, graphLink("costco", customerNodeId(costcoOfficeCustomer.id), preferenceNodeId("costco", "nut-free-team-snacks"), "avoids", "Office ordering avoids nuts."));
  upsertLink(graph, graphLink("starbucks", customerNodeId(starbucksCustomer.id), preferenceNodeId("starbucks", "hindi-hinglish-support"), "prefers", "Customer prefers Hindi/Hinglish comfort."));
  upsertLink(graph, graphLink("starbucks", customerNodeId(starbucksCustomer.id), preferenceNodeId("starbucks", "extra-spice"), "prefers", "Customer already likes extra spice."));
  upsertLink(graph, graphLink("costco", customerNodeId(costcoHouseholdCustomer.id), catalogNodeId("costco", "Rotisserie chicken"), "orders", "Previously bought for game night."));

  for (const companyItem of [
    ["costco", "Rotisserie chicken"],
    ["costco", "Spinach artichoke dip tray"],
    ["costco", "Four pound berries"],
    ["costco", "Cauliflower pizza two pack"],
    ["starbucks", "Grande Chai Latte"],
    ["starbucks", "Extra spice customization"]
  ] as Array<[CompanyId, string]>) {
    upsertLink(graph, graphLink(companyItem[0], companyNodeId(companyItem[0]), catalogNodeId(companyItem[0], companyItem[1]), "related_to", `${companyItem[1]} is connected to the business graph.`));
  }

  for (const call of calls) {
    ensureCallNode(graph, call);
  }
  seedCallGraph(graph, calls.find((call) => call.id === "call_live_costco"));
  seedCallGraph(graph, calls.find((call) => call.id === "call_live_starbucks"));

  return graph;
}

function graphSnapshot(graph: GraphState) {
  return {
    nodes: graph.nodes,
    links: graph.links,
    previewNodeIds: graph.nodes.filter((node) => Boolean(node.previewForCallId)).map((node) => node.id),
    previewLinkIds: graph.links.filter((link) => Boolean(link.previewForCallId)).map((link) => link.id),
    focusCallId: graph.focusCallId,
    lastMutationAt: graph.lastMutationAt
  };
}

function previewGraphForCall(state: State, input: {
  call: ActiveCall;
  companyId: CompanyId;
  customer: CustomerProfile;
  request: string;
  language: "en" | "hi";
  result: CatalogSearchResponse;
  flow?: CallFlow;
}) {
  ensureCallNode(state.graph, input.call);
  clearGraphPreview(state.graph, input.companyId);
  setGraphNodeActive(state.graph, companyNodeId(input.companyId), true);
  setGraphNodeActive(state.graph, customerNodeId(input.customer.id), true);
  setGraphNodeActive(state.graph, callNodeId(input.call.id), true);

  upsertLink(state.graph, {
    id: linkId(callNodeId(input.call.id), customerNodeId(input.customer.id), "related_to"),
    source: callNodeId(input.call.id),
    target: customerNodeId(input.customer.id),
    kind: "related_to",
    companyId: input.companyId,
    detail: `${input.customer.name} is the customer on this call.`,
    active: true
  });

  for (const fact of inferMemoryFacts(input.companyId, input.request, input.flow)) {
    upsertNode(state.graph, {
      ...preferenceNode(input.companyId, fact.key, fact.label, fact.detail),
      previewForCallId: input.call.id,
      active: true
    });
    upsertLink(state.graph, {
      id: linkId(customerNodeId(input.customer.id), preferenceNodeId(input.companyId, fact.key), fact.linkKind),
      source: customerNodeId(input.customer.id),
      target: preferenceNodeId(input.companyId, fact.key),
      kind: fact.linkKind,
      companyId: input.companyId,
      detail: fact.detail,
      previewForCallId: input.call.id,
      active: true
    });
    upsertLink(state.graph, {
      id: linkId(callNodeId(input.call.id), preferenceNodeId(input.companyId, fact.key), "learned_from_call"),
      source: callNodeId(input.call.id),
      target: preferenceNodeId(input.companyId, fact.key),
      kind: "learned_from_call",
      companyId: input.companyId,
      detail: `${fact.label} is a candidate memory from this call.`,
      previewForCallId: input.call.id,
      active: true
    });
  }

  for (const match of input.result.results.slice(0, 3)) {
    upsertNode(state.graph, {
      ...catalogNode(input.companyId, match.name, match.description || match.category),
      active: true
    });
    upsertLink(state.graph, {
      id: linkId(callNodeId(input.call.id), catalogNodeId(input.companyId, match.name), input.language === "hi" && input.companyId === "starbucks" ? "translated_to" : "recommended"),
      source: callNodeId(input.call.id),
      target: catalogNodeId(input.companyId, match.name),
      kind: input.language === "hi" && input.companyId === "starbucks" ? "translated_to" : "recommended",
      companyId: input.companyId,
      detail: input.language === "hi" && input.companyId === "starbucks"
        ? `${match.name} is the translated Starbucks answer to the request.`
        : `${match.name} is actively recommended for this call.`,
      previewForCallId: input.call.id,
      active: true
    });
  }

  touchGraph(state.graph, input.call.id);
}

function commitGraphForCall(state: State, callId: string, input: {
  companyId: CompanyId;
  customer: CustomerProfile;
  call?: ActiveCall | null;
  order?: Order | null;
}) {
  const promotedNodeIds = state.graph.nodes
    .filter((node) => node.previewForCallId === callId)
    .map((node) => node.id);

  for (const node of state.graph.nodes) {
    if (node.previewForCallId === callId) node.previewForCallId = null;
    node.active = promotedNodeIds.includes(node.id) || node.id === customerNodeId(input.customer.id) || node.id === callNodeId(callId);
  }
  for (const link of state.graph.links) {
    if (link.previewForCallId === callId) link.previewForCallId = null;
    link.active = promotedNodeIds.includes(link.source) || promotedNodeIds.includes(link.target) || link.source === callNodeId(callId) || link.target === callNodeId(callId);
  }

  if (input.order) {
    for (const item of input.order.items) {
      upsertNode(state.graph, {
        ...catalogNode(input.companyId, item, "Confirmed order item from the completed call."),
        active: true
      });
      upsertLink(state.graph, {
        id: linkId(customerNodeId(input.customer.id), catalogNodeId(input.companyId, item), "orders"),
        source: customerNodeId(input.customer.id),
        target: catalogNodeId(input.companyId, item),
        kind: "orders",
        companyId: input.companyId,
        detail: `${input.customer.name} ordered ${item}.`,
        active: true
      });
    }
  }

  const callNode = state.graph.nodes.find((node) => node.id === callNodeId(callId));
  if (callNode) callNode.active = false;
  touchGraph(state.graph, callId);
}

function commitPreferenceToGraph(state: State, input: {
  companyId: CompanyId;
  customer: CustomerProfile;
  preference: string;
  confidence: number;
  callId: string | null;
}) {
  const fact = preferenceFactForClaim(input.companyId, input.preference);
  upsertNode(state.graph, {
    ...preferenceNode(input.companyId, fact.key, fact.label, fact.detail),
    active: true
  });
  upsertLink(state.graph, {
    id: linkId(customerNodeId(input.customer.id), preferenceNodeId(input.companyId, fact.key), fact.linkKind),
    source: customerNodeId(input.customer.id),
    target: preferenceNodeId(input.companyId, fact.key),
    kind: fact.linkKind,
    companyId: input.companyId,
    detail: `${fact.label} remembered at ${Math.round(input.confidence * 100)}% confidence.`,
    active: true
  });
  if (input.callId) {
    upsertLink(state.graph, {
      id: linkId(callNodeId(input.callId), preferenceNodeId(input.companyId, fact.key), "learned_from_call"),
      source: callNodeId(input.callId),
      target: preferenceNodeId(input.companyId, fact.key),
      kind: "learned_from_call",
      companyId: input.companyId,
      detail: `${fact.label} was committed from the call.`,
      active: true
    });
  }
  touchGraph(state.graph, input.callId);
}

function discardPreviewPreference(state: State, companyId: CompanyId, claim: string) {
  const fact = preferenceFactForClaim(companyId, claim);
  const id = preferenceNodeId(companyId, fact.key);
  for (const node of state.graph.nodes) {
    if (node.id === id && node.previewForCallId) {
      node.previewForCallId = null;
      node.active = false;
    }
  }
  for (const link of state.graph.links) {
    if ((link.source === id || link.target === id) && link.previewForCallId) {
      link.previewForCallId = null;
      link.active = false;
    }
  }
  touchGraph(state.graph, state.graph.focusCallId);
}

function inferMemoryFacts(
  companyId: CompanyId,
  request: string,
  flow?: CallFlow
): Array<{ key: string; label: string; detail: string; linkKind: GraphLinkKind }> {
  const normalized = `${request} ${flow?.request ?? ""}`.toLowerCase();
  if (companyId === "starbucks") {
    return [
      {
        key: "warm-drinks",
        label: "Warm drinks",
        detail: "The customer asked for a hot comfort drink rather than an iced option.",
        linkKind: "prefers" as const
      },
      {
        key: "chai",
        label: "Chai",
        detail: "The customer explicitly asked for chai and the agent translated that into a concrete Starbucks build.",
        linkKind: "prefers" as const
      },
      {
        key: "avoids-strong-coffee",
        label: "Avoids strong coffee",
        detail: "The request steered away from a strong coffee profile in favor of chai.",
        linkKind: "avoids" as const
      }
    ];
  }

  const facts: Array<{ key: string; label: string; detail: string; linkKind: GraphLinkKind }> = [
    {
      key: "hosts-large-groups",
      label: "Hosts large groups",
      detail: "The customer is planning for a multi-person hosting occasion.",
      linkKind: "hosts" as const
    }
  ];
  if (normalized.includes("vegetarian")) {
    facts.push({
      key: "vegetarian-household",
      label: "Vegetarian household",
      detail: "The ordering context centered a mostly vegetarian group.",
      linkKind: "shops_for" as const
    });
  }
  if (normalized.includes("saturday") || normalized.includes("weekend")) {
    facts.push({
      key: "shops-weekends",
      label: "Shops weekends",
      detail: "The request explicitly referenced Saturday or weekend timing.",
      linkKind: "related_to" as const
    });
  }
  return facts;
}

function preferenceFactForClaim(companyId: CompanyId, claim: string) {
  const normalized = normalizeMemoryClaim(claim).toLowerCase();
  const seeded = inferMemoryFacts(companyId, normalized).find((fact) => normalized.includes(fact.key.replaceAll("-", " ")) || normalized.includes(fact.label.toLowerCase()));
  if (seeded) return seeded;
  return {
    key: slugify(normalized || claim),
    label: sentenceCase(normalized || claim),
    detail: sentenceCase(claim),
    linkKind: "prefers" as const
  };
}

function companyNode(companyId: CompanyId): GraphNode {
  return {
    id: companyNodeId(companyId),
    label: companyDefinitions[companyId].name,
    type: "company",
    companyId,
    side: "business",
    detail: companyDefinitions[companyId].catalogLabel,
    markdown: [
      `# ${companyDefinitions[companyId].name} Company Brain`,
      "",
      companyDefinitions[companyId].catalogLabel,
      "",
      "## Official Facts",
      ...companyDefinitions[companyId].officialFacts.map((fact) => `- ${fact}`),
      "",
      "## Rules",
      ...companyDefinitions[companyId].rules.map((rule) => `- ${rule}`)
    ].join("\n")
  };
}

function customerNode(customer: CustomerProfile): GraphNode {
  return {
    id: customerNodeId(customer.id),
    label: customer.name,
    type: "customer",
    companyId: customer.companyId,
    side: "customer",
    detail: customer.style,
    markdown: [
      `# ${customer.name}`,
      "",
      `Company: ${companyDefinitions[customer.companyId].name}`,
      `Language: ${customer.language}`,
      `Style: ${customer.style}`,
      "",
      "## Likes",
      ...customer.likes.map((like) => `- ${like}`),
      "",
      "## Avoids",
      ...(customer.avoids.length ? customer.avoids.map((avoid) => `- ${avoid}`) : ["- none recorded"]),
      "",
      "## Last Order",
      customer.lastOrder
    ].join("\n")
  };
}

function preferenceNode(companyId: CompanyId, key: string, label: string, detail: string): GraphNode {
  return {
    id: preferenceNodeId(companyId, key),
    label,
    type: "preference",
    companyId,
    side: "customer",
    detail,
    markdown: [
      `# ${label}`,
      "",
      detail,
      "",
      `Company: ${companyDefinitions[companyId].name}`,
      "Type: structured customer memory"
    ].join("\n")
  };
}

function catalogNode(companyId: CompanyId, label: string, detail: string): GraphNode {
  return {
    id: catalogNodeId(companyId, label),
    label,
    type: "catalog_item",
    companyId,
    side: "business",
    detail,
    markdown: [
      `# ${label}`,
      "",
      detail,
      "",
      `Company: ${companyDefinitions[companyId].name}`,
      "Type: catalog item or modifier"
    ].join("\n")
  };
}

function insightNode(companyId: CompanyId, key: string, label: string, detail: string): GraphNode {
  return {
    id: insightNodeId(companyId, key),
    label,
    type: "insight",
    companyId,
    side: "business",
    detail,
    markdown: [
      `# ${label}`,
      "",
      detail,
      "",
      "Type: business-side insight"
    ].join("\n")
  };
}

function ensureCallNode(graph: GraphState, call: ActiveCall) {
  upsertNode(graph, {
    id: callNodeId(call.id),
    label: call.customerName,
    type: "call",
    companyId: call.companyId,
    side: "bridge",
    detail: call.intent,
    markdown: [
      `# Call · ${call.customerName}`,
      "",
      `Company: ${companyDefinitions[call.companyId].name}`,
      `Status: ${call.status}`,
      `Intent: ${call.intent}`,
      "",
      "## Transcript",
      ...call.transcript.map((line) => `- ${line}`)
    ].join("\n"),
    active: call.status !== "ended"
  });
  upsertLink(graph, graphLink(call.companyId, companyNodeId(call.companyId), callNodeId(call.id), "related_to", `${companyDefinitions[call.companyId].name} is handling this call.`));
  const knownCustomerId = call.companyId === "costco"
    ? call.customerName === costcoHouseholdCustomer.name
      ? costcoHouseholdCustomer.id
      : call.customerName === costcoOfficeCustomer.name
        ? costcoOfficeCustomer.id
        : null
    : call.customerName === starbucksCustomer.name
      ? starbucksCustomer.id
      : null;
  if (knownCustomerId) {
    upsertLink(graph, graphLink(call.companyId, callNodeId(call.id), customerNodeId(knownCustomerId), "related_to", `${call.customerName} is tied to this call.`));
  }
}

function seedCallGraph(graph: GraphState, call?: ActiveCall) {
  if (!call) return;
  if (call.companyId === "costco") {
    for (const item of ["Spinach artichoke dip tray", "Four pound berries", "Cauliflower pizza two pack"]) {
      upsertLink(graph, graphLink("costco", callNodeId(call.id), catalogNodeId("costco", item), "recommended", `${item} is part of the seeded Costco hosting recommendation.`));
    }
  }
  if (call.companyId === "starbucks") {
    upsertLink(graph, graphLink("starbucks", callNodeId(call.id), catalogNodeId("starbucks", "Grande Chai Latte"), "translated_to", "The agent translated the request into Grande Chai Latte."));
    upsertLink(graph, graphLink("starbucks", callNodeId(call.id), catalogNodeId("starbucks", "Extra spice customization"), "recommended", "Extra spice is part of the seeded Starbucks translation flow."));
  }
}

function clearGraphPreview(graph: GraphState, companyId: CompanyId) {
  for (const node of graph.nodes) {
    if (node.companyId !== companyId) continue;
    node.active = false;
    if (node.previewForCallId) node.previewForCallId = null;
  }
  for (const link of graph.links) {
    if (link.companyId !== companyId) continue;
    link.active = false;
    if (link.previewForCallId) link.previewForCallId = null;
  }
}

function setGraphNodeActive(graph: GraphState, nodeId: string, active: boolean) {
  const node = graph.nodes.find((candidate) => candidate.id === nodeId);
  if (node) node.active = active;
}

function upsertNode(graph: GraphState, node: GraphNode) {
  const index = graph.nodes.findIndex((candidate) => candidate.id === node.id);
  if (index >= 0) {
    graph.nodes[index] = { ...graph.nodes[index], ...node };
    return;
  }
  graph.nodes.push(node);
}

function upsertLink(graph: GraphState, link: GraphLink) {
  const index = graph.links.findIndex((candidate) => candidate.id === link.id);
  if (index >= 0) {
    graph.links[index] = { ...graph.links[index], ...link };
    return;
  }
  graph.links.push(link);
}

function touchGraph(graph: GraphState, callId: string | null) {
  graph.focusCallId = callId;
  graph.lastMutationAt = new Date().toISOString();
}

function graphLink(companyId: CompanyId, source: string, target: string, kind: GraphLinkKind, detail: string): GraphLink {
  return {
    id: linkId(source, target, kind),
    source,
    target,
    kind,
    companyId,
    detail
  };
}

function companyNodeId(companyId: CompanyId) {
  return `graph_company_${companyId}`;
}

function customerNodeId(customerId: string) {
  return `graph_customer_${customerId}`;
}

function preferenceNodeId(companyId: CompanyId, key: string) {
  return `graph_pref_${companyId}_${slugify(key)}`;
}

function catalogNodeId(companyId: CompanyId, label: string) {
  return `graph_catalog_${companyId}_${slugify(label)}`;
}

function insightNodeId(companyId: CompanyId, key: string) {
  return `graph_insight_${companyId}_${slugify(key)}`;
}

function callNodeId(id: string) {
  return `graph_call_${id}`;
}

function linkId(source: string, target: string, kind: GraphLinkKind) {
  return `graph_link_${kind}_${slugify(source)}_${slugify(target)}`;
}

function customerByName(state: State, companyId: CompanyId, name: string) {
  return Object.values(state.customers).find((customer) => customer.companyId === companyId && customer.name === name) ?? null;
}

function customerForGraph(state: State, companyId: CompanyId, name?: string, phone?: string) {
  return (name ? customerByName(state, companyId, name) : null)
    ?? (phone ? customerForPhone(state, companyId, phone) : null)
    ?? primaryCustomer(state, companyId);
}

function isGraphState(value: unknown): value is GraphState {
  return typeof value === "object" && value !== null && Array.isArray((value as GraphState).nodes) && Array.isArray((value as GraphState).links);
}

function migrateGraph(graph: GraphState, calls: ActiveCall[]) {
  const fallback = initialGraphState(calls);
  return {
    ...fallback,
    ...graph,
    nodes: Array.isArray(graph.nodes) ? graph.nodes : fallback.nodes,
    links: Array.isArray(graph.links) ? graph.links : fallback.links,
    focusCallId: graph.focusCallId ?? fallback.focusCallId,
    lastMutationAt: graph.lastMutationAt ?? fallback.lastMutationAt
  };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item";
}

function sentenceCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}
