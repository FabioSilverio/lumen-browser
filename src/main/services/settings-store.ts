import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { AISettings, AIUsage } from "../ai/types";

interface AppSettings {
  ai: AISettings;
  usage: AIUsage;
  theme: "light" | "dark";
  sidebarPinned: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    provider: "openai",
    model: "gpt-4o-mini",
    systemPrompt: "You are Lumen AI, a helpful browser assistant. Be concise and direct.",
    monthlyBudgetUsd: 20
  },
  usage: {
    periodKey: "",
    promptTokens: 0,
    completionTokens: 0,
    estimatedCostUsd: 0,
    daily: {},
    featureCosts: {}
  },
  theme: "light",
  sidebarPinned: true
};

export class SettingsStore {
  private readonly path = join(app.getPath("userData"), "settings.json");

  read(): AppSettings {
    try {
      if (!existsSync(this.path)) {
        return DEFAULT_SETTINGS;
      }

      const raw = readFileSync(this.path, "utf-8");
      const parsed = JSON.parse(raw) as Partial<AppSettings>;

      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        ai: {
          ...DEFAULT_SETTINGS.ai,
          ...(parsed.ai ?? {})
        },
        usage: {
          ...DEFAULT_SETTINGS.usage,
          ...(parsed.usage ?? {}),
          daily: parsed.usage?.daily ?? DEFAULT_SETTINGS.usage.daily,
          featureCosts: parsed.usage?.featureCosts ?? DEFAULT_SETTINGS.usage.featureCosts
        }
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  write(next: AppSettings): void {
    const folder = dirname(this.path);
    if (!existsSync(folder)) {
      mkdirSync(folder, { recursive: true });
    }

    writeFileSync(this.path, JSON.stringify(next, null, 2), "utf-8");
  }
}

export type { AppSettings };
