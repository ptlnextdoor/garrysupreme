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

type State = {
  selectedCompanyId: CompanyId;
  activeCalls: ActiveCall[];
  customers: Record<string, CustomerProfile>;
  memoryCandidates: MemoryCandidate[];
  orders: Order[];
  workflowEvents: WorkflowEvent[];
  lastSearch: CatalogSearchResponse | null;
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
  lastOrder: "Kirkland almond milk, Costco rotisserie chicken, Goldfish variety pack, Kirkland trail mix, bath tissue",
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
  likes: ["oat milk", "half sweet", "plain English", "chai", "low caffeine after 2pm"],
  avoids: ["dairy"],
  style: "plain English, no Starbucks jargon",
  language: "English, Hindi/Hinglish supported",
  lastOrder: "Grande iced chai latte, oat milk, half sweet",
  recurringItems: ["iced chai latte", "oat milk", "half sweet"],
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

function initialState(companyId: CompanyId = "costco"): State {
  return {
    selectedCompanyId: companyId,
    activeCalls: [
      {
        id: "call_live_costco",
        companyId: "costco",
        customerName: "Aarya",
        phone: "+17028619093",
        startedAt: new Date().toISOString(),
        status: "ringing",
        intent: "Personal Costco quick run or big monthly household haul",
        transcript: ["Pulse: Waiting for Aarya to call Costco household concierge."],
        currentOrder: []
      },
      {
        id: "call_live_costco_office",
        companyId: "costco",
        customerName: "Maya Patel",
        phone: "+15551234567",
        startedAt: new Date(Date.now() - 30_000).toISOString(),
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
        startedAt: new Date(Date.now() - 45_000).toISOString(),
        status: "context loaded",
        intent: "Secondary Starbucks plain-English menu demo",
        transcript: ["Caller: I do not know Starbucks words. I want something warm and cozy."],
        currentOrder: []
      },
      {
        id: "call_live_review",
        companyId: "costco",
        customerName: "Community event",
        phone: "+15555550109",
        startedAt: new Date(Date.now() - 90_000).toISOString(),
        status: "escalated",
        intent: "Food and supplies for 80-person breakfast",
        transcript: ["Pulse: Large perishable community event needs review for timing and dietary details."],
        currentOrder: []
      }
    ],
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
        claim: "Customer prefers plain-English Starbucks translations and oat milk by default.",
        evidence: "Seeded Starbucks customer brain for secondary demo.",
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
        items: ["Grande iced chai latte, oat milk, half sweet"],
        new_preferences: [],
        confidence: 0.9,
        created_at: new Date(Date.now() - 2 * 60 * 60_000).toISOString()
      }
    ],
    workflowEvents: workflowTemplate(),
    lastSearch: null
  };
}

async function ensureDirs() {
  await mkdir(path.join(gbrainDir, "companies"), { recursive: true });
  await mkdir(path.join(gbrainDir, "customers"), { recursive: true });
  await mkdir(path.join(gbrainDir, "orders"), { recursive: true });
  await ensureCompanyBrains(gbrainDir);
}

export async function loadState(): Promise<State> {
  await ensureDirs();

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
    customers: Object.values(state.customers).filter((customer) => customer.companyId === selectedCompanyId || customer.id === "new-customer"),
    memoryCandidates: state.memoryCandidates.filter((candidate) => candidate.companyId === selectedCompanyId),
    orders: companyOrders,
    workflowEvents: state.workflowEvents,
    lastSearch: state.lastSearch?.company_id === selectedCompanyId ? state.lastSearch : null,
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
    pushWorkflow(state, "Order/Memory Write", "done", "Memory approved", memory.claim);
    return memory;
  });
}

export async function rejectMemory(id: string) {
  return updateState((state) => {
    const memory = state.memoryCandidates.find((candidate) => candidate.id === id);
    if (!memory) return null;
    memory.status = "rejected";
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
    pushWorkflow(state, "Order/Memory Write", "done", "Memory candidate created", preference);
    return memory;
  });
}

export async function recordVapiLifecycle(input: {
  event: string;
  company_id?: unknown;
  call_id?: string;
  phone_number?: string;
  customer_name?: string;
}) {
  const event = input.event.toLowerCase();
  const companyId = normalizeCompanyId(input.company_id);
  const isStart = event.includes("status-update") || event.includes("call-start") || event.includes("call_started") || event.includes("in-progress");
  const isEnd = event.includes("end-of-call-report") || event.includes("call-end") || event.includes("call_ended") || event.includes("ended");
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
    }

    if (!call) return null;
    if (isStart) {
      call.status = "ringing";
      call.phone = phone;
      call.customerName = customer?.name ?? call.customerName;
      call.transcript.push(`Vapi: ${input.event}`);
      pushWorkflow(state, "Call", "active", "Vapi call lifecycle", `${call.customerName} · ${input.event}`);
    }
    if (isEnd) {
      call.status = "ended";
      call.transcript.push(`Vapi: ${input.event}`);
      pushWorkflow(state, "Call", "done", "Vapi call ended", call.customerName);
    }
    return call;
  });
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
  return {
    ...fallback,
    ...input,
    selectedCompanyId: normalizeCompanyId(input.selectedCompanyId),
    customers: {
      ...fallback.customers,
      ...(input.customers ?? {})
    },
    activeCalls: Array.isArray(input.activeCalls) && input.activeCalls.every((call) => "companyId" in call) ? input.activeCalls : fallback.activeCalls,
    memoryCandidates: Array.isArray(input.memoryCandidates) && input.memoryCandidates.every((memory) => "companyId" in memory) ? input.memoryCandidates : fallback.memoryCandidates,
    orders: Array.isArray(input.orders) && input.orders.every((order) => "company_id" in order) ? input.orders : fallback.orders,
    workflowEvents: input.workflowEvents?.length ? input.workflowEvents : fallback.workflowEvents,
    lastSearch: input.lastSearch ?? null
  };
}

function primaryCustomer(state: State, companyId: CompanyId) {
  return Object.values(state.customers).find((customer) => customer.companyId === companyId && customer.id !== "new-customer") ?? state.customers["new-customer"];
}

function customerForPhone(state: State, companyId: CompanyId, phoneNumber: string) {
  const demoMatch = process.env.DEMO_PHONE_MATCH ?? "YOUR_NUMBER";
  const normalized = phoneNumber || "unknown";
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
