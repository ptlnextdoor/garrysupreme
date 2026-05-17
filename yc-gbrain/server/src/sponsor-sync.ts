type SponsorName = "gbrain" | "gstack";

type SponsorConfig = {
  name: SponsorName;
  apiKey?: string;
  baseUrl?: string;
  projectId?: string;
};

type SponsorEvent = {
  type: "order_saved" | "memory_approved" | "vapi_lifecycle";
  companyId: string;
  payload: unknown;
  createdAt?: string;
};

const warned = new Set<SponsorName>();

function configFor(name: SponsorName): SponsorConfig {
  const prefix = name.toUpperCase();
  return {
    name,
    apiKey: process.env[`${prefix}_API_KEY`],
    baseUrl: process.env[`${prefix}_BASE_URL`],
    projectId: process.env[`${prefix}_PROJECT_ID`]
  };
}

function hasConfig(config: SponsorConfig) {
  return Boolean(config.apiKey && config.baseUrl && config.projectId);
}

export async function syncSponsorEvent(event: SponsorEvent) {
  const configs = [configFor("gbrain"), configFor("gstack")];
  await Promise.allSettled(configs.map((config) => syncOne(config, event)));
}

async function syncOne(config: SponsorConfig, event: SponsorEvent) {
  if (!hasConfig(config)) {
    if (!warned.has(config.name)) {
      warned.add(config.name);
      console.warn(`[sponsor-sync] ${config.name} env vars missing; continuing without external sync`);
    }
    return;
  }

  try {
    const url = new URL("/events", config.baseUrl!.replace(/\/$/, ""));
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${config.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        project_id: config.projectId,
        source: "pulse-demo",
        ...event,
        createdAt: event.createdAt ?? new Date().toISOString()
      }),
      signal: AbortSignal.timeout(2_000)
    });

    if (!response.ok) {
      console.warn(`[sponsor-sync] ${config.name} sync failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.warn(`[sponsor-sync] ${config.name} sync unavailable`, error instanceof Error ? error.message : error);
  }
}
