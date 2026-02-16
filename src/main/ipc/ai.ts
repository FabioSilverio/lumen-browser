import { BrowserWindow, ipcMain } from "electron";
import { randomUUID } from "node:crypto";
import { AIService } from "../ai/ai-service";
import { ChatRequest } from "../ai/types";
import { AppSettings, SettingsStore } from "../services/settings-store";
import { SecureStorage } from "../services/secure-storage";

interface StreamController {
  abortController: AbortController;
  queued: boolean;
}

const DEFAULT_MODELS = {
  openai: ["gpt-5", "gpt-5-mini", "gpt-4.1", "o3", "o4-mini", "gpt-4o"],
  anthropic: ["claude-opus-4-1", "claude-sonnet-4", "claude-opus-4-0", "claude-haiku-4-5"],
  xai: ["grok-4", "grok-3", "grok-3-mini"],
  openrouter: ["moonshotai/kimi-k2:free", "qwen/qwen3-coder:free", "qwen/qwen-2.5-72b-instruct:free", "moonshotai/kimi-k2"],
  openclaw: ["openclaw:main", "openclaw:reasoning", "qwen3-coder"]
} as const;

const MAX_CONCURRENT_STREAMS = 2;
const REQUEST_TIMEOUT_MS = 30_000;

interface QueueItem {
  requestId: string;
  run: () => Promise<void>;
}

