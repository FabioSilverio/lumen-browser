import { ipcMain } from "electron";

interface DuckSuggestion {
  phrase?: string;
}

export function registerBrowserIpc(): void {
  ipcMain.handle("browser:get-address-suggestions", async (_, query: string) => {
    const value = query.trim();
    if (value.length < 2) {
      return [] as string[];
    }

    try {
      const response = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(value)}&type=list`, {
        headers: {
          "User-Agent": "Lumen/1.0"
        }
      });

      if (!response.ok) {
        return [] as string[];
      }

      const parsed = (await response.json()) as DuckSuggestion[];
      const phrases = parsed
        .map((item) => item.phrase?.trim() ?? "")
        .filter(Boolean)
        .slice(0, 6);

      return [...new Set(phrases)];
    } catch {
      return [] as string[];
    }
  });
}
