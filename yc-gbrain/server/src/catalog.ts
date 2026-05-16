import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

export type CompanyDefinition = {
  id: CompanyId;
  name: string;
  hours: string;
  catalogLabel: string;
  rules: string[];
  officialFacts: string[];
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

export type CatalogSearchResponse = {
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

type CsvRow = Record<string, string>;

type TaxonomyRow = {
  category: string;
  tags: string[];
  use_cases?: string;
  dietary_notes?: string;
  price_band?: string;
  stock_seed?: string;
  hot_cold?: string;
  caffeine_level?: string;
  dairy_free_possible?: string;
  sweetness?: string;
  allergen_notes?: string;
};

type CatalogIndex = {
  docs: string[];
  tokensByDoc: string[][];
  inverted: Map<string, Map<number, number>>;
  avgLength: number;
};

type CatalogBundle = {
  companies: Record<CompanyId, CompanyDefinition>;
  items: Record<CompanyId, CatalogItem[]>;
  indexes: Record<CompanyId, CatalogIndex>;
  demoQueries: DemoQuery[];
};

const external = {
  costcoCatalog: "/Users/aayu/CostcoProductCatalog/catalog_with_sources.csv",
  starbucksCatalog: "/Users/aayu/starbucks_full_product_menu_catalog.csv",
  costcoTaxonomy: "/Users/aayu/pulse_demo_research/costco_seed_taxonomy.csv",
  starbucksTaxonomy: "/Users/aayu/pulse_demo_research/starbucks_seed_taxonomy.csv",
  demoQueries: "/Users/aayu/pulse_demo_research/demo_queries.csv"
};

export const companyDefinitions: Record<CompanyId, CompanyDefinition> = {
  costco: {
    id: "costco",
    name: "Costco",
    hours: "Warehouse and delivery availability varies by location",
    catalogLabel: "5,329 Costco catalog rows: 5,011 local rows + 318 PR #6 seed rows",
    rules: [
      "Assume caller has a Costco membership before placing orders.",
      "Do not claim exact local stock or warehouse pricing without location confirmation.",
      "Route strict allergy, alcohol/Rx, perishable timing, high-spend, and compatibility requests to review.",
      "Prefer Kirkland/private-label substitutions when the customer asks for value.",
      "Auto-order only known recurring non-perishable or nonfood items under the customer threshold."
    ],
    officialFacts: [
      "Costco Same-Day is member-only and powered by Instacart.",
      "2-Day Grocery is for non-perishable pantry items in select markets.",
      "Online, same-day, and warehouse prices and availability can differ."
    ]
  },
  starbucks: {
    id: "starbucks",
    name: "Starbucks",
    hours: "Store availability varies by location and season",
    catalogLabel: "935 official menu/catalog rows",
    rules: [
      "Translate plain English into menu items and sizes; avoid Starbucks jargon unless useful.",
      "Ask hot/cold, caffeine, sweetness, and dairy preference when missing.",
      "Do not guess severe allergies, strict vegan suitability, or secret-menu recipes.",
      "Mobile order modifiers and product availability can be limited by store and market.",
      "Auto-order exact remembered drinks only after confirmation."
    ],
    officialFacts: [
      "Starbucks publishes official menu and nutrition pages.",
      "Product availability and modifiers may vary by store or market.",
      "Secret menu names are unofficial; ask for the recipe or modifications."
    ]
  }
};

let bundleCache: CatalogBundle | null = null;

export async function loadCatalogBundle(): Promise<CatalogBundle> {
  if (bundleCache) return bundleCache;

  const [costcoRows, starbucksRows, costcoTaxonomy, starbucksTaxonomy, demoRows] = await Promise.all([
    readCsv(external.costcoCatalog),
    readCsv(external.starbucksCatalog),
    readTaxonomy(external.costcoTaxonomy),
    readTaxonomy(external.starbucksTaxonomy),
    readCsv(external.demoQueries)
  ]);

  const costco = costcoRows.map((row) => normalizeCostcoRow(row, costcoTaxonomy));
  const starbucks = starbucksRows.map((row, index) => normalizeStarbucksRow(row, starbucksTaxonomy, index));
  const items = { costco, starbucks };
  bundleCache = {
    companies: companyDefinitions,
    items,
    indexes: {
      costco: buildIndex(costco),
      starbucks: buildIndex(starbucks)
    },
    demoQueries: demoRows
      .map((row) => ({
        company: normalizeCompanyId(row.company),
        persona: row.persona ?? "",
        query: row.query ?? "",
        expected_match_behavior: row.expected_match_behavior ?? "",
        clarifying_question: row.clarifying_question ?? "",
        auto_order_allowed: row.auto_order_allowed ?? "",
        notes: row.notes ?? ""
      }))
      .filter((row): row is DemoQuery => Boolean(row.company && row.query))
  };

  return bundleCache;
}

export async function ensureCompanyBrains(gbrainDir: string) {
  const bundle = await loadCatalogBundle();
  await Promise.all((Object.keys(companyDefinitions) as CompanyId[]).map(async (companyId) => {
    const companyDir = path.join(gbrainDir, "companies", companyId);
    await mkdir(companyDir, { recursive: true });
    const items = bundle.items[companyId];
    const definition = companyDefinitions[companyId];
    await Promise.all([
      writeFile(path.join(companyDir, "company.md"), companyMarkdown(definition, items), "utf8"),
      writeFile(path.join(companyDir, "catalog-index.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8"),
      ...(companyId === "costco" ? [
        writeFile(path.join(companyDir, "policies.md"), seededCostcoPolicies, "utf8"),
        writeFile(path.join(companyDir, "allergens.md"), seededCostcoAllergens, "utf8")
      ] : [])
    ]);
  }));
}

export async function getCompanies() {
  const bundle = await loadCatalogBundle();
  return (Object.keys(companyDefinitions) as CompanyId[]).map((id) => ({
    ...companyDefinitions[id],
    catalogCount: bundle.items[id].length,
    sampleItems: bundle.items[id].slice(0, 6)
  }));
}

export async function getCompanyCatalog(companyId: CompanyId) {
  const bundle = await loadCatalogBundle();
  return bundle.items[companyId];
}

export async function getDemoQueries(companyId?: CompanyId) {
  const bundle = await loadCatalogBundle();
  return companyId ? bundle.demoQueries.filter((query) => query.company === companyId) : bundle.demoQueries;
}

export async function searchCatalog(input: {
  companyId: CompanyId;
  query: string;
  customer?: {
    likes: string[];
    avoids: string[];
    lastOrder: string;
    recurringItems?: string[];
    budgetThreshold?: number;
  };
}): Promise<CatalogSearchResponse> {
  const started = performance.now();
  const bundle = await loadCatalogBundle();
  const items = bundle.items[input.companyId];
  const index = bundle.indexes[input.companyId];
  const query = input.query.trim();
  const hits = bm25(index, query, items.length);
  const maxScore = Math.max(1, hits[0]?.score ?? 1);
  const queryTokens = new Set(tokens(query));
  const queryReviewReasons = reviewReasonsForQuery(input.companyId, query);
  const referenceQuery = /\b(same|usual|again|reorder|last month|usually)\b/i.test(query);

  const ranked = hits.map((hit) => {
    const item = items[hit.docId];
    const itemText = searchableText(item).toLowerCase();
    const evidence = evidenceFor(item, queryTokens);
    const personalization = personalizationFor(item, input.customer, referenceQuery);
    const reviewReasons = [...new Set([...queryReviewReasons, ...item.review_required_reason])];
    const tokenScore = hit.score / maxScore;
    const evidenceScore = Math.min(1, evidence.length / 4);
    const personalScore = personalization.note ? personalization.score : 0;
    const categoryBoost = categoryIntentScore(input.companyId, query, item);
    const addOnPenalty = input.companyId === "starbucks" && item.attributes.product_type === "Customization/Add-on" && !/\b(add|syrup|modifier|foam|shot|pump)\b/i.test(query) ? 0.28 : 0;
    const penalty = reviewReasons.length ? 0.08 : 0;
    const score = clamp(0.58 * tokenScore + 0.28 * evidenceScore + personalScore + categoryBoost + (item.active ? 0.04 : -0.12) - penalty - addOnPenalty, 0, 1.2);

    return {
      item,
      evidence: evidence.length ? evidence : [`Matched catalog text: ${itemText.slice(0, 96)}`],
      personalized: Boolean(personalization.note),
      personalization_note: personalization.note,
      reviewReasons,
      score
    };
  }).sort((left, right) => right.score - left.score);

  const topScore = ranked[0]?.score ?? 0;
  const secondScore = ranked[1]?.score ?? 0;
  const ambiguous = topScore > 0 && topScore - secondScore < 0.04;
  const displayRanked = diversifyRanked(input.companyId, query, ranked);
  const results = displayRanked.slice(0, 5).map((candidate, index) => {
    const confidence = confidenceFor(candidate.score, topScore, candidate.reviewReasons.length, ambiguous, candidate.personalized);
    return {
      rank: index + 1,
      sku: candidate.item.sku,
      catalog_id: candidate.item.catalog_id,
      name: candidate.item.name,
      description: candidate.item.description,
      category: candidate.item.category,
      source_url: candidate.item.source_url,
      score: round(candidate.score),
      confidence,
      confidence_label: confidenceLabel(confidence),
      personalized: candidate.personalized,
      personalization_note: candidate.personalization_note,
      match_evidence: candidate.evidence,
      review_reasons: candidate.reviewReasons,
      can_auto_order: canAutoOrder(confidence, candidate.reviewReasons, ambiguous, referenceQuery, input.customer),
      stock_seed: candidate.item.stock_seed,
      price_band_seed: candidate.item.price_band_seed
    } satisfies CatalogMatch;
  });

  const reviewRequired = results.some((result) => result.review_reasons.length > 0) || ambiguous;
  const lowConfidence = (results[0]?.confidence ?? 0) < 0.62;

  return {
    company_id: input.companyId,
    query,
    results,
    decision: !results.length ? "no-match" : lowConfidence ? "clarify" : results[0]?.can_auto_order ? "ready-to-order" : reviewRequired ? "review" : "clarify",
    meta: {
      catalog_count: items.length,
      latency_ms: Math.round((performance.now() - started) * 10) / 10,
      low_confidence_overall: lowConfidence,
      ambiguous_query: ambiguous,
      review_required: reviewRequired,
      clarifying_question: clarifyingQuestion(input.companyId, query, reviewRequired, lowConfidence)
    }
  };
}

export function normalizeCompanyId(value: unknown): CompanyId {
  return String(value ?? "costco").toLowerCase().includes("starbucks") ? "starbucks" : "costco";
}

async function readTaxonomy(filePath: string): Promise<TaxonomyRow[]> {
  const rows = await readCsv(filePath);
  return rows.map((row) => ({
    category: row.category ?? "",
    tags: splitList(row.tags),
    use_cases: row.use_cases,
    dietary_notes: row.dietary_notes,
    price_band: row.price_band,
    stock_seed: row.stock_seed,
    hot_cold: row.hot_cold,
    caffeine_level: row.caffeine_level,
    dairy_free_possible: row.dairy_free_possible,
    sweetness: row.sweetness,
    allergen_notes: row.allergen_notes
  }));
}

async function readCsv(filePath: string): Promise<CsvRow[]> {
  const raw = await readFile(filePath, "utf8");
  return parseCsv(raw);
}

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === "\"" && text[i + 1] === "\"") {
        field += "\"";
        i += 1;
      } else if (ch === "\"") {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === "\"") {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const headers = rows.shift()?.map((header) => header.replace(/^\uFEFF/, "")) ?? [];
  return rows
    .filter((items) => items.length === headers.length)
    .map((items) => Object.fromEntries(headers.map((header, index) => [header, items[index] ?? ""])));
}

function normalizeCostcoRow(row: CsvRow, taxonomy: TaxonomyRow[]): CatalogItem {
  const name = titleCase(row.catalog_description ?? "");
  const category = costcoCategory(name);
  const taxonomyRow = taxonomy.find((candidate) => candidate.category === category) ?? taxonomy[0];
  const tags = [...new Set([...(taxonomyRow?.tags ?? []), ...costcoInferredTags(name)])];
  const stock = seededChoice(row.sku, taxonomyRow?.stock_seed, "location_required");
  const priceBand = seededPriceBand(row.sku, taxonomyRow?.price_band ?? "mid");
  const reviewReasons = costcoReviewReasons(name, category, tags);

  return {
    company_id: "costco",
    catalog_id: row.catalog_id,
    sku: row.sku,
    name,
    description: name,
    active: row.active?.toLowerCase() === "y",
    category,
    tags,
    source_url: row.product_url,
    lastmod: row.lastmod,
    price_band_seed: priceBand,
    stock_seed: stock,
    review_required_reason: reviewReasons,
    attributes: {
      normalized_category: category,
      event_tags: tags.filter((tag) => ["office", "party", "pantry", "facilities", "event", "breakroom", "community"].includes(tag)),
      dietary_tags: tags.filter((tag) => ["gluten-free", "organic", "vegan", "kosher", "sugar-free", "nut-free"].includes(tag)),
      pack_count_estimate: packCount(name),
      unit_size_estimate: unitSize(name),
      storage_tag: storageTag(name, category),
      brand_tag: name.toLowerCase().includes("kirkland") ? "Kirkland Signature" : "national_brand_or_unknown",
      price_band_seed: priceBand,
      stock_seed: stock,
      review_required_reason: reviewReasons
    }
  };
}

function normalizeStarbucksRow(row: CsvRow, taxonomy: TaxonomyRow[], index: number): CatalogItem {
  const productName = row.product_name || row.category || `Starbucks item ${index + 1}`;
  const size = row.size_code ? ` ${row.size_code}` : "";
  const form = row.form_code ? ` ${row.form_code}` : "";
  const name = `${productName}${size}${form}`.replace(/\s+/g, " ").trim();
  const category = starbucksCategory(row, taxonomy);
  const taxonomyRow = taxonomy.find((candidate) => candidate.category === category) ?? taxonomy[0];
  const tags = [...new Set([...(taxonomyRow?.tags ?? []), ...splitList(row.category_path), ...splitList(row.subcategory)])];
  const reviewReasons = starbucksReviewReasons(name, category, taxonomyRow);

  return {
    company_id: "starbucks",
    catalog_id: row.product_number || `SBUX-${index + 1}`,
    sku: row.sku || `${row.product_number || index + 1}-${row.form_code || "item"}-${row.size_code || "default"}`,
    name,
    description: [productName, row.category_path, row.product_type, row.availability].filter(Boolean).join(" · "),
    active: row.availability !== "Unavailable",
    category,
    tags,
    source_url: row.uri,
    price_band_seed: row.product_type === "Food" ? "mid" : "low|mid",
    stock_seed: "location_required",
    review_required_reason: reviewReasons,
    attributes: {
      drink_category: category,
      hot_cold: taxonomyRow?.hot_cold ?? row.form_code ?? null,
      caffeine_level: taxonomyRow?.caffeine_level ?? "varies",
      dairy_free_possible: taxonomyRow?.dairy_free_possible ?? "item-specific",
      sweetness_level: taxonomyRow?.sweetness ?? "varies",
      flavor_tags: tags,
      allergen_caution: taxonomyRow?.allergen_notes ?? "Cross-contact possible; verify product ingredients for allergens",
      good_for_tags: tags.filter((tag) => ["light", "dessert-like", "refreshing", "coffee-forward", "cozy", "kid-friendly", "breakfast"].includes(tag)),
      jargon_translation: "Tall=small, Grande=medium, Venti=large, Trenta=extra large cold where supported",
      product_type: row.product_type,
      row_type: row.row_type
    }
  };
}

function buildIndex(items: CatalogItem[]): CatalogIndex {
  const docs = items.map(searchableText);
  const tokensByDoc = docs.map(tokens);
  const inverted = new Map<string, Map<number, number>>();
  tokensByDoc.forEach((docTokens, docId) => {
    for (const token of docTokens) {
      if (!inverted.has(token)) inverted.set(token, new Map());
      const postings = inverted.get(token)!;
      postings.set(docId, (postings.get(docId) ?? 0) + 1);
    }
  });
  const avgLength = tokensByDoc.reduce((total, doc) => total + doc.length, 0) / Math.max(1, tokensByDoc.length);
  return { docs, tokensByDoc, inverted, avgLength };
}

function bm25(index: CatalogIndex, query: string, topK: number) {
  const queryTokens = new Set(tokens(expandQuery(query)));
  const scores = new Map<number, number>();
  for (const token of queryTokens) {
    const postings = index.inverted.get(token);
    if (!postings) continue;
    const idf = Math.log(((index.docs.length - postings.size + 0.5) / (postings.size + 0.5)) + 1);
    for (const [docId, tf] of postings) {
      const docLength = index.tokensByDoc[docId]?.length ?? 1;
      const denom = tf + 1.5 * (1 - 0.75 + 0.75 * docLength / Math.max(1, index.avgLength));
      scores.set(docId, (scores.get(docId) ?? 0) + idf * (tf * 2.5) / denom);
    }
  }
  const ranked = scores.size
    ? [...scores.entries()].map(([docId, score]) => ({ docId, score }))
    : index.docs.map((_doc, docId) => ({ docId, score: 0 }));
  return ranked.sort((left, right) => right.score - left.score).slice(0, topK);
}

function searchableText(item: CatalogItem) {
  return [
    item.name,
    item.description,
    item.sku,
    item.category,
    item.tags.join(" "),
    Object.values(item.attributes).flat().join(" ")
  ].filter(Boolean).join(" ");
}

function evidenceFor(item: CatalogItem, queryTokens: Set<string>) {
  const itemTokens = new Set(tokens(searchableText(item)));
  const matches = [...queryTokens].filter((token) => itemTokens.has(token));
  return [
    ...matches.slice(0, 4).map((token) => `Matched "${token}" in ${item.category}.`),
    ...(item.tags.includes("kirkland") ? ["Kirkland/private-label value option."] : [])
  ].slice(0, 5);
}

function personalizationFor(item: CatalogItem, customer: Parameters<typeof searchCatalog>[0]["customer"], referenceQuery: boolean) {
  if (!customer) return { score: 0, note: null as string | null };
  const text = searchableText(item).toLowerCase();
  const recurring = customer.recurringItems?.find((entry) => text.includes(entry.toLowerCase()));
  if (recurring) return { score: referenceQuery ? 0.2 : 0.1, note: `matches recurring item: ${recurring}` };
  const like = customer.likes.find((entry) => text.includes(entry.toLowerCase()));
  if (like) return { score: 0.07, note: `matches customer preference: ${like}` };
  if (item.company_id === "costco" && customer.likes.some((entry) => entry.toLowerCase().includes("kirkland")) && text.includes("kirkland")) {
    return { score: 0.08, note: "matches Kirkland value preference" };
  }
  return { score: 0, note: null };
}

function reviewReasonsForQuery(companyId: CompanyId, query: string) {
  const lower = query.toLowerCase();
  const reasons: string[] = [];
  if (/allerg|nut-free|gluten-free|vegan|pork|kosher|halal/.test(lower)) reasons.push("dietary/allergy review");
  if (/tomorrow|today|saturday|delivery|pickup|same-day|same day|specific time/.test(lower)) reasons.push("fulfillment timing review");
  if (/under|budget|\$\d+|cheapest/.test(lower)) reasons.push("budget confirmation");
  if (companyId === "costco" && /party|breakfast|event|kids|adults|people|board meeting/.test(lower)) reasons.push("event quantity review");
  if (companyId === "costco" && /\b(?:ink|printer|appliance|compatible|model)\b/.test(lower)) reasons.push("compatibility review");
  if (companyId === "starbucks" && /secret menu|twix|vegan|nut-free|allergy/.test(lower)) reasons.push("ingredient/store confirmation");
  return reasons;
}

function canAutoOrder(confidence: number, reviewReasons: string[], ambiguous: boolean, referenceQuery: boolean, customer: Parameters<typeof searchCatalog>[0]["customer"]) {
  return confidence >= 0.9 && reviewReasons.length === 0 && !ambiguous && (referenceQuery || Boolean(customer?.recurringItems?.length));
}

function confidenceFor(score: number, topScore: number, reviewReasonCount: number, ambiguous: boolean, personalized: boolean) {
  let value = 0.24 + 0.5 * clamp(score / Math.max(1, topScore), 0, 1) + 0.24 * clamp(score, 0, 1);
  if (personalized) value += 0.08;
  if (reviewReasonCount) value -= Math.min(0.18, reviewReasonCount * 0.045);
  if (ambiguous) value -= 0.07;
  return round(clamp(value, 0.05, 0.97));
}

function confidenceLabel(value: number): CatalogMatch["confidence_label"] {
  if (value >= 0.86) return "high";
  if (value >= 0.62) return "medium";
  return "low";
}

function clarifyingQuestion(companyId: CompanyId, query: string, reviewRequired: boolean, lowConfidence: boolean) {
  const lower = query.toLowerCase();
  if (companyId === "costco") {
    if (/people|event|party|breakfast|meeting/.test(lower)) return "Any dietary restrictions, and do you need delivery or warehouse pickup?";
    if (/same|usual|last month|reorder/.test(lower)) return "Should I keep the same quantities as last time?";
    if (reviewRequired || lowConfidence) return "What headcount, budget, and fulfillment timing should I optimize for?";
  }
  if (companyId === "starbucks") {
    if (!/hot|cold|iced|warm/.test(lower)) return "Do you want that hot or cold?";
    if (!/coffee|caffeine|tea|refresher/.test(lower)) return "Do you want coffee-forward, tea, or fruity?";
    if (reviewRequired || lowConfidence) return "Is this a strict allergy/dietary requirement, or just a preference?";
  }
  return null;
}

const seededCostcoPolicies = `---
title: Costco Wholesale Policies
category: company-brain
business: costco
source: Aarya PR #6 demo seed
seeded: true
---

# Costco Wholesale Policies

These policy notes are demo-seeded from Aarya PR #6. They are not a live Costco API or authenticated Costco policy feed.

## Membership
- Purchases require an active Costco membership.
- If the caller does not have a membership, route them to signup or member services before ordering.

## Fulfillment Timing
- Same-day pickup and delivery availability depends on location, item eligibility, and current store conditions.
- Quote timing conservatively and ask for pickup/delivery preference before confirming.
- Time-sensitive, perishable, large-event, or weekend peak requests require review.

## Bulk and Business Orders
- Large orders may need business delivery scheduling, quantity confirmation, or human review.
- Mention Kirkland/private-label alternatives when the caller asks for value.
- Confirm substitutions for grocery and perishable items before order placement.

## Return and Service Boundaries
- Do not promise exact return windows for edge cases; route to member services when uncertain.
- Electronics, jewelry, optical, pharmacy, travel, prescription, and complaint workflows require specialist review.

## Escalation Rules
- Escalate charge disputes, quality complaints, prescription/optical/hearing/travel requests, strict allergy questions, high-value orders, and compatibility questions.
- For uncertain policy questions say the assistant needs a specialist to verify current warehouse-specific details.
`;

const seededCostcoAllergens = `---
title: Costco Wholesale Allergen Information
category: company-brain
business: costco
source: Aarya PR #6 demo seed
seeded: true
---

# Costco Wholesale Allergen Information

These allergen notes are demo-seeded from Aarya PR #6. They should guide review routing, not replace package labels or official ingredient verification.

## Common Allergen Cautions
- Dairy: milk, butter, cheese, yogurt, ice cream, croissants, Caesar kits, lasagna, and many bakery items.
- Gluten or wheat: breads, bagels, croissants, cookies, pasta, dumplings, and many snack bars.
- Tree nuts or peanuts: trail mixes, mixed nuts, almonds, peanut butter, almond milk, and some granola/snack bars.
- Soy: many sauces, marinades, dumplings, snack bars, and some infant formulas.
- Eggs: eggs, baked goods, croissants, pasta dishes, and some protein bars.
- Fish and shellfish: seafood items need exact label or specialist confirmation.
- Sesame: hummus/tahini, sesame bagels, and some bread products.

## Severe Allergy Handling
- Always escalate peanut allergy, tree nut allergy, shellfish allergy, celiac/severe gluten restriction, multiple food allergies, child allergy, EpiPen, or anaphylaxis mentions.
- Never call bakery or prepared foods allergen-safe; shared facilities and cross-contact are possible.
- Organic, natural, or Kirkland does not mean allergen-free.

## Safer Demo Language
- Say ingredient information may change and the caller should verify the package label.
- If unsure, transfer to a specialist who can confirm exact ingredients and cross-contamination risk.
`;

function companyMarkdown(definition: CompanyDefinition, items: CatalogItem[]) {
  const categories = [...new Set(items.map((item) => item.category))].sort();
  const featured = items.slice(0, 80);
  const seededDocs = definition.id === "costco"
    ? ["", "## Demo-Seeded PR #6 Brain Files", "- policies.md: Costco operational policy seeds from Aarya PR #6.", "- allergens.md: Costco allergen and escalation seeds from Aarya PR #6."]
    : [];
  return [
    `# ${definition.name} Company Brain`,
    "",
    `Catalog: ${definition.catalogLabel}`,
    `Hours: ${definition.hours}`,
    "",
    "## Official Facts",
    ...definition.officialFacts.map((fact) => `- ${fact}`),
    "",
    "## Rules",
    ...definition.rules.map((rule) => `- ${rule}`),
    "",
    "## Categories",
    ...categories.map((category) => `- ${category}`),
    "",
    "## Featured Catalog Rows",
    ...featured.map((item) => `- ${item.name} (${item.sku}) — ${item.category}; ${item.stock_seed}; ${item.price_band_seed}`),
    ...seededDocs
  ].join("\n");
}

function costcoCategory(name: string) {
  const lower = name.toLowerCase();
  if (/refrigerator|washer|dryer|range|dishwasher|mattress|sofa|tv|television|laptop|computer|subscription/.test(lower)) return "Other catalog";
  if (/shop card|gift card/.test(lower)) return "Gift cards and shop cards";
  if (/paper towel|trash bag|disinfect|wipes|detergent|clean|janitorial|soap/.test(lower)) return "Cleaning and facilities supplies";
  if (/plate|cup|napkin|utensil|bowl|serveware|fork|spoon/.test(lower)) return "Paper and disposable serveware";
  if (/coffee|k-cup|keurig|creamer|sweetener|sugar/.test(lower)) return "Coffee and breakroom";
  if (/water|sparkling|soda|juice|tea|drink|beverage|coke|pepsi/.test(lower) && !/tuna|chicken|dispenser|refrigerator/.test(lower)) return "Beverages";
  if (/bakery|cake|cookie|muffin|dessert|chocolate|brownie|pastry/.test(lower)) return "Bakery and desserts";
  if (/frozen|appetizer|pizza|meal/.test(lower)) return "Frozen appetizers and meals";
  if (/produce|fruit|vegetable|salad|organic/.test(lower)) return "Produce and healthy snacks";
  if (/deli|prepared|tray|platter|charcuterie|cheese/.test(lower)) return "Fresh deli and prepared foods";
  if (/snack|chips|bar|granola|popcorn|pretzel|cracker|nuts/.test(lower)) return "Shelf-stable snacks";
  if (/kirkland/.test(lower)) return "Kirkland Signature/private label";
  return "Shelf-stable snacks";
}

function starbucksCategory(row: CsvRow, taxonomy: TaxonomyRow[]) {
  const text = `${row.category} ${row.subcategory} ${row.category_path} ${row.product_name} ${row.form_code}`.toLowerCase();
  const exact = taxonomy.find((candidate) => text.includes(candidate.category.toLowerCase()));
  if (exact) return exact.category;
  if (/frappuccino|blended/.test(text)) return "Frappuccino Blended Beverages";
  if (/refresher/.test(text)) return "Refreshers";
  if (/chai|tea|matcha/.test(text)) return "Tea and Chai";
  if (/cold brew|iced coffee|shaken espresso/.test(text)) return "Cold Coffee";
  if (/latte|macchiato|cappuccino|americano|espresso/.test(text)) return "Espresso Drinks";
  if (/hot chocolate|steamer/.test(text)) return "Hot Chocolate and Steamers";
  if (/foam/.test(text)) return "Cold Foam drinks";
  if (/food|bakery|sandwich|cake|egg|protein box/.test(text)) return "Bakery/Food";
  if (/packaged|bottled|at home/.test(text)) return "Packaged Beverages";
  return row.form_code === "Hot" ? "Hot Coffee" : "Cold Coffee";
}

function costcoInferredTags(name: string) {
  const lower = name.toLowerCase();
  const tags: string[] = [];
  if (lower.includes("kirkland")) tags.push("kirkland", "value");
  if (/gluten.?free/.test(lower)) tags.push("gluten-free");
  if (/organic/.test(lower)) tags.push("organic");
  if (/vegan/.test(lower)) tags.push("vegan");
  if (/kosher/.test(lower)) tags.push("kosher");
  if (/sugar.?free/.test(lower)) tags.push("sugar-free");
  if (/party|platter|tray|cake/.test(lower)) tags.push("party");
  return tags;
}

function costcoReviewReasons(name: string, category: string, tags: string[]) {
  const lower = name.toLowerCase();
  const reasons: string[] = [];
  if (["Fresh deli and prepared foods", "Bakery and desserts", "Produce and healthy snacks"].includes(category)) reasons.push("perishable/local availability");
  if (/\b(?:wine|beer|liquor|pharmacy|rx|prescription)\b/.test(lower)) reasons.push("restricted category");
  if (/\b(?:ink|cartridge|appliance|filter)\b/.test(lower)) reasons.push("compatibility may be required");
  if (tags.some((tag) => ["gluten-free", "vegan", "kosher", "nut-free"].includes(tag))) reasons.push("dietary claim verification");
  return reasons;
}

function starbucksReviewReasons(name: string, category: string, taxonomy?: TaxonomyRow) {
  const lower = name.toLowerCase();
  const reasons: string[] = [];
  if (/almond|nut|vegan|frappuccino|foam|sauce|chip/.test(lower)) reasons.push("ingredient/store confirmation");
  if (category === "Bakery/Food") reasons.push("food allergen confirmation");
  if (taxonomy?.allergen_notes?.toLowerCase().includes("higher")) reasons.push("higher allergen complexity");
  return reasons;
}

function storageTag(name: string, category: string) {
  const lower = name.toLowerCase();
  if (category.includes("Frozen") || lower.includes("frozen")) return "frozen";
  if (["Fresh deli and prepared foods", "Produce and healthy snacks", "Bakery and desserts"].includes(category)) return "perishable";
  if (/paper towel|trash bag|case|pallet/.test(lower)) return "bulky";
  return "shelf_stable";
}

function packCount(text: string) {
  const match = text.match(/\b(\d+)\s*(?:ct|count|pack|pk|pieces|bottles|cans)\b/i);
  return match ? Number(match[1]) : null;
}

function unitSize(text: string) {
  return text.match(/\b\d+(?:\.\d+)?\s*(?:oz|fl oz|lb|lbs|gallon|ml|liter|l)\b/i)?.[0] ?? null;
}

function seededChoice(key: string, spec: string | undefined, fallback: CatalogItem["stock_seed"]) {
  if (!spec) return fallback;
  const parts = spec.split(";").map((part) => {
    const [rawKey, rawValue] = part.split(":");
    return { key: rawKey === "out" ? "out_of_stock" : rawKey, value: Number(rawValue) };
  }).filter((part) => part.key && Number.isFinite(part.value));
  const roll = (hash(key) % 100) / 100;
  let cumulative = 0;
  for (const part of parts) {
    cumulative += part.value;
    if (roll <= cumulative) return part.key as CatalogItem["stock_seed"];
  }
  return fallback;
}

function seededPriceBand(key: string, spec: string) {
  const parts = spec.split("|").filter(Boolean);
  if (!parts.length) return "mid";
  return parts[hash(key) % parts.length] ?? parts[0] ?? "mid";
}

function splitList(value: string | undefined) {
  return String(value ?? "")
    .split(/[;,]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function tokens(text: string) {
  return normalize(text)
    .split(/\s+/)
    .flatMap((token) => token.length > 2 ? [token, ...synonyms(token)] : [])
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

const STOPWORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "that",
  "this",
  "about",
  "need",
  "want",
  "keep",
  "next",
  "week",
  "people",
  "person",
  "under",
  "something",
  "whatever",
  "only"
]);

function categoryIntentScore(companyId: CompanyId, query: string, item: CatalogItem) {
  const lower = query.toLowerCase();
  if (companyId === "costco") {
    let score = 0;
    if (/\b(snack|snacks|healthy)\b/.test(lower) && item.category === "Shelf-stable snacks") score += 0.22;
    if (/\b(drink|drinks|water|beverage)\b/.test(lower) && item.category === "Beverages") score += 0.24;
    if (/\b(coffee|breakroom)\b/.test(lower) && item.category === "Coffee and breakroom") score += 0.2;
    if (/\b(office|meeting|event|party|breakfast)\b/.test(lower) && item.tags.some((tag) => ["office", "event", "party", "breakroom"].includes(tag))) score += 0.12;
    if (/\b(plate|cup|napkin|utensil|supplies)\b/.test(lower) && item.category === "Paper and disposable serveware") score += 0.18;
    if (item.category === "Other catalog") score -= 0.3;
    return score;
  }

  let score = 0;
  if (/\bcold|iced|refreshing\b/.test(lower) && String(item.attributes.hot_cold).includes("cold")) score += 0.18;
  if (/\bhot|warm|cozy\b/.test(lower) && String(item.attributes.hot_cold).includes("hot")) score += 0.18;
  if (/\bcaffeine|coffee\b/.test(lower) && !String(item.attributes.caffeine_level).includes("none")) score += 0.12;
  if (/\bdairy|oat\b/.test(lower) && String(item.attributes.dairy_free_possible).includes("yes")) score += 0.1;
  if (/\bdessert|sweet\b/.test(lower) && String(item.attributes.sweetness_level).includes("high")) score += 0.12;
  return score;
}

function diversifyRanked<T extends { item: CatalogItem; score: number }>(companyId: CompanyId, query: string, ranked: T[]) {
  if (companyId !== "costco" || !/\b(snack|snacks|drink|drinks|office|event|meeting)\b/i.test(query)) return ranked;
  const wanted = ["Beverages", "Shelf-stable snacks", "Coffee and breakroom", "Paper and disposable serveware", "Produce and healthy snacks"];
  const selected: T[] = [];
  const used = new Set<string>();
  for (const category of wanted) {
    const match = ranked.find((candidate) => candidate.item.category === category && !used.has(candidate.item.sku));
    if (match) {
      selected.push(match);
      used.add(match.item.sku);
    }
  }
  for (const candidate of ranked) {
    if (selected.length >= ranked.length) break;
    if (!used.has(candidate.item.sku)) {
      selected.push(candidate);
      used.add(candidate.item.sku);
    }
  }
  return selected;
}

function expandQuery(query: string) {
  return query
    .replace(/\bsnacks\b/gi, "snacks chips bars popcorn pretzels crackers")
    .replace(/\bdrinks\b/gi, "drinks water sparkling soda juice beverages")
    .replace(/\bbreakroom\b/gi, "breakroom coffee cups paper towels snacks drinks")
    .replace(/\bcozy\b/gi, "cozy warm chai cinnamon latte")
    .replace(/\bnot too sweet\b/gi, "low sweetness unsweetened light syrup")
    .replace(/\bno dairy\b/gi, "oat almond dairy-free no whip");
}

function synonyms(token: string) {
  const map: Record<string, string[]> = {
    kids: ["children"],
    people: ["headcount", "event"],
    office: ["breakroom", "business"],
    healthy: ["fruit", "organic"],
    caffeine: ["coffee", "tea", "refresher"],
    dairy: ["milk", "oat"],
    medium: ["grande"],
    small: ["tall"],
    large: ["venti"]
  };
  return map[token] ?? [];
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/&apos;|&#39;/g, "'")
    .replace(/[^a-z0-9$]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(text: string) {
  return text
    .replace(/&apos;|&#39;/g, "'")
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .replace(/\bMg\b/g, "mg")
    .replace(/\bOz\b/g, "oz");
}

function hash(value: string) {
  let out = 0;
  for (let i = 0; i < value.length; i += 1) out = (out * 31 + value.charCodeAt(i)) >>> 0;
  return out;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
