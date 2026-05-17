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

export type PulseCustomer = {
  id: string;
  companyId: string;
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
  companyId: string;
  customerName: string;
  phone: string;
  startedAt: string;
  status: "ringing" | "context loaded" | "ordering" | "confirmed" | "escalated" | "ended";
  intent: string;
  transcript: string[];
  currentOrder: string[];
};

export type PulseDashboard = {
  selectedCompanyId: "costco" | "starbucks";
  company: PulseCompany;
  activeCalls: PulseCall[];
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
  metrics: {
    activeCalls: number;
    ordersConfirmed: number;
    humanEscalations: number;
    recoveredRevenueToday: number;
  };
};

export function pulseApiBase() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
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
