import { ChatMessage } from "../types";

const decoder = new TextDecoder();
type ProviderName = "OpenAI" | "Anthropic" | "xAI";

export class ProviderRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ProviderRequestError";
  }
}

function parseErrorPayload(details: string): {
  message?: string;
  code?: string;
  type?: string;
} {
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    const nested = parsed.error as Record<string, unknown> | undefined;

    if (nested && typeof nested === "object") {
      return {
        message: typeof nested.message === "string" ? nested.message : undefined,
        code: typeof nested.code === "string" ? nested.code : undefined,
        type: typeof nested.type === "string" ? nested.type : undefined
      };
    }

    return {
      message: typeof parsed.message === "string" ? parsed.message : undefined,
      code: typeof parsed.code === "string" ? parsed.code : undefined,
      type: typeof parsed.type === "string" ? parsed.type : undefined
    };
  } catch {
    return {};
  }
}

export function formatProviderError(provider: ProviderName, status: number, details: string): string {
  const parsed = parseErrorPayload(details);
  const message = parsed.message?.trim();
  const code = parsed.code?.toLowerCase() ?? "";
  const type = parsed.type?.toLowerCase() ?? "";

  if (status === 401) {
    return `${provider} API key is invalid or missing permission. Update it in Settings > AI.`;
  }

  if (status === 429 && (code === "insufficient_quota" || type === "insufficient_quota")) {
    return `${provider} quota exceeded. Add billing/credits for this provider or switch provider and use @claude/@grok/@gpt commands.`;
  }

  if (status === 429) {
    return `${provider} rate limit reached. Wait a moment and try again.`;
  }

  if (status >= 500) {
    return `${provider} is temporarily unavailable (${status}). Please retry shortly.`;
  }

  if (message) {
    return `${provider} request failed (${status}): ${message}`;
  }

  return `${provider} request failed (${status}).`;
}

export function parseSSEChunk(buffer: string): { events: string[]; rest: string } {
  const lines = buffer.split(/\r?\n\r?\n/);
  const rest = lines.pop() ?? "";
  return { events: lines, rest };
}

export async function readSSEStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (payload: string) => void,
  signal: AbortSignal
): Promise<void> {
  const reader = stream.getReader();
  let pending = "";

  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    pending += decoder.decode(value, { stream: true });
    const { events, rest } = parseSSEChunk(pending);
    pending = rest;

    for (const event of events) {
      const dataLines = event
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .filter(Boolean);

      for (const payload of dataLines) {
        onEvent(payload);
      }
    }
  }
}

export function withSystemPrompt(messages: ChatMessage[], systemPrompt: string): ChatMessage[] {
  if (!systemPrompt.trim()) {
    return messages;
  }

  const hasSystem = messages.some((msg) => msg.role === "system");
  if (hasSystem) {
    return messages;
  }

  return [{ role: "system", content: systemPrompt }, ...messages];
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
