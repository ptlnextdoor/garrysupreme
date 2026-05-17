import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

async function loadEnvFile(filePath: string) {
  try {
    const raw = await readFile(filePath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
      if (!match) continue;
      const [, key, rawValue] = match;
      const value = rawValue.replace(/\s+#.*$/, "").replace(/^["']|["']$/g, "");
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // Missing env files are fine; CI can provide env vars directly.
  }
}

async function clearCatalog(client: ConvexHttpClient, companyId: string) {
  let deleted = 0;
  for (;;) {
    const result = await client.mutation(anyApi.pulseState.clearCompanyCatalog, {
      companyId,
      limit: 500
    }) as { deleted: number };
    deleted += result.deleted;
    if (result.deleted === 0) return deleted;
  }
}

async function main() {
  await loadEnvFile(path.join(rootDir, ".env.local"));
  await loadEnvFile(path.join(rootDir, "yc-gbrain", ".env.local"));

  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Set CONVEX_URL or NEXT_PUBLIC_CONVEX_URL before seeding Convex.");
  }

  process.env.CONVEX_URL = convexUrl;
  process.env.CONVEX_WRITE_ENABLED = "true";

  const client = new ConvexHttpClient(convexUrl);
  const { getCompanyCatalog, companyDefinitions } = await import("../yc-gbrain/server/src/catalog.ts");
  const { resetDemo } = await import("../yc-gbrain/server/src/store.ts");

  for (const companyId of ["costco", "starbucks"] as const) {
    const deleted = await clearCatalog(client, companyId);
    const catalog = await getCompanyCatalog(companyId);

    let inserted = 0;
    for (let index = 0; index < catalog.length; index += 250) {
      const batch = catalog.slice(index, index + 250).map((item) => ({
        catalogId: item.catalog_id,
        sku: item.sku,
        name: item.name,
        description: item.description,
        category: item.category,
        tags: item.tags.slice(0, 40),
        stock: item.stock_seed,
        priceBand: item.price_band_seed,
        raw: {
          active: item.active,
          source_url: item.source_url,
          lastmod: item.lastmod,
          review_required_reason: item.review_required_reason,
          attributes: item.attributes
        }
      }));

      const result = await client.mutation(anyApi.pulseState.insertCompanyCatalogBatch, {
        companyId,
        items: batch
      }) as { inserted: number };
      inserted += result.inserted;
    }

    const definition = companyDefinitions[companyId];
    await client.mutation(anyApi.pulseState.replaceCompanyPolicies, {
      companyId,
      policies: [
        {
          title: `${definition.name} HOG demo rules`,
          body: definition.rules.join("\n"),
          source: "hog-demo-seed"
        },
        {
          title: `${definition.name} HOG official/research facts`,
          body: definition.officialFacts.join("\n"),
          source: "hog-demo-research"
        }
      ]
    });

    console.log(`[convex-seed] ${companyId}: deleted ${deleted}, inserted ${inserted}`);
  }

  await resetDemo("costco");
  const stats = await client.query(anyApi.pulseState.getHogDataStats, {});
  console.log("[convex-seed] stats", JSON.stringify(stats, null, 2));
}

main().catch((error) => {
  console.error("[convex-seed] failed", error);
  process.exit(1);
});
