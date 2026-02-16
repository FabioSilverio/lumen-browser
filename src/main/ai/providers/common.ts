import { ChatMessage } from "../types";

const decoder = new TextDecoder();

export class ProviderRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ProviderRequestError";
  }
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
