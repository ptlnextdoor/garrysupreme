import type { DashboardData } from "./types";

export async function fetchDashboard(): Promise<DashboardData> {
  const response = await fetch("/api/dashboard");
  if (!response.ok) throw new Error("Failed to load dashboard");
  return response.json() as Promise<DashboardData>;
}

export async function demoGetContext() {
  const response = await fetch("/api/context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });
  if (!response.ok) throw new Error("Failed to approve memory");
  return response.json();
}
