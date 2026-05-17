export type CompanyId = "costco" | "starbucks";

export type CatalogItem = {
  company_id: CompanyId;
  catalog_id: string;
  sku: string;
  name: string;
  description: string;
  active: boolean;
  category: string;
  tags: string[];
  source_url?: string;
  lastmod?: string;
  price_band_seed: string;
  stock_seed: "in_stock" | "low_stock" | "out_of_stock" | "location_required";
  review_required_reason: string[];
  attributes: Record<string, string | number | boolean | string[] | null>;
};

export type Company = {
  id: CompanyId;
  name: string;
  hours: string;
  catalogLabel: string;
  rules: string[];
  officialFacts: string[];
  catalogCount: number;
  sampleItems: CatalogItem[];
};

export type Customer = {
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

export type MemoryCandidate = {
  id: string;
  companyId: CompanyId;
  customer: string;
  claim: string;
  evidence: string;
  confidence: number;
  status: "pending" | "approved" | "rejected";
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

export type CatalogMatch = {
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
  stock_seed: CatalogItem["stock_seed"];
  price_band_seed: string;
};

export type SearchResponse = {
  company_id: CompanyId;
  query: string;
  results: CatalogMatch[];
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

export type DemoQuery = {
  company: CompanyId;
  persona: string;
  query: string;
  expected_match_behavior: string;
  clarifying_question: string;
  auto_order_allowed: string;
  notes: string;
};

export type WorkflowEvent = {
  id: string;
  node: "Call" | "Company Brain" | "Customer Brain" | "Catalog Matcher" | "Review Gate" | "Order/Memory Write";
  label: string;
  status: "idle" | "active" | "done" | "review";
  detail: string;
  created_at: string;
};

export type DashboardData = {
  selectedCompanyId: CompanyId;
  companies: Company[];
  company: Company;
  activeCalls: ActiveCall[];
  customers: Customer[];
  memoryCandidates: MemoryCandidate[];
  orders: Order[];
  workflowEvents: WorkflowEvent[];
  lastSearch: SearchResponse | null;
  demoQueries: DemoQuery[];
  metrics: {
    activeCalls: number;
    ordersConfirmed: number;
    humanEscalations: number;
    recoveredRevenueToday: number;
  };
};
