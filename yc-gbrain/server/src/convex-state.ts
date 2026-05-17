import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import type { State } from "./store.js";

let client: ConvexHttpClient | null | undefined;
let warned = false;

function convexClient() {
  if (!process.env.CONVEX_URL) return null;
  if (client !== undefined) return client;

  client = new ConvexHttpClient(process.env.CONVEX_URL);
  return client;
}

export function isConvexConfigured() {
  return Boolean(process.env.CONVEX_URL);
}

export async function loadConvexState() {
  const convex = convexClient();
  if (!convex) return null;

  try {
    return await convex.query(anyApi.pulseState.getState, { key: "default" }) as Partial<State> | null;
  } catch (error) {
    warnOnce("load", error);
    return null;
  }
}

export async function saveConvexState(state: State) {
  if (process.env.CONVEX_WRITE_ENABLED !== "true") {
    warnOnce("save", "Convex writes are disabled on this branch. Set CONVEX_WRITE_ENABLED=true only when intentionally updating Convex.");
    return;
  }

  const convex = convexClient();
  if (!convex) return;

  try {
    await convex.mutation(anyApi.pulseState.saveState, {
      key: "default",
      state,
      updatedAt: Date.now()
    });
  } catch (error) {
    warnOnce("save", error);
  }
}

function warnOnce(operation: string, error: unknown) {
  if (warned) return;
  warned = true;
  console.warn(`[convex-state] ${operation} failed; using file-backed fallback`, error instanceof Error ? error.message : error);
}
