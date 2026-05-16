import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { activeCalls, company, knownCustomer, memoryCandidates, newCustomer, type ActiveCall, type CustomerProfile, type MemoryCandidate, type MenuItem } from "./seed.js";

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

type Recommendation = {
  item: MenuItem;
  modifiers: string[];
  reason: string;
  confidence: number;
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
  orders: [
    {
      id: "seed_order_1",
      customer_name: "Maria Delgado",
      phone_number: "+15555550172",
      items: ["Lavender Latte, oat milk", "Blueberry Muffin"],
      new_preferences: [],
      confidence: 0.9,
      created_at: new Date(Date.now() - 3 * 60 * 60_000).toISOString()
    },
    {
      id: "seed_order_2",
      customer_name: "Dev",
      phone_number: "+15555550133",
      items: ["Coconut Cold Brew, half sweet"],
      new_preferences: [],
      confidence: 0.84,
      created_at: new Date(Date.now() - 90 * 60_000).toISOString()
    }
  ]
};

let writeQueue: Promise<unknown> = Promise.resolve();

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
  } catch (error) {
    if (isNotFound(error)) {
      await saveState(initialState);
      await writeSeedMarkdown(initialState);
      return structuredClone(initialState);
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
    await writeSeedMarkdown(state);
    return result;
  };

  const result = writeQueue.then(run, run);
  writeQueue = result.catch(() => undefined);
  return result;
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
  const orderRevenue = state.orders.reduce((total, order) => total + estimateOrderValue(order), 0);
  return {
    company,
    activeCalls: state.activeCalls,
    customers: Object.values(state.customers),
    memoryCandidates: state.memoryCandidates,
    orders: state.orders,
    metrics: {
      activeCalls: state.activeCalls.length,
      ordersConfirmed: state.orders.length,
      humanEscalations: state.activeCalls.filter((call) => call.status === "escalated").length,
      recoveredRevenueToday: Math.round(orderRevenue + 58)
    }
  };
}

function estimateOrderValue(order: Order) {
  return order.items.reduce((total, item) => {
    const match = company.menu.find((menuItem) => item.toLowerCase().includes(menuItem.name.toLowerCase()));
    return total + (match?.price ?? 8);
  }, 0);
}

export async function getContext(phoneNumber: string, request: string) {
  return updateState(async (state) => {
    const demoMatch = process.env.DEMO_PHONE_MATCH ?? "YOUR_NUMBER";
    const normalizedPhone = phoneNumber || "unknown";
    const customer = normalizedPhone.includes(demoMatch) || normalizedPhone.includes("1234567")
      ? state.customers[knownCustomer.id]
      : state.customers["new-customer"];

    const recommendations = scoreRecommendations(request, customer);
    const relevantMenu = recommendations.length ? recommendations.map((recommendation) => recommendation.item) : company.menu;
    const call =
      state.activeCalls.find((candidate) => normalizedPhone !== "unknown" && candidate.phone === normalizedPhone) ??
      state.activeCalls.find((candidate) => candidate.phone === customer.phone) ??
      state.activeCalls.find((candidate) => candidate.id === "call_live_aayushya");
    if (call) {
      call.status = "context loaded";
      call.intent = request || call.intent;
      call.transcript.push(`Caller: ${request || "Asked for help ordering."}`);
      call.transcript.push("Pulse: Loaded Company Brain + Customer Brain.");
    }

    return {
      customer: {
        ...customer,
        sourceMarkdown: await readCustomerMarkdown(customer.id)
      },
      company: {
        ...company,
        menu: relevantMenu,
        sourceMarkdown: await readCompanyMarkdown()
      },
      session: {
        request,
        safety: "Ask before assuming allergens. Today's request beats older preferences.",
        recommendations
      }
    };
  });
}

