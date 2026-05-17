import type { CompanyId, DashboardData } from "./types";

function demoHeaders(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? window.localStorage.getItem("pulse_demo_token");
  if (params.get("token")) window.localStorage.setItem("pulse_demo_token", params.get("token")!);
  return token ? { "x-pulse-demo-token": token } : {};
}

export async function fetchDashboard(): Promise<DashboardData> {
  const response = await fetch("/api/dashboard");
  if (!response.ok) throw new Error("Failed to load dashboard");
  return response.json() as Promise<DashboardData>;
}

export async function demoGetContext(companyId: CompanyId, request?: string) {
  const response = await fetch("/api/context", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...demoHeaders() },
    body: JSON.stringify({
      company_id: companyId,
      phone_number: companyId === "costco" ? "+17028619093" : "+15557654321",
      request: request ?? (companyId === "costco"
        ? "I am doing a quick Costco run that may turn into the big monthly haul. Add my usual almond milk, salmon, and kids snacks."
        : "I want something cold, not too sweet, with caffeine, but no dairy.")
    })
  });
  if (!response.ok) throw new Error("Failed to get context");
  return response.json();
}

export async function demoSearch(companyId: CompanyId, query: string, customerId?: string) {
  const response = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...demoHeaders() },
    body: JSON.stringify({
      company_id: companyId,
      query,
      customer_id: customerId
    })
  });
  if (!response.ok) throw new Error("Failed to search catalog");
  return response.json();
}

export async function demoSaveOrder(companyId: CompanyId) {
  const response = await fetch("/api/save_order", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...demoHeaders() },
    body: JSON.stringify(companyId === "costco" ? {
      company_id: "costco",
      customer_name: "Aarya",
      phone_number: "+17028619093",
      items: [
        "Kirkland almond milk",
        "Salmon fillets",
        "Goldfish variety pack for the kids",
        "Kirkland bath tissue"
      ],
      new_preferences: [
        "Customer often asks whether this is a quick Costco run or the big monthly household haul.",
        "Customer wants Mom, partner, and kids preferences remembered separately."
      ],
      confidence: 0.9
    } : {
      company_id: "starbucks",
      customer_name: "Aayushya",
      phone_number: "+15557654321",
      items: [
        "Grande iced coffee, oat milk, light syrup",
        "Emma's Grande Strawberry Acai Lemonade, light ice"
      ],
      new_preferences: [
        "Customer prefers plain-English Starbucks translations.",
        "Customer prefers oat milk and half-sweet drinks."
      ],
      confidence: 0.86
    })
  });
  if (!response.ok) throw new Error("Failed to save order");
  return response.json();
}

export async function approveMemory(id: string) {
  const response = await fetch("/api/memory/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...demoHeaders() },
    body: JSON.stringify({ id })
  });
  if (!response.ok) throw new Error("Failed to approve memory");
  return response.json();
}

export async function rejectMemory(id: string) {
  const response = await fetch("/api/memory/reject", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...demoHeaders() },
    body: JSON.stringify({ id })
  });
  if (!response.ok) throw new Error("Failed to reject memory");
  return response.json();
}

export async function startDemoCall(companyId: CompanyId) {
  const response = await fetch("/api/demo/start_call", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...demoHeaders() },
    body: JSON.stringify({ company_id: companyId })
  });
  if (!response.ok) throw new Error("Failed to start demo call");
  return response.json();
}

export async function endDemoCall(companyId: CompanyId) {
  const response = await fetch("/api/demo/end_call", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...demoHeaders() },
    body: JSON.stringify({ company_id: companyId })
  });
  if (!response.ok) throw new Error("Failed to end demo call");
  return response.json();
}

export async function resetDemo(companyId: CompanyId) {
  const response = await fetch("/api/demo/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...demoHeaders() },
    body: JSON.stringify({ company_id: companyId })
  });
  if (!response.ok) throw new Error("Failed to reset demo");
  return response.json();
}
