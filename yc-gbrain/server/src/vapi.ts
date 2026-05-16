type VapiToolCall = {
  id?: string;
  function?: {
    name?: string;
    arguments?: unknown;
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

export function extractToolArguments(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const record = body as Record<string, unknown>;

  const directToolCall = record.toolCall as VapiToolCall | undefined;
  if (directToolCall?.function?.arguments) {
    return parseArguments(directToolCall.function.arguments);
  }

  const message = record.message as Record<string, unknown> | undefined;
  const toolCalls = message?.toolCalls as VapiToolCall[] | undefined;
  const firstToolCall = toolCalls?.[0];
  if (firstToolCall?.function?.arguments) {
    return parseArguments(firstToolCall.function.arguments);
  }

  return record;
}

export function vapiToolResponse(body: unknown, result: unknown) {
  const args = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const message = args.message as Record<string, unknown> | undefined;
  const toolCalls = message?.toolCalls as VapiToolCall[] | undefined;
  const toolCallId = toolCalls?.[0]?.id ?? (args.toolCall as VapiToolCall | undefined)?.id;

  if (!toolCallId) return result;

  return {
    results: [
      {
        toolCallId,
        result
      }
    ]
  };
}
