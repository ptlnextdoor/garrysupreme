import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { z } from "zod";
import { approveMemory, getContext, getDashboard, saveOrder } from "./store.js";
import { extractToolArguments, vapiToolResponse } from "./vapi.js";

const app = Fastify({
  logger: {
    transport: process.env.NODE_ENV === "production" ? undefined : {
      target: "pino-pretty",
      options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" }
    }
  }
});

const clients = new Set<{ send: (payload: string) => void }>();

await app.register(cors, {
  origin: process.env.DASHBOARD_ORIGIN ?? true
});
await app.register(websocket);

function broadcast(event: string, payload: unknown) {
  const message = JSON.stringify({ event, payload });
  for (const client of clients) {
    try {
      client.send(message);
    } catch {
      clients.delete(client);
    }
  }
}

app.get("/health", async () => ({ ok: true, service: "pulse-api" }));

app.get("/ws", { websocket: true }, (connection) => {
  clients.add(connection);
  connection.on("close", () => clients.delete(connection));
});

app.get("/api/dashboard", async () => getDashboard());
app.get("/api/calls/active", async () => {
  const dashboard = await getDashboard();
  return dashboard.activeCalls;
});

app.get("/api/customers/:id", async (request, reply) => {
  const params = request.params as { id: string };
  const dashboard = await getDashboard();
  const customer = dashboard.customers.find((candidate) => candidate.id === params.id);
  if (!customer) return reply.code(404).send({ error: "Customer not found" });
  return customer;
});

app.post("/api/context", async (request) => {
  const args = extractToolArguments(request.body);
  const schema = z.object({
    phone_number: z.string().optional().default("unknown"),
    request: z.string().optional().default("")
  });
  const parsed = schema.parse(args);
  const result = await getContext(parsed.phone_number, parsed.request);

  broadcast("context_loaded", {
    customer: result.customer.name,
    request: parsed.request
  });

  return vapiToolResponse(request.body, result);
});

app.post("/api/save_order", async (request) => {
  const args = extractToolArguments(request.body);
  const schema = z.object({
    customer_name: z.string().optional(),
    phone_number: z.string().optional(),
    items: z.array(z.string()).default([]),
    new_preferences: z.array(z.string()).default([]),
    confidence: z.number().optional()
  });
  const parsed = schema.parse(args);
  const order = await saveOrder(parsed);

  broadcast("order_saved", order);
  broadcast("dashboard_updated", await getDashboard());

  return vapiToolResponse(request.body, { ok: true, order });
});

app.post("/api/learn", async (request) => {
  const args = extractToolArguments(request.body);
  const schema = z.object({
    customer_name: z.string().default("unknown customer"),
    preference: z.string(),
    confidence: z.number().default(0.65)
  });
  const parsed = schema.parse(args);
  const order = await saveOrder({
    customer_name: parsed.customer_name,
    items: [],
    new_preferences: [parsed.preference],
    confidence: parsed.confidence
  });
  broadcast("memory_learned", order);
  return { ok: true, order };
});

app.post("/api/memory/approve", async (request, reply) => {
  const schema = z.object({ id: z.string() });
  const parsed = schema.parse(request.body);
  const memory = await approveMemory(parsed.id);
  if (!memory) return reply.code(404).send({ error: "Memory candidate not found" });
  broadcast("memory_approved", memory);
  broadcast("dashboard_updated", await getDashboard());
  return { ok: true, memory };
});

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
