import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const householdMember = v.object({
  name: v.string(),
  notes: v.array(v.string())
});

export default defineSchema({
  stateSnapshots: defineTable({
    key: v.string(),
    state: v.any(),
    updatedAt: v.number()
  }).index("by_key", ["key"]),

  customers: defineTable({
    key: v.string(),
    companyId: v.string(),
    phone: v.string(),
    name: v.string(),
    likes: v.array(v.string()),
    avoids: v.array(v.string()),
    style: v.string(),
    language: v.string(),
    household: v.array(householdMember),
    confidence: v.number(),
    updatedAt: v.number(),
    raw: v.optional(v.any())
  }).index("by_key", ["key"]).index("by_company", ["companyId"]),

  orders: defineTable({
    key: v.string(),
    companyId: v.string(),
    customerPhone: v.optional(v.string()),
    customerName: v.optional(v.string()),
    items: v.array(v.string()),
    newPreferences: v.array(v.string()),
    confidence: v.number(),
    createdAt: v.number(),
    raw: v.optional(v.any())
  }).index("by_key", ["key"]).index("by_company", ["companyId"]),

  memoryCandidates: defineTable({
    key: v.string(),
    companyId: v.string(),
    customerName: v.string(),
    claim: v.string(),
    evidence: v.string(),
    confidence: v.number(),
    status: v.string(),
    createdAt: v.number(),
    raw: v.optional(v.any())
  }).index("by_key", ["key"]).index("by_company_status", ["companyId", "status"]),

  activeCalls: defineTable({
    key: v.string(),
    companyId: v.string(),
    customerName: v.string(),
    phone: v.string(),
    startedAt: v.number(),
    status: v.string(),
    intent: v.string(),
    transcript: v.array(v.string()),
    currentOrder: v.array(v.string()),
    raw: v.optional(v.any())
  }).index("by_key", ["key"]).index("by_company", ["companyId"]),

  workflowEvents: defineTable({
    key: v.string(),
    node: v.string(),
    label: v.string(),
    status: v.string(),
    detail: v.string(),
    createdAt: v.number(),
    raw: v.optional(v.any())
  }).index("by_key", ["key"]),

  companyCatalog: defineTable({
    companyId: v.string(),
    catalogId: v.string(),
    sku: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    stock: v.string(),
    priceBand: v.optional(v.string()),
    raw: v.optional(v.any())
  }).index("by_company", ["companyId"]),

  companyPolicies: defineTable({
    companyId: v.string(),
    title: v.string(),
    body: v.string(),
    source: v.optional(v.string()),
    updatedAt: v.number()
  }).index("by_company", ["companyId"])
});
