import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getState = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const snapshot = await ctx.db
      .query("stateSnapshots")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    return snapshot?.state ?? null;
  }
});

export const saveState = mutation({
  args: {
    key: v.string(),
    state: v.any(),
    updatedAt: v.number()
  },
  handler: async (ctx, args) => {
    await upsertByKey(ctx, "stateSnapshots", args.key, {
      key: args.key,
      state: args.state,
      updatedAt: args.updatedAt
    });

    const state = args.state as DemoState;
    for (const customer of Object.values(state.customers ?? {})) {
      await upsertByKey(ctx, "customers", customer.id, {
        key: customer.id,
        companyId: customer.companyId,
        phone: customer.phone,
        name: customer.name,
        likes: customer.likes ?? [],
        avoids: customer.avoids ?? [],
        style: customer.style ?? "",
        language: customer.language ?? "English",
        household: customer.household ?? [],
        confidence: customer.confidence ?? 0,
        updatedAt: args.updatedAt,
        raw: customer
      });
    }

    for (const order of state.orders ?? []) {
      await upsertByKey(ctx, "orders", order.id, {
        key: order.id,
        companyId: order.company_id,
        customerPhone: order.phone_number,
        customerName: order.customer_name,
        items: order.items ?? [],
        newPreferences: order.new_preferences ?? [],
        confidence: order.confidence ?? 0,
        createdAt: Date.parse(order.created_at) || args.updatedAt,
        raw: order
      });
    }

    for (const memory of state.memoryCandidates ?? []) {
      await upsertByKey(ctx, "memoryCandidates", memory.id, {
        key: memory.id,
        companyId: memory.companyId,
        customerName: memory.customer,
        claim: memory.claim,
        evidence: memory.evidence,
        confidence: memory.confidence,
        status: memory.status,
        createdAt: args.updatedAt,
        raw: memory
      });
    }

    for (const call of state.activeCalls ?? []) {
      await upsertByKey(ctx, "activeCalls", call.id, {
        key: call.id,
        companyId: call.companyId,
        customerName: call.customerName,
        phone: call.phone,
        startedAt: Date.parse(call.startedAt) || args.updatedAt,
        status: call.status,
        intent: call.intent,
        transcript: call.transcript ?? [],
        currentOrder: call.currentOrder ?? [],
        raw: call
      });
    }

    for (const event of state.workflowEvents ?? []) {
      await upsertByKey(ctx, "workflowEvents", event.id, {
        key: event.id,
        node: event.node,
        label: event.label,
        status: event.status,
        detail: event.detail,
        createdAt: Date.parse(event.created_at) || args.updatedAt,
        raw: event
      });
    }

    return { ok: true };
  }
});

export const clearCompanyCatalog = mutation({
  args: {
    companyId: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("companyCatalog")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .take(args.limit ?? 500);

    for (const row of rows) {
      await ctx.db.delete(row._id);
    }

    return { deleted: rows.length };
  }
});

export const insertCompanyCatalogBatch = mutation({
  args: {
    companyId: v.string(),
    items: v.array(v.object({
      catalogId: v.string(),
      sku: v.string(),
      name: v.string(),
      description: v.string(),
      category: v.string(),
      tags: v.array(v.string()),
      stock: v.string(),
      priceBand: v.optional(v.string()),
      raw: v.optional(v.any())
    }))
  },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      await ctx.db.insert("companyCatalog", {
        companyId: args.companyId,
        ...item
      });
    }

    return { inserted: args.items.length };
  }
});

export const replaceCompanyPolicies = mutation({
  args: {
    companyId: v.string(),
    policies: v.array(v.object({
      title: v.string(),
      body: v.string(),
      source: v.optional(v.string())
    }))
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("companyPolicies")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    const updatedAt = Date.now();
    for (const policy of args.policies) {
      await ctx.db.insert("companyPolicies", {
        companyId: args.companyId,
        title: policy.title,
        body: policy.body,
        source: policy.source,
        updatedAt
      });
    }

    return { deleted: existing.length, inserted: args.policies.length };
  }
});

export const getHogDataStats = query({
  args: {},
  handler: async (ctx) => {
    const companyIds = ["costco", "starbucks"];
    const catalog: Record<string, number> = {};
    const policies: Record<string, number> = {};

    for (const companyId of companyIds) {
      catalog[companyId] = (await ctx.db
        .query("companyCatalog")
        .withIndex("by_company", (q) => q.eq("companyId", companyId))
        .collect()).length;
      policies[companyId] = (await ctx.db
        .query("companyPolicies")
        .withIndex("by_company", (q) => q.eq("companyId", companyId))
        .collect()).length;
    }

    const snapshot = await ctx.db
      .query("stateSnapshots")
      .withIndex("by_key", (q) => q.eq("key", "default"))
      .unique();

    return {
      catalog,
      policies,
      hasDefaultState: Boolean(snapshot),
      defaultStateUpdatedAt: snapshot?.updatedAt ?? null
    };
  }
});

type DemoState = {
  customers?: Record<string, DemoCustomer>;
  orders?: DemoOrder[];
  memoryCandidates?: DemoMemory[];
  activeCalls?: DemoCall[];
  workflowEvents?: DemoWorkflowEvent[];
};

type DemoCustomer = {
  id: string;
  companyId: string;
  phone: string;
  name: string;
  likes?: string[];
  avoids?: string[];
  style?: string;
  language?: string;
  household?: Array<{ name: string; notes: string[] }>;
  confidence?: number;
};

type DemoOrder = {
  id: string;
  company_id: string;
  customer_name?: string;
  phone_number?: string;
  items?: string[];
  new_preferences?: string[];
  confidence?: number;
  created_at: string;
};

type DemoMemory = {
  id: string;
  companyId: string;
  customer: string;
  claim: string;
  evidence: string;
  confidence: number;
  status: string;
};

type DemoCall = {
  id: string;
  companyId: string;
  customerName: string;
  phone: string;
  startedAt: string;
  status: string;
  intent: string;
  transcript?: string[];
  currentOrder?: string[];
};

type DemoWorkflowEvent = {
  id: string;
  node: string;
  label: string;
  status: string;
  detail: string;
  created_at: string;
};

async function upsertByKey(
  ctx: any,
  table: "stateSnapshots" | "customers" | "orders" | "memoryCandidates" | "activeCalls" | "workflowEvents",
  key: string,
  value: Record<string, unknown>
) {
  const existing = await ctx.db
    .query(table)
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, value);
  } else {
    await ctx.db.insert(table, value);
  }
}
