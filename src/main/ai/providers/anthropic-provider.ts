import { AIProviderClient, ChatMessage, ProviderStreamResult } from "../types";
import { ProviderRequestError, readSSEStream } from "./common";

export class AnthropicProvider implements AIProviderClient {
  async streamChat(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    options: { maxTokens?: number; temperature?: number },
    onToken: (token: string) => void,
    signal: AbortSignal
  ): Promise<ProviderStreamResult> {
    const system = messages.find((msg) => msg.role === "system")?.content ?? "";
    const chatMessages = messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: [{ type: "text", text: msg.content }]
      }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        stream: true,
        system,
        messages: chatMessages,
        max_tokens: options.maxTokens ?? 512,
        temperature: options.temperature ?? 0.4
      })
    });

    if (!response.ok || !response.body) {
      const details = await response.text();
      throw new ProviderRequestError(`Anthropic request failed (${response.status}): ${details}`, response.status);
    }

    let usage: ProviderStreamResult["usage"];

    await readSSEStream(
      response.body,
      (payload) => {
        if (payload === "[DONE]") {
          return;
        }

        const parsed = JSON.parse(payload) as {
          type?: string;
          delta?: { text?: string };
          usage?: { input_tokens?: number; output_tokens?: number };
        };

        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          onToken(parsed.delta.text);
        }

        if (parsed.usage) {
          usage = {
            promptTokens: parsed.usage.input_tokens,
            completionTokens: parsed.usage.output_tokens,
            totalTokens:
              (parsed.usage.input_tokens ?? 0) + (parsed.usage.output_tokens ?? 0)
          };
        }
      },
      signal
    );

    return { usage };
  }
}
