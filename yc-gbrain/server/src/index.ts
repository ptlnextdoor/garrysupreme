import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Fastify, { type FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import { approveMemory, endDemoCall, getContext, getDashboard, learnPreference, rejectMemory, resetDemo, saveOrder, startDemoCall } from "./store.js";
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

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) {
    return reply.code(400).send({ error: "Invalid request", issues: error.issues });
  }

  const statusCode = typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
  const message = error instanceof Error ? error.message : "Internal Server Error";
  return reply.code(statusCode).send({ error: message });
});

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

function requireDemoToken(request: FastifyRequest) {
  const expected = process.env.PULSE_DEMO_TOKEN;
  if (!expected) return;

  const provided = request.headers["x-pulse-demo-token"] ?? (request.query as { token?: string } | undefined)?.token;
  if (provided !== expected) {
    throw Object.assign(new Error("Invalid demo token"), { statusCode: 401 });
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
  requireDemoToken(request);
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
  broadcast("dashboard_updated", await getDashboard());

  return vapiToolResponse(request.body, result);
});

app.post("/api/save_order", async (request) => {
  requireDemoToken(request);
  const args = extractToolArguments(request.body);
  const schema = z.object({
    customer_name: z.string().optional(),
    phone_number: z.string().optional(),
    items: z.array(z.string()).min(1),
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
  requireDemoToken(request);
  const args = extractToolArguments(request.body);
  const schema = z.object({
    customer_name: z.string().default("unknown customer"),
    preference: z.string(),
    confidence: z.number().default(0.65)
  });
  const parsed = schema.parse(args);
  const memory = await learnPreference(parsed.customer_name, parsed.preference, parsed.confidence);
  broadcast("memory_learned", memory);
  broadcast("dashboard_updated", await getDashboard());
  return { ok: true, memory };
});

app.post("/api/memory/approve", async (request, reply) => {
  requireDemoToken(request);
  const schema = z.object({ id: z.string() });
  const parsed = schema.parse(request.body);
  const memory = await approveMemory(parsed.id);
  if (!memory) return reply.code(404).send({ error: "Memory candidate not found" });
  broadcast("memory_approved", memory);
  broadcast("dashboard_updated", await getDashboard());
  return { ok: true, memory };
});

app.post("/api/memory/reject", async (request, reply) => {
  requireDemoToken(request);
  const schema = z.object({ id: z.string() });
  const parsed = schema.parse(request.body);
  const memory = await rejectMemory(parsed.id);
  if (!memory) return reply.code(404).send({ error: "Memory candidate not found" });
  broadcast("memory_rejected", memory);
  broadcast("dashboard_updated", await getDashboard());
  return { ok: true, memory };
});

app.post("/api/demo/start_call", async (request) => {
  requireDemoToken(request);
  const call = await startDemoCall();
  broadcast("demo_call_started", call);
  broadcast("dashboard_updated", await getDashboard());
  return { ok: true, call };
});

app.post("/api/demo/end_call", async (request) => {
  requireDemoToken(request);
  const call = await endDemoCall();
  broadcast("demo_call_ended", call);
  broadcast("dashboard_updated", await getDashboard());
  return { ok: true, call };
});

app.post("/api/demo/reset", async (request) => {
  requireDemoToken(request);
  const dashboard = await resetDemo();
  broadcast("demo_reset", dashboard);
  broadcast("dashboard_updated", dashboard);
  return { ok: true, dashboard };
});

app.post("/api/vapi/webhook", async (request) => {
  requireDemoToken(request);
  const body = request.body as Record<string, unknown>;
  const message = typeof body.message === "object" && body.message !== null ? body.message as Record<string, unknown> : {};
  const event = String(body.type ?? body.event ?? message.type ?? "unknown");

  if (event.includes("call-start")) await startDemoCall();
  if (event.includes("end")) await endDemoCall();

  broadcast("vapi_webhook", { event, body });
  broadcast("dashboard_updated", await getDashboard());
  return { ok: true };
});

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
