type VapiToolCall = {
  id?: string;
  name?: string;
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

  return (
    (record.toolCall as VapiToolCall | undefined) ??
    (message?.toolCalls as VapiToolCall[] | undefined)?.[0] ??
    (message?.toolCallList as VapiToolCall[] | undefined)?.[0]
  );
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
    parseArguments(toolCall?.arguments),
    parseArguments(toolCall?.function?.arguments),
    parseArguments(toolCall?.function?.parameters),
    directBody
  );
}

export function vapiToolResponse(body: unknown, result: unknown) {
  const toolCallId = getFirstToolCall(body)?.id;

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
