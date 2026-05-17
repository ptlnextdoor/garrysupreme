import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { companyDefinitions, getCompanyCatalog, normalizeCompanyId, type CatalogItem, type CompanyId } from "./catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ycGbrainRoot = path.resolve(__dirname, "../..");
const workspaceRoot = path.resolve(ycGbrainRoot, "..");
const defaultImportDir = path.join(workspaceRoot, ".context", "real-gbrain-import");

type GBrainRunResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  command: string[];
  error?: string;
};

export type GBrainStatus = {
  enabled: boolean;
  cliPath: string;
  importDir: string;
  available: boolean;
  convexWritesDisabled: boolean;
  reason?: string;
};

export async function getLocalGBrainStatus(): Promise<GBrainStatus> {
  const cliPath = process.env.GBRAIN_CLI_PATH ?? "gbrain";
  const importDir = process.env.GBRAIN_IMPORT_DIR ?? defaultImportDir;
  const available = await commandAvailable(cliPath);
  const enabled = process.env.GBRAIN_LOCAL_ENABLED === "true";
  return {
    enabled,
    cliPath,
    importDir,
    available,
    convexWritesDisabled: process.env.CONVEX_WRITE_ENABLED !== "true",
    reason: enabled ? undefined : "Set GBRAIN_LOCAL_ENABLED=true to allow local GBrain CLI calls."
  };
}

export async function seedLocalGBrain(companyIdInput: unknown = "costco") {
  const companyId = normalizeCompanyId(companyIdInput);
  assertLocalGBrainEnabled();

  const importDir = process.env.GBRAIN_IMPORT_DIR ?? defaultImportDir;
  const companyDir = await writeGBrainImportCorpus(importDir, companyId);
  const args = ["import", companyDir, "--no-embed", "--workers", process.env.GBRAIN_IMPORT_WORKERS ?? "4", "--json"];
  const importResult = await runGBrain(args);
  return {
    companyId,
    importDir: companyDir,
    pageCount: await expectedPageCount(companyId),
    importResult
  };
}

export async function queryLocalGBrain(query: string) {
  assertLocalGBrainEnabled();
  const hybrid = await runGBrain(["query", query]);
  if (hybrid.ok && hybrid.stdout.trim() && !hybrid.stdout.trim().startsWith("No results.")) return hybrid;

  const keyword = await runGBrain(["search", query]);
  return {
    ...keyword,
    stderr: [hybrid.stderr, keyword.stderr].filter(Boolean).join("\n"),
    ...(keyword.ok ? { error: undefined } : { error: keyword.error })
  };
}

async function writeGBrainImportCorpus(importRoot: string, companyId: CompanyId) {
  const company = companyDefinitions[companyId];
  const items = await getCompanyCatalog(companyId);
  const companyDir = path.join(importRoot, companyId);
  const catalogDir = path.join(companyDir, "catalog");

  await rm(companyDir, { recursive: true, force: true });
  await mkdir(catalogDir, { recursive: true });

  await writeFile(path.join(companyDir, "company.md"), companyPage(companyId, items), "utf8");
  await writeFile(path.join(companyDir, "customer-aarya.md"), aaryaCustomerPage(), "utf8");

  if (companyId === "costco") {
    await writeFile(path.join(companyDir, "policies.md"), costcoPolicyPage(), "utf8");
    await writeFile(path.join(companyDir, "allergens.md"), costcoAllergenPage(), "utf8");
  }

  const limit = Number(process.env.GBRAIN_CATALOG_IMPORT_LIMIT ?? items.length);
  for (const item of items.slice(0, limit)) {
    const filename = `${safeFilename(item.sku || item.catalog_id)}.md`;
    await writeFile(path.join(catalogDir, filename), catalogItemPage(item), "utf8");
  }

  console.log(`[real-gbrain] wrote ${Math.min(limit, items.length)} ${company.name} catalog pages to ${companyDir}`);
  return companyDir;
}

async function expectedPageCount(companyId: CompanyId) {
  const items = await getCompanyCatalog(companyId);
  const limit = Number(process.env.GBRAIN_CATALOG_IMPORT_LIMIT ?? items.length);
  return Math.min(limit, items.length) + (companyId === "costco" ? 4 : 2);
}

