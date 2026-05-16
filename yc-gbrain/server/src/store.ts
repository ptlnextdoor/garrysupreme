import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { activeCalls, company, knownCustomer, memoryCandidates, newCustomer, type ActiveCall, type CustomerProfile, type MemoryCandidate } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const gbrainDir = path.join(rootDir, "gbrain");
const statePath = path.join(gbrainDir, "state.json");

type Order = {
  id: string;
  customer_name?: string;
  phone_number?: string;
  items: string[];
  new_preferences: string[];
  confidence: number;
  created_at: string;
};

type State = {
  activeCalls: ActiveCall[];
  customers: Record<string, CustomerProfile>;
  memoryCandidates: MemoryCandidate[];
  orders: Order[];
};

const initialState: State = {
  activeCalls,
  customers: {
    [knownCustomer.id]: knownCustomer,
    [newCustomer.id]: newCustomer
  },
  memoryCandidates,
  orders: []
};

async function ensureDirs() {
  await mkdir(path.join(gbrainDir, "companies", company.id), { recursive: true });
  await mkdir(path.join(gbrainDir, "customers"), { recursive: true });
  await mkdir(path.join(gbrainDir, "orders"), { recursive: true });
}

export async function loadState(): Promise<State> {
  await ensureDirs();

  try {
    const raw = await readFile(statePath, "utf8");
    return JSON.parse(raw) as State;
  } catch {
    await saveState(initialState);
    await writeSeedMarkdown(initialState);
    return initialState;
  }
}

async function saveState(state: State) {
  await ensureDirs();
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

export async function writeSeedMarkdown(state: State) {
  const menuMd = [
    `# ${company.name} Company Brain`,
    "",
    `Hours: ${company.hours}`,
    "",
    "## Rules",
    ...company.rules.map((rule) => `- ${rule}`),
    "",
    "## Menu",
    ...company.menu.map((item) => [
      `### ${item.name}`,
      `Price: $${item.price.toFixed(2)}`,
      `Description: ${item.description}`,
      `Tags: ${item.tags.join(", ")}`,
      `Allergens: ${item.allergens.length ? item.allergens.join(", ") : "none listed"}`,
      `Modifiers: ${item.modifiers.join(", ")}`,
      `Stock: ${item.stock}`
    ].join("\n\n"))
  ].join("\n\n");

  await writeFile(path.join(gbrainDir, "companies", company.id, "menu.md"), `${menuMd}\n`);

  for (const customer of Object.values(state.customers)) {
    if (customer.id === "new-customer") continue;

    const md = [
      `# ${customer.name} Customer Brain`,
      "",
      `Phone: ${customer.phone}`,
      `Language: ${customer.language}`,
      `Communication style: ${customer.style}`,
      `Confidence: ${customer.confidence}`,
      "",
      "## Likes",
      ...customer.likes.map((like) => `- ${like}`),
      "",
      "## Avoids",
      ...customer.avoids.map((avoid) => `- ${avoid}`),
      "",
      "## Last Order",
      customer.lastOrder,
      "",
      "## Household",
      ...customer.household.map((member) => `- ${member.name}: ${member.notes.join("; ")}`)
    ].join("\n");

    await writeFile(path.join(gbrainDir, "customers", `${customer.id}.md`), `${md}\n`);
  }
}

export async function getDashboard() {
  const state = await loadState();
  return {
    company,
    activeCalls: state.activeCalls,
    customers: Object.values(state.customers),
    memoryCandidates: state.memoryCandidates,
    orders: state.orders,
    metrics: {
      activeCalls: state.activeCalls.length,
      ordersConfirmed: Math.max(2, state.orders.length),
      humanEscalations: state.activeCalls.filter((call) => call.status === "escalated").length,
      recoveredRevenueToday: 86 + state.orders.length * 12
    }
  };
}

export async function getContext(phoneNumber: string, request: string) {
  const state = await loadState();
  const demoMatch = process.env.DEMO_PHONE_MATCH ?? "YOUR_NUMBER";
  const normalizedPhone = phoneNumber || "unknown";
  const customer = normalizedPhone.includes(demoMatch) || normalizedPhone.includes("1234567")
    ? state.customers[knownCustomer.id]
    : state.customers["new-customer"];

  const lowerRequest = request.toLowerCase();
  const relevantMenu = company.menu.filter((item) => {
    const haystack = `${item.name} ${item.description} ${item.tags.join(" ")} ${item.modifiers.join(" ")}`.toLowerCase();
    return lowerRequest.split(/\W+/).some((word) => word.length > 2 && haystack.includes(word));
  });

  return {
    customer,
    company: {
      ...company,
      menu: relevantMenu.length ? relevantMenu : company.menu
    },
    session: {
      request,
      safety: "Ask before assuming allergens. Today's request beats older preferences.",
      recommendationHint: "For cold, sweet, no dairy: recommend Iced Chai Latte with oat milk and cardamom; backup Coconut Cold Brew."
    }
  };
}

export async function saveOrder(input: Partial<Order>) {
  const state = await loadState();
  const order: Order = {
    id: `order_${Date.now()}`,
    customer_name: input.customer_name ?? "unknown customer",
    phone_number: input.phone_number,
    items: input.items ?? [],
    new_preferences: input.new_preferences ?? [],
    confidence: input.confidence ?? 0.7,
    created_at: new Date().toISOString()
  };

  state.orders.unshift(order);

  if (order.customer_name?.toLowerCase().includes("aayushya")) {
    const call = state.activeCalls.find((candidate) => candidate.id === "call_live_aayushya");
    if (call) {
      call.status = "confirmed";
      call.currentOrder = order.items;
      call.transcript.push(`Pulse: Confirmed ${order.items.join(" and ")}.`);
    }
  }

  for (const preference of order.new_preferences) {
    state.memoryCandidates.unshift({
      id: `mem_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      customer: order.customer_name ?? "unknown customer",
      claim: preference,
      evidence: `Learned from confirmed order ${order.id}.`,
      confidence: order.confidence,
      status: "pending"
    });
  }

  await saveState(state);
  await writeSeedMarkdown(state);

  const md = [
    `# ${order.id}`,
    "",
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
  const state = await loadState();
  const memory = state.memoryCandidates.find((candidate) => candidate.id === id);
  if (!memory) return null;
  memory.status = "approved";
  await saveState(state);
  return memory;
}
