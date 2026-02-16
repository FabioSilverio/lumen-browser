import { AIProviderClient, ChatMessage, ProviderStreamResult } from "../types";
import { formatProviderError, ProviderRequestError, readSSEStream } from "./common";

export class XAIProvider implements AIProviderClient {
  async streamChat(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    options: { maxTokens?: number; temperature?: number },
    onToken: (token: string) => void,
    signal: AbortSignal
  ): Promise<ProviderStreamResult> {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
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
      throw new ProviderRequestError(formatProviderError("xAI", response.status, details), response.status);
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
