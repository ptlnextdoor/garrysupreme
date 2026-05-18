import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { searchCatalog } from "../yc-gbrain/server/src/catalog.ts";
import { classifyVapiLifecycleEvent } from "../yc-gbrain/server/src/store.ts";
import { buildPublicUrlWithToken } from "../yc-gbrain/scripts/vapi-url.mjs";

async function testRailwayTargetsCostcoBranch() {
  const workflow = await readFile(".github/workflows/deploy-railway-backend.yml", "utf8");
  assert.match(workflow, /aayu22809\/real-gbrain-costco-integration/);
  assert.doesNotMatch(workflow, /aayu22809\/starbucks-gbrain-demo/);
}

function testVapiEndedStatusUpdateIsNotStart() {
  const ended = classifyVapiLifecycleEvent("status-update", "ended");
  assert.equal(ended.isEnd, true);
  assert.equal(ended.isStart, false);

  const inProgress = classifyVapiLifecycleEvent("status-update", "in-progress");
  assert.equal(inProgress.isStart, true);
  assert.equal(inProgress.isEnd, false);
}

async function testCostcoWatermelonCandyIsNotBeverage() {
  const response = await searchCatalog({
    companyId: "costco",
    query: "watermelon candy"
  });
  const sourPatch = response.results.find((result) => result.name.includes("Sour Patch Kids"));
  assert.ok(sourPatch, "expected Sour Patch Kids to appear in watermelon candy results");
  assert.notEqual(sourPatch.category, "Beverages");
}

function testVapiToolUrlsCanIncludeDemoToken() {
  assert.equal(
    buildPublicUrlWithToken("https://demo.example.com/api/context", "secret token"),
    "https://demo.example.com/api/context?token=secret+token"
  );
  assert.equal(
    buildPublicUrlWithToken("https://demo.example.com/api/save_order?existing=1", "abc"),
    "https://demo.example.com/api/save_order?existing=1&token=abc"
  );
}

async function main() {
  await testRailwayTargetsCostcoBranch();
  testVapiEndedStatusUpdateIsNotStart();
  await testCostcoWatermelonCandyIsNotBeverage();
  testVapiToolUrlsCanIncludeDemoToken();

  console.log("Costco integration regression checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
