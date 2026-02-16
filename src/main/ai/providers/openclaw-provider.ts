import { AIProviderClient, ChatMessage, ProviderStreamResult } from "../types";
import { formatProviderError, ProviderRequestError, readSSEStream } from "./common";

const OPENCLAW_BASE_URL = process.env.OPENCLAW_BASE_URL?.trim() || "http://127.0.0.1:18789/v1/chat/completions";

export class OpenClawProvider implements AIProviderClient {
  async streamChat(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    options: { maxTokens?: number; temperature?: number },
    onToken: (token: string) => void,
    signal: AbortSignal
  ): Promise<ProviderStreamResult> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (apiKey.trim()) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(OPENCLAW_BASE_URL, {
      method: "POST",
      signal,
      headers,
      body: JSON.stringify({
        model,
        stream: true,
        messages,
        max_tokens: options.maxTokens,
        temperature: options.temperature ?? 0.4
      })
    });

    if (!response.ok || !response.body) {
      const details = await response.text();
      throw new ProviderRequestError(formatProviderError("OpenClaw", response.status, details), response.status);
    }

    let usage: ProviderStreamResult["usage"];

    await readSSEStream(
      response.body,
      (payload) => {
        if (payload === "[DONE]") {
          return;
        }

        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
          usage?: ProviderStreamResult["usage"];
        };

        const token = parsed.choices?.[0]?.delta?.content;
        if (token) {
          onToken(token);
        }

        if (parsed.usage) {
          usage = parsed.usage;
        }
      },
      signal
    );

    return { usage };
  }
}
