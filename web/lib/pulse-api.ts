export type PulseCompany = {
  id: "costco" | "starbucks";
  name: string;
  catalogLabel: string;
  catalogCount: number;
  rules: string[];
  sampleItems: Array<{
    sku: string;
    name: string;
    category: string;
    stock_seed: string;
    price_band_seed: string;
  }>;
};

export type PulseCompanySummary = PulseCompany & {
  hours: string;
  officialFacts: string[];
};

export type PulseCustomer = {
  id: string;
  companyId: "costco" | "starbucks";
  phone: string;
  name: string;
  language: string;
  likes: string[];
  avoids: string[];
  style: string;
  lastOrder: string;
  recurringItems: string[];
  household: Array<{ name: string; notes: string[] }>;
  confidence: number;
};

export type PulseCall = {
  id: string;
  companyId: "costco" | "starbucks";
  customerName: string;
  phone: string;
  startedAt: string;
  status: "ringing" | "context loaded" | "ordering" | "confirmed" | "escalated" | "ended";
  intent: string;
  transcript: string[];
  currentOrder: string[];
  flow?: PulseCallFlow;
};

export type PulseCallFlowMatch = {
  name: string;
  why: string;
  confidence?: number;
  confidence_label?: "high" | "medium" | "low";
  review_reasons?: string[];
  stock?: string;
};

export type PulseCallFlow = {
  language: string;
  request: string;
  companySignals: string[];
  customerSignals: string[];
  matchedItems: PulseCallFlowMatch[];
  decision: "ready-to-order" | "review" | "clarify" | "no-match";
  clarifyingQuestion?: string | null;
  agentReply: string;
  nextAction: string;
};

export type PulseGraphNode = {
  id: string;
  label: string;
  type: "company" | "catalog_item" | "customer" | "preference" | "insight" | "call";
  companyId: "costco" | "starbucks";
  side: "business" | "customer" | "bridge";
  detail: string;
  markdown: string;
  active?: boolean;
};

export type PulseGraphLink = {
  id: string;
  source: string;
  target: string;
  kind:
    | "prefers"
    | "orders"
    | "avoids"
    | "hosts"
    | "shops_for"
    | "translated_to"
    | "recommended"
    | "learned_from_call"
    | "related_to";
  companyId: "costco" | "starbucks";
  detail: string;
  active?: boolean;
};

export type PulseGraphSnapshot = {
  nodes: PulseGraphNode[];
  links: PulseGraphLink[];
  previewNodeIds: string[];
  previewLinkIds: string[];
  focusCallId: string | null;
  lastMutationAt: string | null;
};

export type PulseWorkflowNode =
  | "Call"
  | "Company Brain"
  | "Customer Brain"
  | "Catalog Matcher"
  | "Review Gate"
  | "Order/Memory Write";

export type PulseWorkflowEvent = {
  id: string;
  node: PulseWorkflowNode;
  label: string;
  status: "idle" | "active" | "done" | "review";
  detail: string;
  created_at: string;
};

export type PulseCatalogMatch = {
  rank: number;
  sku: string;
  catalog_id: string;
  name: string;
  description: string;
  category: string;
  source_url?: string;
  score: number;
  confidence: number;
  confidence_label: "high" | "medium" | "low";
  personalized: boolean;
  personalization_note: string | null;
  match_evidence: string[];
  review_reasons: string[];
  can_auto_order: boolean;
  stock_seed: "in_stock" | "low_stock" | "out_of_stock" | "location_required";
  price_band_seed: string;
};

export type PulseCatalogSearch = {
  company_id: "costco" | "starbucks";
  query: string;
  results: PulseCatalogMatch[];
  decision: "ready-to-order" | "review" | "clarify" | "no-match";
  meta: {
    catalog_count: number;
    latency_ms: number;
    low_confidence_overall: boolean;
    ambiguous_query: boolean;
    review_required: boolean;
    clarifying_question: string | null;
  };
};

export type PulseDemoQuery = {
  company: "costco" | "starbucks";
  persona: string;
  query: string;
  expected_match_behavior: string;
  clarifying_question: string;
  auto_order_allowed: string;
  notes: string;
};

export type PulseDashboard = {
  selectedCompanyId: "costco" | "starbucks";
  companies?: PulseCompanySummary[];
  company: PulseCompany;
  activeCalls: PulseCall[];
  allActiveCalls?: PulseCall[];
  customers: PulseCustomer[];
  orders: Array<{
    id: string;
    company_id: string;
    customer_name?: string;
    items: string[];
    created_at: string;
  }>;
  memoryCandidates: Array<{
    id: string;
    customer: string;
    claim: string;
    status: string;
  }>;
  graph: PulseGraphSnapshot;
  workflowEvents: PulseWorkflowEvent[];
  lastSearch: PulseCatalogSearch | null;
  demoQueries?: PulseDemoQuery[];
  metrics: {
    activeCalls: number;
    ordersConfirmed: number;
    humanEscalations: number;
    recoveredRevenueToday: number;
  };
};

export type PulseRealtimeEvent =
  | "dashboard_updated"
  | "context_loaded"
  | "catalog_searched"
  | "order_saved"
  | "vapi_webhook"
  | "memory_learned"
  | "memory_approved"
  | "memory_rejected"
  | "demo_call_started"
  | "demo_call_ended"
  | "demo_reset";

export function pulseApiBase() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
}

export function pulseWsUrl() {
  const base = pulseApiBase();
  if (!base) return "";
  const url = new URL(`${base}/ws`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export async function fetchPulseDashboard(): Promise<PulseDashboard | null> {
  const base = pulseApiBase();
  if (!base) return null;

  try {
    const response = await fetch(`${base}/api/dashboard`, {
      cache: "no-store"
    });
    if (!response.ok) return null;
    return await response.json() as PulseDashboard;
  } catch {
    return null;
  }
}
