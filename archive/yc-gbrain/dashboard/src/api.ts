import type { DashboardData } from "./types";

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

export async function demoGetContext() {
  const response = await fetch("/api/context", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...demoHeaders() },
    body: JSON.stringify({
      phone_number: "+15551234567",
      request: "I want something cold, sweet, not too heavy, no dairy."
    })
  });
  if (!response.ok) throw new Error("Failed to get context");
  return response.json();
}

export async function demoSaveOrder() {
  const response = await fetch("/api/save_order", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...demoHeaders() },
    body: JSON.stringify({
      customer_name: "Aayushya",
      phone_number: "+15551234567",
      items: [
        "Iced Chai Latte, oat milk, cardamom",
        "Hot Chai Latte, extra sweet, cardamom"
      ],
      new_preferences: [
        "Customer likes cold chai variants.",
        "Mom likes hot sweet chai with cardamom."
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

export async function startDemoCall() {
  const response = await fetch("/api/demo/start_call", { method: "POST", headers: demoHeaders() });
  if (!response.ok) throw new Error("Failed to start demo call");
  return response.json();
}

export async function endDemoCall() {
  const response = await fetch("/api/demo/end_call", { method: "POST", headers: demoHeaders() });
  if (!response.ok) throw new Error("Failed to end demo call");
  return response.json();
}

export async function resetDemo() {
  const response = await fetch("/api/demo/reset", { method: "POST", headers: demoHeaders() });
  if (!response.ok) throw new Error("Failed to reset demo");
  return response.json();
}
