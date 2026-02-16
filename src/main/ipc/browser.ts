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

      const parsed = (await response.json()) as unknown;
      let phrases: string[] = [];
      if (Array.isArray(parsed)) {
        const first = parsed[0];
        if (typeof first === "string") {
          // New DuckDuckGo format: [query, ["suggestion1", ...]]
          const list = parsed[1];
          if (Array.isArray(list)) {
            phrases = list
              .map((item) => (typeof item === "string" ? item.trim() : ""))
              .filter(Boolean)
              .slice(0, 6);
          }
        } else {
          // Legacy format: [{ phrase: "..." }, ...]
          phrases = (parsed as DuckSuggestion[])
            .map((item) => item.phrase?.trim() ?? "")
            .filter(Boolean)
            .slice(0, 6);
        }
      }

      return [...new Set(phrases)];
    } catch {
      return [] as string[];
    }
  });
}