export function registerAIIpc(mainWindow: BrowserWindow): void {
  const aiService = new AIService();
  const secureStorage = new SecureStorage();
  const settingsStore = new SettingsStore();
  const activeStreams = new Map<string, StreamController>();
  const queue: QueueItem[] = [];
  let runningStreams = 0;

  const runQueue = () => {
    while (runningStreams < MAX_CONCURRENT_STREAMS && queue.length > 0) {
      const next = queue.shift();
      if (!next) {
        break;
      }

      const stream = activeStreams.get(next.requestId);
      if (!stream) {
        continue;
      }

      stream.queued = false;
      runningStreams += 1;

      void next
        .run()
        .finally(() => {
          runningStreams = Math.max(0, runningStreams - 1);
          runQueue();
        });
    }
  };

  ipcMain.handle("ai:get-config", () => {
    const settings = settingsStore.read();
    const provider = settings.ai.provider;

    return {
      settings: settings.ai,
      usage: settings.usage,
      hasApiKey: secureStorage.hasAPIKey(provider),
      availableModels: DEFAULT_MODELS[provider],
      budget: {
        limitUsd: settings.ai.monthlyBudgetUsd,
        warningUsd: Number((settings.ai.monthlyBudgetUsd * 0.8).toFixed(2)),
        reached: settings.usage.estimatedCostUsd >= settings.ai.monthlyBudgetUsd
      }
    };
  });

  ipcMain.handle(
    "ai:save-config",
    (_, payload: { settings: AppSettings["ai"]; apiKey?: string }) => {
      const existing = settingsStore.read();
      settingsStore.write({ ...existing, ai: payload.settings });

      if (payload.apiKey) {
        secureStorage.setAPIKey(payload.settings.provider, payload.apiKey.trim());
      }

      return {
        settings: payload.settings,
        hasApiKey: secureStorage.hasAPIKey(payload.settings.provider),
        availableModels: DEFAULT_MODELS[payload.settings.provider]
      };
    }
  );

  ipcMain.handle("ai:test-connection", async (_, provider: AppSettings["ai"]["provider"]) => {
    const settings = settingsStore.read();
    const apiKey = secureStorage.getAPIKey(provider);

    if (!apiKey) {
      return { ok: false, message: "Missing API key" };
    }

    try {
      const timeoutController = new AbortController();
      const timeout = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);

      const testSettings = {
        ...settings.ai,
        provider,
        model: DEFAULT_MODELS[provider][0] ?? settings.ai.model
      };

      await aiService.streamChat(
        apiKey,
        testSettings,
        {
          conversationId: "test",
          messages: [{ role: "user", content: "Reply with only: OK" }],
          maxTokens: 12,
          temperature: 0
        },
        () => {
          // Intentionally ignored for connectivity test.
        },
        timeoutController.signal
      );

      clearTimeout(timeout);
      return { ok: true, message: "Connection successful" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Connection failed"
      };
    }
  });

  ipcMain.handle("ai:start-chat", async (_, request: ChatRequest) => {
    const settings = settingsStore.read();
    const provider = request.providerOverride ?? settings.ai.provider;
    const modelOverride = request.modelOverride?.trim();
    const model = modelOverride && modelOverride.length > 0 ? modelOverride : settings.ai.model;
    const apiKey = secureStorage.getAPIKey(provider);

    if (!apiKey) {
      throw new Error(`No API key configured for ${provider}`);
    }

    if (settings.usage.estimatedCostUsd >= settings.ai.monthlyBudgetUsd) {
      throw new Error("Monthly AI budget reached");
    }

    const requestId = randomUUID();
    const abortController = new AbortController();
    activeStreams.set(requestId, { abortController, queued: true });

    const run = async () => {
      const timer = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

      try {
        const requestSettings = {
          ...settings.ai,
          provider,
          model
        };

        const result = await aiService.streamChat(
          apiKey,
          requestSettings,
          request,
          (token) => {
            mainWindow.webContents.send("ai:stream", { requestId, token, done: false });
          },
          abortController.signal
        );

        const latest = settingsStore.read();
        const periodKey = new Date().toISOString().slice(0, 7);
        const dayKey = new Date().toISOString().slice(0, 10);
        const usage = latest.usage.periodKey === periodKey
          ? latest.usage
          : {
            periodKey,
            promptTokens: 0,
            completionTokens: 0,
            estimatedCostUsd: 0,
            daily: {},
            featureCosts: {}
          };

        const feature = request.feature ?? "chat";
        const nextUsage = {
          periodKey,
          promptTokens: usage.promptTokens + (result.usage?.promptTokens ?? 0),
          completionTokens: usage.completionTokens + (result.usage?.completionTokens ?? 0),
          estimatedCostUsd: Number((usage.estimatedCostUsd + result.estimatedCostUsd).toFixed(4)),
          daily: {
            ...usage.daily,
            [dayKey]: Number(((usage.daily[dayKey] ?? 0) + result.estimatedCostUsd).toFixed(4))
          },
          featureCosts: {
            ...usage.featureCosts,
            [feature]: Number(((usage.featureCosts[feature] ?? 0) + result.estimatedCostUsd).toFixed(4))
          }
        };

        settingsStore.write({ ...latest, usage: nextUsage });
        mainWindow.webContents.send("ai:stream", {
          requestId,
          done: true,
          usage: nextUsage,
          budgetReached: nextUsage.estimatedCostUsd >= settings.ai.monthlyBudgetUsd,
          budgetWarning: nextUsage.estimatedCostUsd >= settings.ai.monthlyBudgetUsd * 0.8
        });
      } catch (error) {
        mainWindow.webContents.send("ai:stream", {
          requestId,
          done: true,
          error: error instanceof Error ? error.message : "AI request failed"
        });
      } finally {
        clearTimeout(timer);
        activeStreams.delete(requestId);
      }
    };

    if (runningStreams >= MAX_CONCURRENT_STREAMS) {
      queue.push({ requestId, run });
      mainWindow.webContents.send("ai:stream", {
        requestId,
        done: false,
        queued: true,
        message: "AI is busy. Your request is queued."
      });
    } else {
      queue.push({ requestId, run });
      runQueue();
    }

    return { requestId };
  });

  ipcMain.handle("ai:cancel-chat", (_, requestId: string) => {
    const stream = activeStreams.get(requestId);
    if (stream) {
      stream.abortController.abort();
      activeStreams.delete(requestId);
    }

    const index = queue.findIndex((item) => item.requestId === requestId);
    if (index !== -1) {
      queue.splice(index, 1);
    }

    return { ok: true };
  });
}