function companyPage(companyId: CompanyId, items: CatalogItem[]) {
  const company = companyDefinitions[companyId];
  const categories = [...new Set(items.map((item) => item.category))].sort();
  return markdown({
    title: `${company.name} Company Brain`,
    type: "company",
    company: companyId,
    tags: [companyId, "company-brain", "pulse-demo"],
    source: "pulse-real-gbrain-branch",
    seeded: true
  }, [
    `# ${company.name} Company Brain`,
    "",
    "## Compiled Truth",
    `Catalog: ${company.catalogLabel}`,
    `Hours: ${company.hours}`,
    "",
    "### Official Facts",
    ...company.officialFacts.map((fact) => `- ${fact}`),
    "",
    "### Operating Rules",
    ...company.rules.map((rule) => `- ${rule}`),
    "",
    "### Catalog Categories",
    ...categories.map((category) => `- ${category}`),
    "",
    "---",
    "## Timeline",
    `- 2026-05-16: Pulse imported ${items.length} ${company.name} catalog rows into a local GBrain corpus.`
  ].join("\n"));
}

function catalogItemPage(item: CatalogItem) {
  return markdown({
    title: item.name,
    type: "company",
    company: item.company_id,
    sku: item.sku,
    catalog_id: item.catalog_id,
    category: item.category,
    tags: [item.company_id, "catalog-item", ...item.tags].slice(0, 20),
    source_url: item.source_url ?? "",
    source: "pulse-catalog",
    seeded: true
  }, [
    `# ${item.name}`,
    "",
    "## Compiled Truth",
    `Company: ${companyDefinitions[item.company_id].name}`,
    `SKU: ${item.sku}`,
    `Catalog ID: ${item.catalog_id}`,
    `Category: ${item.category}`,
    `Description: ${item.description}`,
    `Stock seed: ${item.stock_seed}`,
    `Price band seed: ${item.price_band_seed}`,
    `Review reasons: ${item.review_required_reason.length ? item.review_required_reason.join(", ") : "none"}`,
    item.source_url ? `Source URL: ${item.source_url}` : "",
    "",
    "### Tags",
    ...item.tags.map((tag) => `- ${tag}`),
    "",
    "### Attributes",
    ...Object.entries(item.attributes).map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(", ") : value ?? "unknown"}`),
    "",
    "---",
    "## Timeline",
    `- ${item.lastmod ?? "2026-05-16"}: Catalog row available in Pulse demo seed data.`
  ].filter(Boolean).join("\n"));
}

function aaryaCustomerPage() {
  return markdown({
    title: "Aarya Costco Household Customer Brain",
    type: "person",
    company: "costco",
    tags: ["costco", "customer-brain", "household", "pulse-demo"],
    source: "pulse-seed-customer",
    seeded: true
  }, [
    "# Aarya Costco Household Customer Brain",
    "",
    "## Compiled Truth",
    "Aarya is the primary Costco demo caller. The demo should treat Aarya as an Executive member with a household of four and a recurring office/breakroom pattern.",
    "",
    "### Preferences",
    "- Kirkland Signature when value matters",
    "- Organic produce and household bulk buys",
    "- Reorders usual breakroom supplies when the caller asks for usual Costco items",
    "- Needs review for allergies, perishable timing, large events, pharmacy, optical, travel, and high-value categories",
    "",
    "### Household Memory",
    "- Mom: prefers organic produce and simple staples",
    "- Partner: prefers sparkling water, coffee, and household basics",
    "- Kids: prefer snacks, fruit, and easy lunchbox items",
    "",
    "---",
    "## Timeline",
    "- 2026-05-16: Seeded from Pulse/Aarya PR #6 Costco demo profile."
  ].join("\n"));
}

function costcoPolicyPage() {
  return markdown({
    title: "Costco Demo Policy Guardrails",
    type: "company",
    company: "costco",
    tags: ["costco", "policy", "guardrails", "pulse-demo"],
    source: "aarya-pr6-demo-seed",
    seeded: true
  }, [
    "# Costco Demo Policy Guardrails",
    "",
    "## Compiled Truth",
    "These are demo-seeded guardrails, not a live Costco policy feed.",
    "",
    "- Confirm membership before placing orders.",
    "- Local stock, warehouse price, delivery, and pickup timing require location confirmation.",
    "- Large events, perishables, alcohol/Rx, pharmacy, optical, hearing, travel, complaints, and high-value categories route to review.",
    "- Prefer Kirkland/private-label substitutes when the caller asks for value.",
    "- Confirm substitutions for grocery and perishable items before placement.",
    "",
    "---",
    "## Timeline",
    "- 2026-05-16: Imported from Aarya PR #6 demo policy seed."
  ].join("\n"));
}

function costcoAllergenPage() {
  return markdown({
    title: "Costco Demo Allergen Guardrails",
    type: "company",
    company: "costco",
    tags: ["costco", "allergen", "safety", "pulse-demo"],
    source: "aarya-pr6-demo-seed",
    seeded: true
  }, [
    "# Costco Demo Allergen Guardrails",
    "",
    "## Compiled Truth",
    "These are demo-seeded allergen guardrails. They route risk, not replace package labels.",
    "",
    "- Escalate peanut, tree nut, shellfish, celiac/severe gluten restriction, multiple allergies, child allergy, EpiPen, or anaphylaxis mentions.",
    "- Do not call bakery or prepared foods allergen-safe because shared facilities and cross-contact are possible.",
    "- Organic, natural, or Kirkland does not mean allergen-free.",
    "- Ask a specialist or require package-label verification for strict allergy requests.",
    "",
    "---",
    "## Timeline",
    "- 2026-05-16: Imported from Aarya PR #6 demo allergen seed."
  ].join("\n"));
}

function markdown(frontmatter: Record<string, unknown>, body: string) {
  return [
    "---",
    ...Object.entries(frontmatter).map(([key, value]) => `${key}: ${yamlValue(value)}`),
    "---",
    body,
    ""
  ].join("\n");
}

function yamlValue(value: unknown) {
  if (Array.isArray(value)) return `[${value.map((entry) => JSON.stringify(String(entry))).join(", ")}]`;
  if (typeof value === "boolean") return value ? "true" : "false";
  return JSON.stringify(String(value ?? ""));
}

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "item";
}

async function runGBrain(args: string[], input?: string): Promise<GBrainRunResult> {
  const cliPath = process.env.GBRAIN_CLI_PATH ?? "gbrain";
  const command = [cliPath, ...args];
  return new Promise((resolve) => {
    const child = spawn(cliPath, args, {
      env: {
        ...process.env,
        ...(process.env.GBRAIN_HOME ? { GBRAIN_HOME: process.env.GBRAIN_HOME } : {})
      },
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      settled = true;
      child.kill("SIGTERM");
      resolve({
        ok: false,
        command,
        stdout,
        stderr,
        error: `gbrain command timed out after ${process.env.GBRAIN_CLI_TIMEOUT_MS ?? 120_000}ms`
      });
    }, Number(process.env.GBRAIN_CLI_TIMEOUT_MS ?? 120_000));

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (stdout.length > 20 * 1024 * 1024) child.kill("SIGTERM");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (stderr.length > 20 * 1024 * 1024) child.kill("SIGTERM");
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ ok: false, command, stdout, stderr, error: error.message });
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        ok: code === 0,
        command,
        stdout,
        stderr,
        ...(code === 0 ? {} : { error: `gbrain exited with ${signal ?? code}` })
      });
    });

    if (input) child.stdin.end(input);
    else child.stdin.end();
  });
}

async function commandAvailable(cliPath: string) {
  if (cliPath.includes("/") || cliPath.startsWith(".")) {
    try {
      await access(cliPath, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  const result = await runGBrain(["--version"]);
  return result.ok;
}

function assertLocalGBrainEnabled() {
  if (process.env.GBRAIN_LOCAL_ENABLED !== "true") {
    throw Object.assign(new Error("Local GBrain is disabled. Set GBRAIN_LOCAL_ENABLED=true on this branch to use the real GBrain CLI."), { statusCode: 409 });
  }
}
