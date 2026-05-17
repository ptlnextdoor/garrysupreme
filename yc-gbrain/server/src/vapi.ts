type VapiToolCall = {
  id?: string;
  name?: string;
  parameters?: unknown;
  arguments?: unknown;
  function?: {
    name?: string;
    arguments?: unknown;
    parameters?: unknown;
  };
};

function parseArguments(args: unknown): Record<string, unknown> {
  if (!args) return {};
  if (typeof args === "string") {
    try {
      return JSON.parse(args) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof args === "object") return args as Record<string, unknown>;
  return {};
}

function getFirstToolCall(body: unknown): VapiToolCall | undefined {
  if (!body || typeof body !== "object") return undefined;

  const record = body as Record<string, unknown>;
  const message = record.message as Record<string, unknown> | undefined;
  const toolWithToolCall = (message?.toolWithToolCallList as Array<Record<string, unknown>> | undefined)?.[0];
  const nestedToolCall = toolWithToolCall?.toolCall as VapiToolCall | undefined;
  if (nestedToolCall) {
    const nestedName = typeof toolWithToolCall?.name === "string" ? toolWithToolCall.name : undefined;
    return {
      ...nestedToolCall,
      name: nestedToolCall.name ?? nestedName
    };
  }

  return (
    (record.toolCall as VapiToolCall | undefined) ??
    (message?.toolCalls as VapiToolCall[] | undefined)?.[0] ??
    (message?.toolCallList as VapiToolCall[] | undefined)?.[0]
  );
}

export function getVapiToolName(body: unknown) {
  const toolCall = getFirstToolCall(body);
  return toolCall?.function?.name ?? toolCall?.name;
}

export function getVapiToolDebug(body: unknown) {
  const toolCall = getFirstToolCall(body);
  const args = extractToolArguments(body);
  return {
    toolName: toolCall?.function?.name ?? toolCall?.name ?? "none",
    toolCallId: toolCall?.id ?? "none",
    argumentKeys: Object.keys(args)
  };
}

export function getVapiCallerNumber(body: unknown) {
  if (!body || typeof body !== "object") return undefined;
  const record = body as Record<string, unknown>;
  const message = record.message as Record<string, unknown> | undefined;
  const call = (
    typeof message?.call === "object" && message.call !== null
      ? message.call
      : typeof record.call === "object" && record.call !== null
        ? record.call
        : undefined
  ) as Record<string, unknown> | undefined;
  const customer = typeof call?.customer === "object" && call.customer !== null ? call.customer as Record<string, unknown> : undefined;
  const number = customer?.number ?? customer?.phoneNumber ?? record.phone_number ?? record.phoneNumber;
  return typeof number === "string" || typeof number === "number" ? String(number) : undefined;
}

function firstNonEmpty(...values: Array<Record<string, unknown>>): Record<string, unknown> {
  return values.find((value) => Object.keys(value).length > 0) ?? {};
}

export function extractToolArguments(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const record = body as Record<string, unknown>;
  const toolCall = getFirstToolCall(body);

  const directBody = { ...record };
  delete directBody.message;
  delete directBody.toolCall;

  return firstNonEmpty(
    parseArguments(toolCall?.parameters),
    parseArguments(toolCall?.arguments),
    parseArguments(toolCall?.function?.arguments),
    parseArguments(toolCall?.function?.parameters),
    directBody
  );
}

export function vapiToolResponse(body: unknown, result: unknown) {
  const toolCall = getFirstToolCall(body);
  const toolCallId = toolCall?.id;
  const toolName = toolCall?.function?.name ?? toolCall?.name;

  if (!toolCallId) return result;

  return {
    results: [
      {
        ...(toolName ? { name: toolName } : {}),
        toolCallId,
        result: singleLineString(result)
      }
    ]
  };
}

export function vapiToolErrorResponse(body: unknown, error: unknown) {
  const toolCall = getFirstToolCall(body);
  const toolCallId = toolCall?.id;
  const toolName = toolCall?.function?.name ?? toolCall?.name;
  const message = error instanceof Error ? error.message : String(error || "Tool call failed");

  if (!toolCallId) {
    return { error: singleLineString(message) };
  }

  return {
    results: [
      {
        ...(toolName ? { name: toolName } : {}),
        toolCallId,
        error: singleLineString(message)
      }
    ]
  };
}

function singleLineString(value: unknown) {
  const raw = typeof value === "string" ? value : JSON.stringify(value) ?? String(value);
  return raw.replace(/\s+/g, " ").trim();
}
