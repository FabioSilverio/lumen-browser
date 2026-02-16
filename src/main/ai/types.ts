export type AIProvider = "openai" | "anthropic" | "xai";
export type AIChatFeature = "chat" | "url_bar" | "summary" | "tab_intelligence" | "context_menu" | "tab_search";

export interface AISettings {
  provider: AIProvider;
  model: string;
  systemPrompt: string;
  monthlyBudgetUsd: number;
}

export interface AIUsage {
  periodKey: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  daily: Record<string, number>;
  featureCosts: Record<string, number>;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  conversationId: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  feature?: AIChatFeature;
  providerOverride?: AIProvider;
  modelOverride?: string;
}

export interface ChatUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ProviderStreamResult {
  usage?: ChatUsage;
}

export type TokenCallback = (token: string) => void;

export interface AIProviderClient {
  streamChat(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    options: { maxTokens?: number; temperature?: number },
    onToken: TokenCallback,
    signal: AbortSignal
  ): Promise<ProviderStreamResult>;
}

export interface StoredAIConfig {
  settings: AISettings;
  usage: AIUsage;
}