function scoreRecommendations(request: string, customer: CustomerProfile): Recommendation[] {
  const lower = request.toLowerCase();
  const requestedTags = new Set<string>();
  if (lower.includes("cold") || lower.includes("iced")) requestedTags.add("cold");
  if (lower.includes("hot") || lower.includes("warm")) requestedTags.add("hot");
  if (lower.includes("sweet")) requestedTags.add("sweet");
  if (lower.includes("dairy") || lower.includes("oat")) requestedTags.add("dairy-free");
  if (lower.includes("coffee") || lower.includes("espresso")) requestedTags.add("coffee");
  if (lower.includes("tea") || lower.includes("chai")) requestedTags.add("chai");
  if (lower.includes("light") || lower.includes("heavy")) requestedTags.add("light");

  return company.menu
    .map((item) => {
      const tags = `${item.name} ${item.description} ${item.tags.join(" ")} ${item.modifiers.join(" ")}`.toLowerCase();
      let score = 0;
      const reasons: string[] = [];

      for (const tag of requestedTags) {
        if (tags.includes(tag)) {
          score += 3;
          reasons.push(tag);
        }
      }

      for (const like of customer.likes) {
        if (tags.includes(like.toLowerCase())) score += 1;
      }

      for (const avoid of customer.avoids) {
        if (avoid === "dairy" && !item.modifiers.includes("oat milk") && item.allergens.some((allergen) => allergen.includes("milk"))) score -= 6;
      }

      const modifiers = [
        ...(customer.avoids.includes("dairy") && item.modifiers.includes("oat milk") ? ["oat milk"] : []),
        ...(customer.likes.includes("cardamom") && item.modifiers.includes("cardamom") ? ["cardamom"] : []),
        ...(lower.includes("sweet") && item.modifiers.includes("extra sweet") ? ["extra sweet"] : [])
      ];

      return {
        item,
        modifiers,
        reason: reasons.length ? `Matches ${reasons.join(", ")} and customer preferences.` : "Backup option from company menu.",
        confidence: Math.min(0.96, Math.max(0.45, score / 12 + 0.45)),
        score
      };
    })
    .filter((recommendation) => recommendation.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
    .map(({ score: _score, ...recommendation }) => recommendation);
}

async function readCompanyMarkdown() {
  try {
    return await readFile(path.join(gbrainDir, "companies", company.id, "menu.md"), "utf8");
  } catch {
    return "";
  }
}

async function readCustomerMarkdown(id: string) {
  try {
    return await readFile(path.join(gbrainDir, "customers", `${id}.md`), "utf8");
  } catch {
    return "";
  }
}

export async function saveOrder(input: Partial<Order>) {
  const order = await updateState((state) => {
    const nextOrder: Order = {
      id: `order_${Date.now()}`,
      customer_name: input.customer_name ?? "unknown customer",
      phone_number: input.phone_number,
      items: input.items ?? [],
      new_preferences: input.new_preferences ?? [],
      confidence: input.confidence ?? 0.7,
      created_at: new Date().toISOString()
    };

    state.orders.unshift(nextOrder);

    if (nextOrder.customer_name?.toLowerCase().includes("aayushya")) {
      const call = state.activeCalls.find((candidate) => candidate.id === "call_live_aayushya");
      if (call) {
        call.status = "confirmed";
        call.currentOrder = nextOrder.items;
        call.transcript.push(`Pulse: Confirmed ${nextOrder.items.join(" and ")}.`);
      }
    }

    for (const preference of nextOrder.new_preferences) {
      state.memoryCandidates.unshift({
        id: `mem_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        customer: nextOrder.customer_name ?? "unknown customer",
        claim: preference,
        evidence: `Learned from confirmed order ${nextOrder.id}.`,
        confidence: nextOrder.confidence,
        status: "pending"
      });
    }

    return nextOrder;
  });

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
  return updateState((state) => {
    const memory = state.memoryCandidates.find((candidate) => candidate.id === id);
    if (!memory) return null;
    memory.status = "approved";

    const customer = state.customers[knownCustomer.id];
    if (memory.claim.toLowerCase().includes("mom")) {
      const mom = customer.household.find((member) => member.name.toLowerCase() === "mom");
      if (mom && !mom.notes.includes(memory.claim)) mom.notes.push(memory.claim);
    } else {
      const like = normalizeMemoryClaim(memory.claim);
      if (!customer.likes.includes(like)) customer.likes.push(like);
    }

    customer.confidence = Math.min(0.99, customer.confidence + 0.01);
    return memory;
  });
}

function normalizeMemoryClaim(claim: string) {
  return claim
    .replace(/^customer likes\s+/i, "")
    .replace(/\.$/, "")
    .trim();
}

export async function rejectMemory(id: string) {
  return updateState((state) => {
    const memory = state.memoryCandidates.find((candidate) => candidate.id === id);
    if (!memory) return null;
    memory.status = "rejected";
    return memory;
  });
}

export async function learnPreference(customerName: string, preference: string, confidence: number) {
  return updateState((state) => {
    const memory: MemoryCandidate = {
      id: `mem_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      customer: customerName,
      claim: preference,
      evidence: "Manually learned from demo endpoint.",
      confidence,
      status: "pending"
    };
    state.memoryCandidates.unshift(memory);
    return memory;
  });
}

export async function startDemoCall() {
  return updateState((state) => {
    const call = state.activeCalls.find((candidate) => candidate.id === "call_live_aayushya");
    if (!call) return null;
    call.startedAt = new Date().toISOString();
    call.status = "ringing";
    call.intent = "Incoming demo call";
    call.currentOrder = [];
    call.transcript = ["Pulse: Incoming call from Aayushya."];
    return call;
  });
}

export async function endDemoCall() {
  return updateState((state) => {
    const call = state.activeCalls.find((candidate) => candidate.id === "call_live_aayushya");
    if (!call) return null;
    call.status = "ended";
    call.transcript.push("Pulse: Call ended.");
    return call;
  });
}

export async function resetDemo() {
  await saveState(structuredClone(initialState));
  await writeSeedMarkdown(initialState);
  return getDashboard();
}
