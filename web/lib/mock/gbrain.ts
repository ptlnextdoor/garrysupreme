import type { GBrainLink, GBrainNode } from "./types"
import { customers } from "./customers"
import { menu } from "./menu"
import { insights } from "./insights"

const preferenceLabels = [
  { id: "p_oat_milk", label: "Oat milk", customers: ["c_maria", "c_tom"] },
  { id: "p_extra_sweet", label: "Extra sweet", customers: ["c_tom"] },
  { id: "p_extra_cardamom", label: "Extra cardamom", customers: ["c_aisha", "c_priya"] },
  { id: "p_less_sweet", label: "Less sweet", customers: ["c_priya"] },
  { id: "p_no_ice", label: "No ice", customers: ["c_diego"] },
  { id: "p_gluten_free", label: "Gluten-free", customers: ["c_diego"] },
  { id: "p_dairy_free", label: "Dairy-free", customers: ["c_jay"] },
  { id: "p_double_shot", label: "Double shot", customers: ["c_jay"] },
  { id: "p_nut_free", label: "Nut-free (kid)", customers: ["c_maria"] },
  { id: "p_advance_order", label: "Advance order", customers: ["c_lin"] },
  { id: "p_to_go", label: "To-go only", customers: ["c_marcus"] },
  { id: "p_warm", label: "Warm pastries", customers: ["c_maria"] },
]

const customerMd = (c: (typeof customers)[number]) => `# ${c.name}

- **Phone:** ${c.phone}
- **Language:** ${c.language}
- **Customer since:** ${c.joinedAt}
- **Lifetime orders:** ${c.totalOrders}
- **Avg ticket:** $${c.avgTicket.toFixed(2)}
- **Churn risk:** ${c.churnRisk}

## Preferences
${c.preferences.map((p) => `- ${p}`).join("\n")}

## Allergies
${c.allergies.length ? c.allergies.map((a) => `- ${a}`).join("\n") : "- _none recorded_"}

## Notes
${c.notes}
`

const menuMd = (m: (typeof menu)[number]) => `# ${m.name}

- **Category:** ${m.category}
- **Price:** $${m.price.toFixed(2)}${m.popular ? "\n- **Popular** ⭐" : ""}${m.newItem ? "\n- **New** 🆕" : ""}
- **Allergens:** ${m.allergens.length ? m.allergens.join(", ") : "none"}
`

const preferenceMd = (label: string, refs: string[]) => `# Preference: ${label}

Auto-derived from customer call transcripts.

## Customers with this preference
${refs.map((r) => `- [[${r}]]`).join("\n")}
`

const insightMd = (i: (typeof insights)[number]) => `# ${i.title}

> ${i.metric ?? ""}

${i.body}
`

const nodes: GBrainNode[] = [
  ...customers.map<GBrainNode>((c) => ({
    id: c.id,
    label: c.name.split(" ")[0],
    type: "customer",
    markdown: customerMd(c),
  })),
  ...menu.map<GBrainNode>((m) => ({
    id: m.id,
    label: m.name,
    type: "menu",
    markdown: menuMd(m),
  })),
  ...preferenceLabels.map<GBrainNode>((p) => ({
    id: p.id,
    label: p.label,
    type: "preference",
    markdown: preferenceMd(p.label, p.customers),
  })),
  ...insights.map<GBrainNode>((i) => ({
    id: i.id,
    label: i.title,
    type: "insight",
    markdown: insightMd(i),
  })),
]

const links: GBrainLink[] = []

// customer ↔ preference
for (const p of preferenceLabels) {
  for (const cid of p.customers) {
    links.push({ source: cid, target: p.id, kind: "prefers" })
  }
}

// customer ↔ favorite menu items
for (const c of customers) {
  for (const fid of c.favoriteItemIds) {
    links.push({ source: c.id, target: fid, kind: "orders" })
  }
}

// cross-sell pattern: chai <-> lavender
links.push({ source: "m_iced_chai", target: "m_lavender_latte", kind: "co-occurrence" })
links.push({ source: "m_hot_chai", target: "m_lavender_latte", kind: "co-occurrence" })
links.push({ source: "m_chocolate_croissant", target: "m_hot_chai", kind: "co-occurrence" })
links.push({ source: "m_sourdough", target: "m_almond_croissant", kind: "co-occurrence" })

// insights linked to entities
links.push({ source: "i_maria_churn", target: "c_maria", kind: "alert" })
links.push({ source: "i_lin_churn", target: "c_lin", kind: "alert" })
links.push({ source: "i_chai_lavender", target: "m_iced_chai", kind: "trend" })
links.push({ source: "i_chai_lavender", target: "m_lavender_latte", kind: "trend" })
links.push({ source: "i_red_velvet", target: "m_red_velvet_cake", kind: "trend" })
links.push({ source: "i_lavender_growth", target: "m_lavender_latte", kind: "trend" })

export const gbrain = { nodes, links }
