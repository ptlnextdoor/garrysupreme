export type MenuItem = {
  name: string;
  price: number;
  description: string;
  tags: string[];
  allergens: string[];
  modifiers: string[];
  stock: "in stock" | "low" | "sold out";
};

export type Company = {
  id: string;
  name: string;
  hours: string;
  rules: string[];
  menu: MenuItem[];
};

export type Customer = {
  id: string;
  phone: string;
  name: string;
  likes: string[];
  avoids: string[];
  style: string;
  language: string;
  lastOrder: string;
  household: Array<{ name: string; notes: string[] }>;
  confidence: number;
};

export type ActiveCall = {
  id: string;
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
  customer: string;
  claim: string;
  evidence: string;
  confidence: number;
  status: "pending" | "approved" | "rejected";
};

export type Order = {
  id: string;
  customer_name?: string;
  phone_number?: string;
  items: string[];
  new_preferences: string[];
  confidence: number;
  created_at: string;
};

export type DashboardData = {
  company: Company;
  activeCalls: ActiveCall[];
  customers: Customer[];
  memoryCandidates: MemoryCandidate[];
  orders: Order[];
  metrics: {
    activeCalls: number;
    ordersConfirmed: number;
    humanEscalations: number;
    recoveredRevenueToday: number;
  };
};
