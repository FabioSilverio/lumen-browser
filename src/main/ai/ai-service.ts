import { AIProviderClient, AISettings, ChatRequest } from "./types";
import { OpenAIProvider } from "./providers/openai-provider";
import { AnthropicProvider } from "./providers/anthropic-provider";
import { XAIProvider } from "./providers/xai-provider";
import { OpenRouterProvider } from "./providers/openrouter-provider";
import { OpenClawProvider } from "./providers/openclaw-provider";
import { delay, ProviderRequestError, withSystemPrompt } from "./providers/common";

interface CostTable {
  promptPerMTok: number;
  completionPerMTok: number;
}

const ESTIMATED_COSTS: Record<string, CostTable> = {
  "gpt-5": { promptPerMTok: 5, completionPerMTok: 15 },
  "gpt-5-mini": { promptPerMTok: 0.25, completionPerMTok: 1.2 },
  "o3": { promptPerMTok: 2, completionPerMTok: 8 },
  "o4-mini": { promptPerMTok: 0.4, completionPerMTok: 1.6 },
  "gpt-4o": { promptPerMTok: 5, completionPerMTok: 15 },
  "gpt-4o-mini": { promptPerMTok: 0.15, completionPerMTok: 0.6 },
  "gpt-4.1": { promptPerMTok: 2, completionPerMTok: 8 },
  "gpt-4.1-mini": { promptPerMTok: 0.4, completionPerMTok: 1.6 },
  "o3-mini": { promptPerMTok: 1.1, completionPerMTok: 4.4 },
  "claude-opus-4-1": { promptPerMTok: 15, completionPerMTok: 75 },
  "claude-sonnet-4": { promptPerMTok: 3, completionPerMTok: 15 },
  "claude-opus-4-0": { promptPerMTok: 15, completionPerMTok: 75 },
  "claude-haiku-4-5": { promptPerMTok: 1, completionPerMTok: 5 },
  "claude-sonnet-4-20250514": { promptPerMTok: 3, completionPerMTok: 15 },
  "claude-opus-4-0-20250514": { promptPerMTok: 15, completionPerMTok: 75 },
  "claude-haiku-4-5-20251001": { promptPerMTok: 1, completionPerMTok: 5 },
  "grok-4": { promptPerMTok: 6, completionPerMTok: 18 },
  "grok-3": { promptPerMTok: 5, completionPerMTok: 15 },
  "grok-3-mini": { promptPerMTok: 0.3, completionPerMTok: 0.7 },
  "moonshotai/kimi-k2:free": { promptPerMTok: 0, completionPerMTok: 0 },
  "moonshotai/kimi-k2": { promptPerMTok: 1, completionPerMTok: 3 },
  "qwen/qwen3-coder:free": { promptPerMTok: 0, completionPerMTok: 0 },
  "qwen/qwen-2.5-72b-instruct:free": { promptPerMTok: 0, completionPerMTok: 0 }
};

export class AIService {
  private readonly clients: Record<AISettings["provider"], AIProviderClient> = {
    openai: new OpenAIProvider(),
    anthropic: new AnthropicProvider(),
    xai: new XAIProvider(),
    openrouter: new OpenRouterProvider(),
    openclaw: new OpenClawProvider()
  };

  async streamChat(
    apiKey: string,
    settings: AISettings,
    request: ChatRequest,
    onToken: (token: string) => void,
    signal: AbortSignal
  ): Promise<{ estimatedCostUsd: number; usage?: { promptTokens?: number; completionTokens?: number } }> {
    const client = this.clients[settings.provider];
    const messages = withSystemPrompt(request.messages, settings.systemPrompt);
    const result = await this.streamWithRetry(
      client,
      apiKey,
      settings.model,
      messages,
      { maxTokens: request.maxTokens, temperature: request.temperature },
      onToken,
      signal
    );

    const estimatedCostUsd = this.estimateCost(settings.model, result.usage?.promptTokens, result.usage?.completionTokens);

    return {
      estimatedCostUsd,
      usage: {
        promptTokens: result.usage?.promptTokens,
        completionTokens: result.usage?.completionTokens
      }
    };
  }

  private async streamWithRetry(
    client: AIProviderClient,
    apiKey: string,
    model: string,
    messages: ChatRequest["messages"],
    options: { maxTokens?: number; temperature?: number },
    onToken: (token: string) => void,
    signal: AbortSignal
  ) {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await client.streamChat(apiKey, model, messages, options, onToken, signal);
      } catch (error) {
        if (signal.aborted) {
          throw new Error("Request canceled");
        }

        const isRetryable =
          error instanceof ProviderRequestError &&
          (error.status === 429 || error.status >= 500);

        if (!isRetryable || attempt === maxAttempts) {
          throw error;
        }

        const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 4000);
        await delay(backoffMs);
      }
    }

    throw new Error("AI request failed");
  }

  estimateCost(model: string, promptTokens = 0, completionTokens = 0): number {
    const pricing = ESTIMATED_COSTS[model];
    if (!pricing) {
      return 0;
    }

    const promptCost = (promptTokens / 1_000_000) * pricing.promptPerMTok;
    const completionCost = (completionTokens / 1_000_000) * pricing.completionPerMTok;

    return Number((promptCost + completionCost).toFixed(6));
  }
}
