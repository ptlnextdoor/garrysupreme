import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Fastify, { type FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import { getLocalGBrainStatus, queryLocalGBrain, seedLocalGBrain } from "./gbrain-local.js";
import { approveMemory, endDemoCall, getContext, getDashboard, learnPreference, listCompanies, recordVapiLifecycle, rejectMemory, resetDemo, saveOrder, searchCompanyCatalog, startDemoCall } from "./store.js";
import { extractToolArguments, getVapiCallerNumber, getVapiToolDebug, getVapiToolName, vapiToolErrorResponse, vapiToolResponse } from "./vapi.js";

const app = Fastify({
  logger: {
    transport: process.env.NODE_ENV === "production" ? undefined : {
      target: "pino-pretty",
      options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" }
    }
  }
});

const clients = new Set<{ send: (payload: string) => void }>();
const allowedOrigins = [
  ...(process.env.DASHBOARD_ORIGIN ?? process.env.FRONTEND_URL ?? "").split(","),
  process.env.FRONTEND_URL ?? ""
].map((origin) => origin.trim()).filter(Boolean);

await app.register(cors, {
  origin: allowedOrigins.length ? allowedOrigins : true
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

const optionalString = z.union([z.string(), z.number()]).optional().transform((value) => value === undefined ? undefined : String(value));
const optionalPhone = optionalString.transform((value) => value ?? "unknown");
const stringList = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return value;
}, z.array(z.string()));

app.get("/health", async () => ({ ok: true, service: "pulse-api" }));

app.get("/ws", { websocket: true }, (connection) => {
  clients.add(connection);
  connection.on("close", () => clients.delete(connection));
});

app.get("/api/dashboard", async () => getDashboard());
app.get("/api/companies", async () => listCompanies());
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

app.get("/api/gbrain/local/status", async () => getLocalGBrainStatus());

app.post("/api/gbrain/local/seed", async (request) => {
  requireDemoToken(request);
  const schema = z.object({
    company_id: z.string().optional().default("costco")
  });
  const parsed = schema.parse(request.body ?? {});
  return seedLocalGBrain(parsed.company_id);
});

app.post("/api/gbrain/local/query", async (request) => {
  requireDemoToken(request);
  const schema = z.object({
    query: z.string().min(1)
  });
  const parsed = schema.parse(request.body ?? {});
  return queryLocalGBrain(parsed.query);
});

app.post("/api/context", async (request) => {
  requireDemoToken(request);
  try {
    const args = withCallerPhoneFallback(extractToolArguments(request.body), request.body);
    const schema = z.object({
      company_id: z.string().optional().default("costco"),
      phone_number: optionalPhone,
      request: z.string().optional().default(""),
      language: z.enum(["en", "hi"]).optional().default("en")
    });
    const parsed = schema.parse(args);
    const result = await getContext(parsed.company_id, parsed.phone_number, parsed.request, parsed.language);

    broadcast("context_loaded", {
      company: result.company.name,
      customer: result.customer.name,
      request: parsed.request,
      language: parsed.language
    });
    broadcast("dashboard_updated", await getDashboard());

    return vapiToolResponse(request.body, result);
  } catch (error) {
    if (getVapiToolName(request.body)) return vapiToolErrorResponse(request.body, error);
    throw error;
  }
});

app.post("/api/save_order", async (request) => {
  requireDemoToken(request);
  try {
    const args = withCallerPhoneFallback(extractToolArguments(request.body), request.body);
    const schema = z.object({
      company_id: z.string().optional().default("costco"),
      customer_name: optionalString,
      phone_number: optionalString,
      items: stringList.pipe(z.array(z.string()).min(1)),
      new_preferences: stringList.default([]),
      confidence: z.coerce.number().optional(),
      language: z.enum(["en", "hi"]).optional().default("en")
    });
    const parsed = schema.parse(args);
    const order = await saveOrder(parsed);

    broadcast("order_saved", order);
    broadcast("dashboard_updated", await getDashboard());

    return vapiToolResponse(request.body, { ok: true, order });
  } catch (error) {
    if (getVapiToolName(request.body)) return vapiToolErrorResponse(request.body, error);
    throw error;
  }
});

app.post("/api/learn", async (request) => {
  requireDemoToken(request);
  const args = extractToolArguments(request.body);
  const schema = z.object({
    company_id: z.string().optional().default("costco"),
    customer_name: z.string().default("unknown customer"),
    preference: z.string(),
    confidence: z.number().default(0.65)
  });
  const parsed = schema.parse(args);
  const memory = await learnPreference(parsed.customer_name, parsed.preference, parsed.confidence, parsed.company_id);
  broadcast("memory_learned", memory);
  broadcast("dashboard_updated", await getDashboard());
  return { ok: true, memory };
});

app.post("/api/search", async (request) => {
  requireDemoToken(request);
  const args = extractToolArguments(request.body);
  const schema = z.object({
    company_id: z.string().optional().default("costco"),
    query: z.string().min(1),
    customer_id: z.string().optional()
  });
  const parsed = schema.parse(args);
  const result = await searchCompanyCatalog(parsed.company_id, parsed.query, parsed.customer_id);
  broadcast("catalog_searched", {
    company: result.company_id,
    query: parsed.query,
    decision: result.decision
  });
  broadcast("dashboard_updated", await getDashboard());
  return result;
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
  const args = extractToolArguments(request.body);
  const call = await startDemoCall(args.company_id);
  broadcast("demo_call_started", call);
  broadcast("dashboard_updated", await getDashboard());
  return { ok: true, call };
});

app.post("/api/demo/end_call", async (request) => {
  requireDemoToken(request);
  const args = extractToolArguments(request.body);
  const call = await endDemoCall(args.company_id);
  broadcast("demo_call_ended", call);
  broadcast("dashboard_updated", await getDashboard());
  return { ok: true, call };
});

app.post("/api/demo/reset", async (request) => {
  requireDemoToken(request);
  const args = extractToolArguments(request.body);
  const dashboard = await resetDemo(args.company_id);
  broadcast("demo_reset", dashboard);
  broadcast("dashboard_updated", dashboard);
  return { ok: true, dashboard };
});

app.post("/api/vapi/webhook", async (request) => {
  requireDemoToken(request);
  const debug = getVapiToolDebug(request.body);
  if (debug.toolCallId !== "none") {
    app.log.info({ vapiTool: debug }, "Vapi tool call received");
  }

  try {
    const toolResponse = await handleVapiToolCall(request.body);
    if (toolResponse) return toolResponse;
  } catch (error) {
    app.log.error({
      vapiTool: debug,
      error: error instanceof Error ? error.message : String(error)
    }, "Vapi tool call failed");
    return vapiToolErrorResponse(request.body, error);
  }

  const body = request.body as Record<string, unknown>;
  const message = typeof body.message === "object" && body.message !== null ? body.message as Record<string, unknown> : {};
  const call = typeof message.call === "object" && message.call !== null
    ? message.call as Record<string, unknown>
    : typeof body.call === "object" && body.call !== null
      ? body.call as Record<string, unknown>
      : {};
  const customer = typeof call.customer === "object" && call.customer !== null ? call.customer as Record<string, unknown> : {};
  const event = String(body.type ?? body.event ?? message.type ?? "unknown");
  const status = body.status ?? message.status ?? call.status;
  const companyId = body.company_id ?? message.company_id ?? "costco";
  const lifecycleCall = await recordVapiLifecycle({
    event,
    status,
    company_id: companyId,
    call_id: typeof call.id === "string" ? call.id : undefined,
    phone_number: typeof customer.number === "string" ? customer.number : undefined,
    customer_name: typeof body.customer_name === "string" ? body.customer_name : undefined
  });

  broadcast("vapi_webhook", { event, call: lifecycleCall });
  broadcast("dashboard_updated", await getDashboard());
  return { ok: true, handled_lifecycle: Boolean(lifecycleCall), call: lifecycleCall };
});

function withCallerPhoneFallback(args: Record<string, unknown>, body: unknown) {
  if (args.phone_number !== undefined && args.phone_number !== "") return args;
  const callerNumber = getVapiCallerNumber(body);
  return callerNumber ? { ...args, phone_number: callerNumber } : args;
}

async function handleVapiToolCall(body: unknown) {
  const toolName = getVapiToolName(body);
  if (!toolName) return null;

  const args = withCallerPhoneFallback(extractToolArguments(body), body);
  const normalizedToolName = toolName.toLowerCase();

  if (normalizedToolName === "get_context" || normalizedToolName === "context") {
    const parsed = z.object({
      company_id: z.string().optional().default("costco"),
      phone_number: optionalPhone,
      request: z.string().optional().default(""),
      language: z.enum(["en", "hi"]).optional().default("en")
    }).parse(args);
    const result = await getContext(parsed.company_id, parsed.phone_number, parsed.request, parsed.language);
    broadcast("context_loaded", {
      company: result.company.name,
      customer: result.customer.name,
      request: parsed.request,
      language: parsed.language
    });
    broadcast("dashboard_updated", await getDashboard());
    return vapiToolResponse(body, result);
  }

  if (normalizedToolName === "save_order" || normalizedToolName === "order") {
    const parsed = z.object({
      company_id: z.string().optional().default("costco"),
      customer_name: optionalString,
      phone_number: optionalString,
      items: stringList.pipe(z.array(z.string()).min(1)),
      new_preferences: stringList.default([]),
      confidence: z.coerce.number().optional(),
      language: z.enum(["en", "hi"]).optional().default("en")
    }).parse(args);
    const order = await saveOrder(parsed);
    broadcast("order_saved", order);
    broadcast("dashboard_updated", await getDashboard());
    return vapiToolResponse(body, { ok: true, order });
  }

  if (normalizedToolName === "search" || normalizedToolName === "search_catalog") {
    const parsed = z.object({
      company_id: z.string().optional().default("costco"),
      query: z.string().min(1),
      customer_id: z.string().optional()
    }).parse(args);
    const result = await searchCompanyCatalog(parsed.company_id, parsed.query, parsed.customer_id);
    broadcast("catalog_searched", {
      company: result.company_id,
      query: parsed.query,
      decision: result.decision
    });
    broadcast("dashboard_updated", await getDashboard());
    return vapiToolResponse(body, result);
  }

  return vapiToolResponse(body, {
    ok: false,
    error: `Unknown Pulse tool: ${toolName}`,
    supported_tools: ["get_context", "save_order", "search_catalog"]
  });
}

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
