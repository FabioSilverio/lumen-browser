export type AIProvider = "openai" | "anthropic" | "xai" | "openrouter" | "openclaw";
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
  kind?: "web" | "ai" | "welcome" | "newtab";
  favicon?: string;
  pinned: boolean;
  suspended: boolean;
  lastActiveAt: number;
  createdAt: number;
  spaceId: string;
  folderId?: string;
  aiQuery?: string;
  aiProviderLabel?: string;
  aiResponse?: string;
  aiLoading?: boolean;
  aiError?: string;
  aiMessages?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface FavoritePage {
  id: string;
  title: string;
  url: string;
  createdAt: number;
}

export interface TabSpace {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
}

export interface TabFolder {
  id: string;
  name: string;
  spaceId: string;
  collapsed: boolean;
}

export interface BrowserProfile {
  id: string;
  name: string;
  createdAt: number;
}

export interface InstalledExtension {
  id: string;
  name: string;
  version: string;
  description: string;
  path: string;
}

export interface SavedPassword {
  id: string;
  site: string;
  username: string;
  password: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type PermissionRuleDecision = "allow" | "block";
export type PermissionDecisionLog =
  | "allow_once"
  | "allow_always"
  | "block_once"
  | "block_always"
  | "rule_allow"
  | "rule_block";

export interface PermissionRule {
  key: string;
  origin: string;
  permission: string;
  decision: PermissionRuleDecision;
  updatedAt: number;
}

export interface PermissionEvent {
  id: string;
  timestamp: number;
  origin: string;
  permission: string;
  decision: PermissionDecisionLog;
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
        onShortcut: (listener: (payload: {
          action:
            | "new_tab"
            | "close_tab"
            | "focus_url"
            | "toggle_palette"
            | "toggle_sidebar"
            | "toggle_theme"
            | "toggle_suspend"
            | "toggle_ai"
            | "group_tabs"
            | "toggle_task_manager"
            | "refresh_page"
            | "toggle_favorite"
            | "next_tab"
            | "prev_tab";
        }) => void) => () => void;
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
        getAddressSuggestions: (query: string) => Promise<string[]>;
        onNewTabRequested: (listener: (payload: { url: string }) => void) => () => void;
      };
      extensions: {
        activateProfile: (profileId: string) => Promise<{ loaded: number }>;
        list: (profileId: string) => Promise<InstalledExtension[]>;
        pickAndInstall: (profileId: string) => Promise<InstalledExtension[]>;
        importCrx: (profileId: string) => Promise<InstalledExtension[]>;
        installFromWebStore: (profileId: string, storeUrl: string) => Promise<InstalledExtension[]>;
        remove: (profileId: string, extensionId: string) => Promise<InstalledExtension[]>;
      };
      passwords: {
        list: (profileId: string) => Promise<SavedPassword[]>;
        save: (payload: {
          profileId: string;
          entry: {
            id?: string;
            site: string;
            username: string;
            password: string;
            notes?: string;
          };
        }) => Promise<SavedPassword[]>;
        remove: (payload: { profileId: string; id: string }) => Promise<SavedPassword[]>;
      };
      security: {
        getAudit: () => Promise<{ events: PermissionEvent[]; rules: PermissionRule[] }>;
        setRule: (payload: { origin: string; permission: string; decision: PermissionRuleDecision }) => Promise<{ rules: PermissionRule[] }>;
        removeRule: (key: string) => Promise<{ rules: PermissionRule[] }>;
        clearEvents: () => Promise<{ events: PermissionEvent[] }>;
      };
    };
  }

}

export {};
