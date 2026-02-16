export type AIProvider = "openai" | "anthropic" | "xai";
export type AIChatFeature = "chat" | "url_bar" | "summary" | "tab_intelligence" | "context_menu" | "tab_search";

export interface AIPanelSettings {
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

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  pinned: boolean;
  suspended: boolean;
  lastActiveAt: number;
  createdAt: number;
  spaceId: string;
}

export interface TabSpace {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
}

export interface LumenMetrics {
  processes: Array<{
    pid: number;
    type: string;
    cpuPercent: number;
    memoryMB: number;
  }>;
  system: {
    totalMemoryMB: number;
    usedMemoryMB: number;
    memoryPressureRatio: number;
  };
}

export interface AISummary {
  key: string;
  cost: number;
}

declare global {
  interface Window {
    lumen: {
      window: {
        minimize: () => Promise<void>;
        toggleMaximize: () => Promise<boolean>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
        onMaximizedChange: (listener: (maximized: boolean) => void) => () => void;
      };
      system: {
        metrics: () => Promise<LumenMetrics>;
      };
      ai: {
        getConfig: () => Promise<{
          settings: AIPanelSettings;
          usage: AIUsage;
          hasApiKey: boolean;
          availableModels: string[];
          budget: {
            limitUsd: number;
            warningUsd: number;
            reached: boolean;
          };
        }>;
        saveConfig: (payload: {
          settings: AIPanelSettings;
          apiKey?: string;
        }) => Promise<{
          settings: AIPanelSettings;
          hasApiKey: boolean;
          availableModels: string[];
        }>;
        testConnection: (provider: AIProvider) => Promise<{ ok: boolean; message: string }>;
        startChat: (payload: {
          conversationId: string;
          messages: ChatMessage[];
          maxTokens?: number;
          temperature?: number;
          feature?: AIChatFeature;
          providerOverride?: AIProvider;
          modelOverride?: string;
        }) => Promise<{ requestId: string }>;
        cancelChat: (requestId: string) => Promise<{ ok: boolean }>;
        onStream: (
          listener: (payload: {
            requestId: string;
            token?: string;
            done: boolean;
            error?: string;
            usage?: AIUsage;
            queued?: boolean;
            message?: string;
            budgetReached?: boolean;
            budgetWarning?: boolean;
          }) => void
        ) => () => void;
        onContextAction: (
          listener: (payload: { action: string; text: string }) => void
        ) => () => void;
      };
      browser: {
        onNewTabRequested: (listener: (payload: { url: string }) => void) => () => void;
      };
    };
  }

}

export {};
