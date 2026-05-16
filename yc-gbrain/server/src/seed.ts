export type MenuItem = {
  name: string;
  price: number;
  description: string;
  tags: string[];
  allergens: string[];
  modifiers: string[];
  stock: "in stock" | "low" | "sold out";
};

export type CustomerProfile = {
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

export type MemoryCandidate = {
  id: string;
  customer: string;
  claim: string;
  evidence: string;
  confidence: number;
  status: "pending" | "approved";
};

export type ActiveCall = {
  id: string;
  customerName: string;
  phone: string;
  startedAt: string;
  status: "context loaded" | "ordering" | "confirmed" | "escalated";
  intent: string;
  transcript: string[];
  currentOrder: string[];
};

export const company = {
  id: "sunrise-coffee",
  name: "Sunrise Coffee",
  hours: "6:30 AM - 5:00 PM",
  rules: [
    "Never guess about allergies.",
    "Recommend max one best item and one backup.",
    "Confirm the full order before saving.",
    "Escalate catering, refunds, and unclear allergen requests to a human."
  ],
  menu: [
    {
      name: "Iced Chai Latte",
      price: 5.75,
      description: "Cold, sweet, spiced milk tea. Strong cardamom finish.",
      tags: ["cold", "sweet", "chai", "dairy-free option"],
      allergens: ["milk by default"],
      modifiers: ["oat milk", "extra sweet", "cardamom", "light ice"],
      stock: "in stock"
    },
    {
      name: "Hot Chai Latte",
      price: 5.25,
      description: "Warm spiced black tea with steamed milk.",
      tags: ["hot", "sweet", "chai", "comforting"],
      allergens: ["milk by default"],
      modifiers: ["oat milk", "extra sweet", "cardamom", "ginger"],
      stock: "in stock"
    },
    {
      name: "Coconut Cold Brew",
      price: 6.25,
      description: "Light cold coffee with coconut and vanilla.",
      tags: ["cold", "coffee", "light", "dairy-free"],
      allergens: [],
      modifiers: ["vanilla", "caramel drizzle", "half sweet"],
      stock: "in stock"
    },
    {
      name: "Lavender Latte",
      price: 6,
      description: "Floral espresso latte with house lavender syrup.",
      tags: ["hot", "coffee", "floral", "popular"],
      allergens: ["milk by default"],
      modifiers: ["oat milk", "half sweet", "extra shot"],
      stock: "low"
    }
  ] satisfies MenuItem[]
};

export const knownCustomer: CustomerProfile = {
  id: "aayushya",
  phone: "+15551234567",
  name: "Aayushya",
  likes: ["sweet", "chai", "cardamom", "oat milk", "plain English"],
  avoids: ["dairy"],
  style: "plain English, no menu jargon",
  language: "English",
  lastOrder: "hot chai latte, extra sweet, oat milk, cardamom",
  household: [
    {
      name: "Mom",
      notes: ["likes hot chai", "prefers sweet drinks", "usually says yes to cardamom"]
    }
  ],
  confidence: 0.93
};

export const newCustomer: CustomerProfile = {
  id: "new-customer",
  phone: "unknown",
  name: "new customer",
  likes: [],
  avoids: [],
  style: "simple and friendly",
  language: "English",
  lastOrder: "none yet",
  household: [],
  confidence: 0
};

export const activeCalls: ActiveCall[] = [
  {
    id: "call_live_aayushya",
    customerName: "Aayushya",
    phone: "+15551234567",
    startedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    status: "ordering",
    intent: "Cold, sweet, not too heavy, no dairy",
    transcript: [
      "Caller: I want something cold, sweet, not too heavy, no dairy.",
      "Pulse: Best match is an iced chai with oat milk and extra cardamom."
    ],
    currentOrder: ["Iced Chai Latte, oat milk, cardamom"]
  },
  {
    id: "call_live_catering",
    customerName: "Sarah",
    phone: "+15555550109",
    startedAt: new Date(Date.now() - 90_000).toISOString(),
    status: "escalated",
    intent: "Custom birthday catering request",
    transcript: ["Pulse: I can get a human for that custom cake question."],
    currentOrder: []
  },
  {
    id: "call_live_pickup",
    customerName: "Dev",
    phone: "+15555550133",
    startedAt: new Date(Date.now() - 30_000).toISOString(),
    status: "context loaded",
    intent: "Pickup time and pastry availability",
    transcript: ["Caller: Do you still have almond croissants?"],
    currentOrder: []
  }
];

export const memoryCandidates: MemoryCandidate[] = [
  {
    id: "mem_aayushya_cold_chai",
    customer: "Aayushya",
    claim: "Customer likes cold chai variants.",
    evidence: "Asked for something cold and sweet, accepted iced chai recommendation.",
    confidence: 0.82,
    status: "pending"
  },
  {
    id: "mem_mom_hot_chai",
    customer: "Aayushya household",
    claim: "Mom likes hot sweet chai with cardamom.",
    evidence: "Customer ordered hot sweet chai for mom and confirmed cardamom.",
    confidence: 0.78,
    status: "pending"
  }
];
