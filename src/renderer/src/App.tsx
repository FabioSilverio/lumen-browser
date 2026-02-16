import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AIPanel } from "./components/AIPanel";
import { CommandPalette } from "./components/CommandPalette";
import { Sidebar } from "./components/Sidebar";
import { TaskManagerModal } from "./components/TaskManagerModal";
import { TitleBar } from "./components/TitleBar";
import { WebViewport } from "./components/WebViewport";
import { AIChatFeature, AIProvider, BrowserTab, TabSpace } from "./types";

const SUSPEND_AFTER_MS = 5 * 60 * 1000;
const STALE_AFTER_MS = 2 * 60 * 60 * 1000;
const STORAGE_KEY = "lumen.session.v2";
const SUMMARY_CACHE_KEY = "lumen.summary.cache.v1";

const SPACE_COLORS = ["#0a84ff", "#30d158", "#ff9f0a", "#ff375f", "#64d2ff", "#bf5af2"];

interface AppSession {
  tabs: BrowserTab[];
  spaces: TabSpace[];
  activeTabId: string;
  theme: "light" | "dark";
  sidebarPinned: boolean;
  suspensionEnabled: boolean;
  sidebarWidth: number;
}

interface PageIntel {
  summary: string;
  readingTimeMin: number;
  topics: string[];
}

interface Toast {
  id: string;
  text: string;
}

interface PendingAI {
  text: string;
  resolve: (text: string) => void;
  reject: (error: Error) => void;
}

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function createSpace(name: string, color = SPACE_COLORS[0] ?? "#0a84ff"): TabSpace {
  return {
    id: crypto.randomUUID(),
    name,
    color,
    collapsed: false
  };
}

function createTab(spaceId: string, url = "https://duckduckgo.com", title = "New Tab"): BrowserTab {
  return {
    id: crypto.randomUUID(),
    title,
    url,
    kind: "web",
    pinned: false,
    suspended: false,
    lastActiveAt: Date.now(),
    createdAt: Date.now(),
    spaceId
  };
}

function createAITab(spaceId: string, query: string, label: string): BrowserTab {
  const cleanQuery = query.trim();
  const clipped = cleanQuery.length > 42 ? `${cleanQuery.slice(0, 42)}...` : cleanQuery;

  return {
    id: crypto.randomUUID(),
    title: `AI: ${clipped || "New query"}`,
    url: "lumen://ai",
    kind: "ai",
    pinned: false,
    suspended: false,
    lastActiveAt: Date.now(),
    createdAt: Date.now(),
    spaceId,
    aiQuery: cleanQuery,
    aiProviderLabel: label,
    aiResponse: "",
    aiLoading: true
  };
}

function normalizeAddress(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "https://duckduckgo.com";
  }

  if (/^[a-zA-Z]+:\/\//.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.includes(" ")) {
    return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
  }

  if (trimmed.includes(".")) {
    return `https://${trimmed}`;
  }

  return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
}

function parseAddressAI(
  rawInput: string
): { query: string; providerOverride?: AIProvider; modelOverride?: string; label: string } | null {
  const raw = rawInput.trim();
  if (!raw) {
    return null;
  }

  if (raw.startsWith(">")) {
    const query = raw.replace(/^>\s*/, "").trim();
    return query ? { query, label: "AI" } : null;
  }

  if (/^ask:/i.test(raw)) {
    const query = raw.replace(/^ask:\s*/i, "").trim();
    return query ? { query, label: "AI" } : null;
  }

  if (!raw.startsWith("@")) {
    return null;
  }

  const [prefix = "@", ...rest] = raw.split(/\s+/);
  const lowerPrefix = prefix.toLowerCase();
  const remaining = rest.join(" ").trim();

  if (lowerPrefix === "@" || lowerPrefix === "@chat") {
    return remaining ? { query: remaining, label: "AI" } : null;
  }

  if (lowerPrefix === "@gpt" || lowerPrefix === "@openai") {
    return remaining ? { query: remaining, providerOverride: "openai", label: "AI (openai)" } : null;
  }

  if (lowerPrefix === "@claude" || lowerPrefix === "@anthropic") {
    return remaining ? { query: remaining, providerOverride: "anthropic", label: "AI (claude)" } : null;
  }

  if (lowerPrefix === "@grok" || lowerPrefix === "@xai") {
    return remaining ? { query: remaining, providerOverride: "xai", label: "AI (grok)" } : null;
  }

  if (lowerPrefix === "@qwen") {
    return remaining
      ? { query: remaining, providerOverride: "openrouter", modelOverride: "qwen/qwen3-coder:free", label: "AI (qwen)" }
      : null;
  }

  if (lowerPrefix === "@kimi") {
    return remaining
      ? { query: remaining, providerOverride: "openrouter", modelOverride: "moonshotai/kimi-k2:free", label: "AI (kimi)" }
      : null;
  }

  if (lowerPrefix === "@openclaw" || lowerPrefix === "@claw") {
    return remaining ? { query: remaining, providerOverride: "openclaw", label: "AI (openclaw)" } : null;
  }

  const fallback = raw.slice(1).trim();
  return fallback ? { query: fallback, label: "AI" } : null;
}

function rotateTabs(tabs: BrowserTab[], activeTabId: string, direction: 1 | -1): string {
  const index = tabs.findIndex((tab) => tab.id === activeTabId);
  if (index === -1 || tabs.length === 0) {
    return activeTabId;
  }

  const next = (index + direction + tabs.length) % tabs.length;
  return tabs[next]?.id ?? activeTabId;
}

function deriveTopics(text: string): string[] {
  const stopWords = new Set([
    "the", "and", "that", "with", "from", "this", "have", "about", "your", "will", "were", "they",
    "their", "into", "there", "http", "https", "www", "com", "for", "not", "you", "are", "was",
    "what", "when", "where", "which", "how", "why", "can", "has", "had", "its", "our", "out"
  ]);

  const counts = new Map<string, number>();
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3 && !stopWords.has(token))
    .forEach((token) => {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([token]) => token);
}

function loadInitialSession(): AppSession {
  const fallbackSpaces = [
    createSpace("General", SPACE_COLORS[0] ?? "#0a84ff"),
    createSpace("Research", SPACE_COLORS[1] ?? "#30d158")
  ];
  const firstSpaceId = fallbackSpaces[0]?.id ?? crypto.randomUUID();
  const fallbackTab = createTab(firstSpaceId, "https://www.wikipedia.org", "Wikipedia");

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        tabs: [fallbackTab],
        spaces: fallbackSpaces,
        activeTabId: fallbackTab.id,
        theme: "light",
        sidebarPinned: true,
        suspensionEnabled: true,
        sidebarWidth: 240
      };
    }

    const parsed = JSON.parse(raw) as Partial<AppSession>;
    const spaces = parsed.spaces?.length ? parsed.spaces : fallbackSpaces;
    const defaultSpaceId = spaces[0]?.id ?? firstSpaceId;
    const tabs = parsed.tabs?.length
      ? parsed.tabs.map((tab) => ({
        ...tab,
        kind: tab.kind ?? "web",
        spaceId: tab.spaceId || defaultSpaceId
      }))
      : [fallbackTab];
    const activeTabId = tabs.some((tab) => tab.id === parsed.activeTabId)
      ? parsed.activeTabId ?? tabs[0]?.id ?? fallbackTab.id
      : tabs[0]?.id ?? fallbackTab.id;

    return {
      tabs,
      spaces,
      activeTabId,
      theme: parsed.theme === "dark" ? "dark" : "light",
      sidebarPinned: parsed.sidebarPinned ?? true,
      suspensionEnabled: parsed.suspensionEnabled ?? true,
      sidebarWidth: typeof parsed.sidebarWidth === "number" ? Math.min(420, Math.max(180, parsed.sidebarWidth)) : 240
    };
  } catch {
    return {
      tabs: [fallbackTab],
      spaces: fallbackSpaces,
      activeTabId: fallbackTab.id,
      theme: "light",
      sidebarPinned: true,
      suspensionEnabled: true,
      sidebarWidth: 240
    };
  }
}

export function App() {
  const initialSession = loadInitialSession();
  const [tabs, setTabs] = useState<BrowserTab[]>(initialSession.tabs);
  const [spaces, setSpaces] = useState<TabSpace[]>(initialSession.spaces);
  const [activeTabId, setActiveTabId] = useState<string>(initialSession.activeTabId);
  const [urlValue, setUrlValue] = useState("");
  const [urlFocused, setUrlFocused] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(initialSession.theme);
  const [sidebarPinned, setSidebarPinned] = useState(initialSession.sidebarPinned);
  const [sidebarPeek, setSidebarPeek] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [taskManagerOpen, setTaskManagerOpen] = useState(false);
  const [suspensionEnabled, setSuspensionEnabled] = useState(initialSession.suspensionEnabled);
  const [sidebarWidth, setSidebarWidth] = useState(initialSession.sidebarWidth);
  const [queuedPrompt, setQueuedPrompt] = useState<{
    id: string;
    text: string;
    feature?: AIChatFeature;
  } | null>(null);
  const [pageIntel, setPageIntel] = useState<Record<string, PageIntel>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [memoryPressureRatio, setMemoryPressureRatio] = useState(0);

  const hoverTimerRef = useRef<number | null>(null);
  const webviewRef = useRef<Electron.WebviewTag | null>(null);
  const urlBarAIRequestMap = useRef<Map<string, string>>(new Map());
  const pendingAIMap = useRef<Map<string, PendingAI>>(new Map());

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId), [tabs, activeTabId]);

  const addToast = useCallback((text: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const requestAIText = useCallback(async (request: {
    conversationId: string;
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    maxTokens?: number;
    temperature?: number;
    feature?: AIChatFeature;
    providerOverride?: AIProvider;
    modelOverride?: string;
  }) => {
    const start = await window.lumen.ai.startChat(request);

    return new Promise<string>((resolve, reject) => {
      pendingAIMap.current.set(start.requestId, { text: "", resolve, reject });
    });
  }, []);

  const extractPageContext = useCallback(async () => {
    const webview = webviewRef.current;
    if (!webview || !activeTab || activeTab.suspended) {
      return null;
    }

    try {
      const payload = await webview.executeJavaScript(`(() => {
        const title = document.title || "";
        const url = location.href;
        const selection = window.getSelection ? String(window.getSelection()) : "";
        const text = (document.body?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 12000);
        return { title, url, selection, text };
      })()`);

      return payload as { title: string; url: string; selection: string; text: string };
    } catch {
      return null;
    }
  }, [activeTab]);

  const runPageIntelligence = useCallback(async () => {
    if (!activeTab) {
      return;
    }
    if (activeTab.kind === "ai") {
      addToast("Page intelligence is not available on AI result tabs.");
      return;
    }

    const context = await extractPageContext();
    if (!context) {
      addToast("Unable to read the current page.");
      return;
    }

    const wordCount = context.text.split(/\s+/).filter(Boolean).length;
    const readingTimeMin = Math.max(1, Math.round(wordCount / 220));
    const topics = deriveTopics(context.text);

    const cacheKey = `${simpleHash(context.url)}:${simpleHash(context.text.slice(0, 2000))}`;

    try {
      const rawCache = window.localStorage.getItem(SUMMARY_CACHE_KEY);
      const parsed = rawCache ? (JSON.parse(rawCache) as Record<string, PageIntel>) : {};

        const cached = parsed[cacheKey];
        if (cached) {
          setPageIntel((prev) => ({ ...prev, [activeTab.id]: cached }));
        addToast("Loaded cached summary.");
        return;
      }

      const summary = await requestAIText({
        conversationId: `summary-${activeTab.id}`,
        feature: "summary",
        maxTokens: 360,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: `Summarize this page in under 120 words. Return plain text only.\n\nTitle: ${context.title}\nURL: ${context.url}\n\n${context.text}`
          }
        ]
      });

      const intel = { summary, readingTimeMin, topics };
      setPageIntel((prev) => ({ ...prev, [activeTab.id]: intel }));
      window.localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify({ ...parsed, [cacheKey]: intel }));
      addToast("Page intelligence ready.");
    } catch (error) {
      setPageIntel((prev) => ({
        ...prev,
        [activeTab.id]: {
          summary: error instanceof Error ? error.message : "AI summary failed.",
          readingTimeMin,
          topics
        }
      }));
      addToast("Page intelligence failed.");
    }
  }, [activeTab, addToast, extractPageContext, requestAIText]);

  useEffect(() => {
    if (activeTab) {
      if (activeTab.kind === "ai" && activeTab.aiQuery) {
        setUrlValue(`@chat ${activeTab.aiQuery}`);
      } else {
        setUrlValue(activeTab.url);
      }
    }
  }, [activeTab?.id, activeTab?.url, activeTab?.kind, activeTab?.aiQuery]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tabs,
        spaces,
        activeTabId,
        theme,
        sidebarPinned,
        suspensionEnabled,
        sidebarWidth
      } satisfies AppSession)
    );
  }, [tabs, spaces, activeTabId, theme, sidebarPinned, suspensionEnabled, sidebarWidth]);

  useEffect(() => {
    return window.lumen.ai.onStream((payload) => {
      const aiTabId = urlBarAIRequestMap.current.get(payload.requestId);
      if (aiTabId) {
        if (payload.token) {
          setTabs((prev) =>
            prev.map((tab) =>
              tab.id === aiTabId
                ? {
                  ...tab,
                  aiResponse: `${tab.aiResponse ?? ""}${payload.token}`,
                  aiLoading: true
                }
                : tab
            )
          );
        }

        if (payload.done) {
          setTabs((prev) =>
            prev.map((tab) =>
              tab.id === aiTabId
                ? {
                  ...tab,
                  aiLoading: false,
                  aiError: payload.error,
                  aiResponse: payload.error ? (tab.aiResponse || payload.error) : tab.aiResponse
                }
                : tab
            )
          );

          if (payload.error) {
            addToast(payload.error);
          }

          urlBarAIRequestMap.current.delete(payload.requestId);
        }
      }

      const pending = pendingAIMap.current.get(payload.requestId);
      if (!pending) {
        return;
      }

      if (payload.token) {
        pending.text += payload.token;
      }

      if (payload.done) {
        pendingAIMap.current.delete(payload.requestId);

        if (payload.error) {
          pending.reject(new Error(payload.error));
        } else {
          pending.resolve(pending.text.trim());
        }
      }
    });
  }, [addToast]);

  useEffect(() => {
    const stopContextListener = window.lumen.ai.onContextAction((payload) => {
      const selected = payload.text.trim();
      if (!selected) {
        return;
      }

      if (payload.action === "ask") {
        setAiOpen(true);
        setQueuedPrompt({
          id: crypto.randomUUID(),
          text: `Use this selected text as context:\n\n${selected}\n\nUser request: explain the key meaning and implications.`,
          feature: "context_menu"
        });
        return;
      }

      if (payload.action === "summarize") {
        void (async () => {
          try {
            const answer = await requestAIText({
              conversationId: `ctx-summary-${Date.now()}`,
              feature: "context_menu",
              maxTokens: 180,
              messages: [{ role: "user", content: `Summarize this text in 2-3 sentences:\n\n${selected}` }]
            });
            addToast(answer.slice(0, 180));
          } catch (error) {
            addToast(error instanceof Error ? error.message : "AI request failed");
          }
        })();
        return;
      }

      if (payload.action === "eli5") {
        setAiOpen(true);
        setQueuedPrompt({
          id: crypto.randomUUID(),
          text: `Explain this simply (ELI5):\n\n${selected}`,
          feature: "context_menu"
        });
        return;
      }

      if (payload.action.startsWith("translate:")) {
        const language = payload.action.split(":")[1] ?? "English";
        setAiOpen(true);
        setQueuedPrompt({
          id: crypto.randomUUID(),
          text: `Translate this text to ${language}:\n\n${selected}`,
          feature: "context_menu"
        });
        return;
      }

      if (payload.action === "rewrite") {
        setAiOpen(true);
        setQueuedPrompt({
          id: crypto.randomUUID(),
          text: `Rewrite this text to be clearer and more concise:\n\n${selected}`,
          feature: "context_menu"
        });
      }
    });

    const stopNewTabListener = window.lumen.browser.onNewTabRequested(({ url }) => {
      if (!url) {
        return;
      }
      handleNewTab(undefined, url, "New tab");
    });

    return () => {
      stopContextListener();
      stopNewTabListener();
    };
  }, [requestAIText, addToast]);

  useEffect(() => {
    const metricsInterval = window.setInterval(() => {
      void window.lumen.system.metrics().then((metrics) => {
        setMemoryPressureRatio(metrics.system.memoryPressureRatio);
      });
    }, 10_000);

    return () => window.clearInterval(metricsInterval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!suspensionEnabled) {
        return;
      }

      const now = Date.now();
      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.id === activeTabId || tab.pinned || tab.suspended) {
            return tab;
          }

          if (now - tab.lastActiveAt > SUSPEND_AFTER_MS || memoryPressureRatio > 0.7) {
            return { ...tab, suspended: true };
          }

          return tab;
        })
      );
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [activeTabId, suspensionEnabled, memoryPressureRatio]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey) {
        return;
      }

      const lower = event.key.toLowerCase();

      if (lower === "t" && event.shiftKey) {
        event.preventDefault();
        setTaskManagerOpen((current) => !current);
        return;
      }

      if (lower === "t") {
        event.preventDefault();
        handleNewTab();
        return;
      }

      if (lower === "w") {
        event.preventDefault();
        handleCloseTab(activeTabId);
        return;
      }

      if (lower === "l") {
        event.preventDefault();
        const input = document.getElementById("lumen-url-input") as HTMLInputElement | null;
        input?.focus();
        input?.select();
        return;
      }

      if (lower === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
        return;
      }

      if (lower === "b") {
        event.preventDefault();
        setSidebarPinned((current) => !current);
        return;
      }

      if (lower === "/") {
        event.preventDefault();
        setTheme((current) => (current === "light" ? "dark" : "light"));
        return;
      }

      if (lower === "s" && event.shiftKey) {
        event.preventDefault();
        setSuspensionEnabled((current) => !current);
        return;
      }

      if (lower === "a" && event.shiftKey) {
        event.preventDefault();
        setAiOpen((current) => !current);
        return;
      }

      if (lower === "g" && event.shiftKey) {
        event.preventDefault();
        void handleAutoGroupTabs();
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        const nextId = rotateTabs(tabs, activeTabId, event.shiftKey ? -1 : 1);
        setActiveTabId(nextId);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTabId, tabs]);

  const updateTab = (id: string, updater: (tab: BrowserTab) => BrowserTab) => {
    setTabs((prev) => prev.map((tab) => (tab.id === id ? updater(tab) : tab)));
  };

  const handleSelectTab = (id: string) => {
    setActiveTabId(id);
    updateTab(id, (tab) => ({ ...tab, suspended: false, lastActiveAt: Date.now() }));
  };

  function handleNewTab(spaceId?: string, url?: string, title?: string) {
    const fallbackSpace = spaces[0]?.id ?? createSpace("General", SPACE_COLORS[0]).id;
    const tab = createTab(spaceId ?? fallbackSpace, url, title ?? "New Tab");
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }

  function handleCloseTab(id: string) {
    setTabs((prev) => {
      const next = prev.filter((tab) => tab.id !== id);
      if (next.length === 0) {
        const fallbackSpace = spaces[0]?.id ?? createSpace("General", SPACE_COLORS[0]).id;
        const fallback = createTab(fallbackSpace);
        setActiveTabId(fallback.id);
        return [fallback];
      }

      if (id === activeTabId) {
        setActiveTabId(next[Math.max(0, next.length - 1)]?.id ?? activeTabId);
      }

      return next;
    });
  }

  const handleReorderTab = (sourceId: string, targetId: string) => {
    setTabs((prev) => {
      const sourceIndex = prev.findIndex((tab) => tab.id === sourceId);
      const targetIndex = prev.findIndex((tab) => tab.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1) {
        return prev;
      }

      const copy = [...prev];
      const [moved] = copy.splice(sourceIndex, 1);
      if (!moved) {
        return prev;
      }
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
  };

  const handleNavigate = async () => {
    const raw = urlValue.trim();
    const aiQuery = parseAddressAI(raw);

    if (aiQuery) {
      const { query, providerOverride, modelOverride, label } = aiQuery;
      const fallbackSpace = activeTab?.spaceId ?? spaces[0]?.id ?? createSpace("General", SPACE_COLORS[0]).id;
      const aiTab = createAITab(fallbackSpace, query, label);

      setTabs((prev) => [...prev, aiTab]);
      setActiveTabId(aiTab.id);
      setUrlFocused(false);

      try {
        const response = await window.lumen.ai.startChat({
          conversationId: `url-bar-${aiTab.id}`,
          feature: "url_bar",
          maxTokens: 900,
          providerOverride,
          modelOverride,
          messages: [
            {
              role: "user",
              content: `Current page: ${activeTab?.title ?? "Unknown"} (${activeTab?.url ?? "N/A"})\n\n${query}`
            }
          ]
        });

        urlBarAIRequestMap.current.set(response.requestId, aiTab.id);
      } catch (error) {
        updateTab(aiTab.id, (tab) => ({
          ...tab,
          aiLoading: false,
          aiError: error instanceof Error ? error.message : "AI request failed",
          aiResponse: error instanceof Error ? error.message : "AI request failed"
        }));
      }

      return;
    }

    const nextUrl = normalizeAddress(raw);

    if (!activeTab) {
      return;
    }

    updateTab(activeTab.id, (tab) => {
      if (tab.kind === "ai") {
        return {
          ...tab,
          kind: "web",
          url: nextUrl,
          title: "Loading...",
          suspended: false,
          lastActiveAt: Date.now(),
          aiQuery: undefined,
          aiProviderLabel: undefined,
          aiResponse: undefined,
          aiLoading: undefined,
          aiError: undefined
        };
      }

      return {
        ...tab,
        url: nextUrl,
        title: "Loading...",
        suspended: false,
        lastActiveAt: Date.now()
      };
    });
  };

  async function handleAutoGroupTabs() {
    const regularTabs = tabs.filter((tab) => !tab.pinned);
    if (regularTabs.length < 2) {
      addToast("Need at least 2 unpinned tabs to group.");
      return;
    }

    const payload = regularTabs.map((tab) => ({ id: tab.id, title: tab.title, url: tab.url }));

    try {
      const response = await requestAIText({
        conversationId: `group-${Date.now()}`,
        feature: "tab_intelligence",
        maxTokens: 500,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content:
              "Group these tabs by topic. Return strict JSON only: {\"groups\":[{\"name\":\"...\",\"tabIds\":[\"id1\",\"id2\"]}]}\n\n" +
              JSON.stringify(payload)
          }
        ]
      });

      const jsonStart = response.indexOf("{");
      const jsonEnd = response.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("AI did not return valid grouping JSON.");
      }

      const parsed = JSON.parse(response.slice(jsonStart, jsonEnd + 1)) as {
        groups?: Array<{ name?: string; tabIds?: string[] }>;
      };

      const groups = parsed.groups?.filter((group) => group.tabIds && group.tabIds.length > 0) ?? [];
      if (!groups.length) {
        throw new Error("No groups returned.");
      }

      const nextSpaces = groups.map((group, idx) =>
        createSpace(group.name?.slice(0, 24) || `Group ${idx + 1}`, SPACE_COLORS[idx % SPACE_COLORS.length])
      );

      const map = new Map<string, string>();
      groups.forEach((group, idx) => {
        const nextSpace = nextSpaces[idx];
        if (!nextSpace) {
          return;
        }
        group.tabIds?.forEach((tabId) => {
          map.set(tabId, nextSpace.id);
        });
      });

      setSpaces((prev) => [...prev, ...nextSpaces]);
      setTabs((prev) =>
        prev.map((tab) => {
          const nextSpaceId = map.get(tab.id);
          return nextSpaceId ? { ...tab, spaceId: nextSpaceId } : tab;
        })
      );

      addToast("Applied AI tab grouping.");
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Tab grouping failed.");
    }
  }

  const handleSuggestStaleTabs = async () => {
    const now = Date.now();
    const stale = tabs.filter((tab) => !tab.pinned && now - tab.lastActiveAt > STALE_AFTER_MS);

    if (!stale.length) {
      addToast("No stale tabs found.");
      return;
    }

    try {
      const response = await requestAIText({
        conversationId: `stale-${Date.now()}`,
        feature: "tab_intelligence",
        maxTokens: 220,
        temperature: 0,
        messages: [
          {
            role: "user",
            content:
              "Pick up to 5 tabs that can likely be closed. Return strict JSON only: {\"tabIds\":[...],\"reason\":\"...\"}.\n\n" +
              JSON.stringify(stale.map((tab) => ({ id: tab.id, title: tab.title, url: tab.url })))
          }
        ]
      });

      const jsonStart = response.indexOf("{");
      const jsonEnd = response.lastIndexOf("}");
      const parsed = JSON.parse(response.slice(jsonStart, jsonEnd + 1)) as {
        tabIds?: string[];
        reason?: string;
      };

      if (!parsed.tabIds?.length) {
        addToast("AI found no close suggestions.");
        return;
      }

      const suggestTitles = tabs
        .filter((tab) => parsed.tabIds?.includes(tab.id))
        .map((tab) => tab.title)
        .slice(0, 3)
        .join(", ");

      addToast(`Suggested stale tabs: ${suggestTitles || "(check tab list)"}`);
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Failed to suggest stale tabs.");
    }
  };

  const handleAISearchTabs = useCallback(async (query: string) => {
    const cleaned = query.trim();
    if (!cleaned) {
      return [];
    }

    try {
      const response = await requestAIText({
        conversationId: `tab-search-${Date.now()}`,
        feature: "tab_search",
        maxTokens: 180,
        temperature: 0,
        messages: [
          {
            role: "user",
            content:
              "Find the best matching tab IDs for this query. Return strict JSON only: {\"tabIds\":[...]}.\nQuery: " +
              cleaned +
              "\nTabs:\n" +
              JSON.stringify(tabs.map((tab) => ({ id: tab.id, title: tab.title, url: tab.url })))
          }
        ]
      });

      const jsonStart = response.indexOf("{");
      const jsonEnd = response.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) {
        return [];
      }
      const parsed = JSON.parse(response.slice(jsonStart, jsonEnd + 1)) as { tabIds?: string[] };
      const ids = new Set(parsed.tabIds ?? []);
      return tabs.filter((tab) => ids.has(tab.id));
    } catch {
      return tabs.filter((tab) =>
        `${tab.title} ${tab.url}`.toLowerCase().includes(cleaned.toLowerCase())
      );
    }
  }, [requestAIText, tabs]);

  const handleRunCommand = (command: string) => {
    switch (command) {
      case "Toggle dark mode":
        setTheme((current) => (current === "light" ? "dark" : "light"));
        break;
      case "Suspend all tabs":
        setTabs((prev) =>
          prev.map((tab) => (tab.id === activeTabId ? tab : { ...tab, suspended: true }))
        );
        break;
      case "Open task manager":
        setTaskManagerOpen(true);
        break;
      case "Toggle AI panel":
        setAiOpen((current) => !current);
        break;
      case "Suggest stale tabs":
        void handleSuggestStaleTabs();
        break;
      case "Group tabs by topic":
        void handleAutoGroupTabs();
        break;
      default:
        break;
    }
  };

  const handleSidebarHoverChange = (hovered: boolean) => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    if (hovered) {
      hoverTimerRef.current = window.setTimeout(() => {
        setSidebarPeek(true);
      }, 200);
      return;
    }

    setSidebarPeek(false);
  };

  const sidebarExpanded = sidebarPinned || sidebarPeek;
  const activeSpaceId = activeTab?.spaceId ?? spaces[0]?.id;
  const currentIntel = activeTab ? pageIntel[activeTab.id] : undefined;

  return (
    <div className="app-root">
      <TitleBar
        sidebarPinned={sidebarPinned}
        activeTabId={activeTab?.id}
        onToggleSidebarPin={() => setSidebarPinned((current) => !current)}
        onOpenCommandPalette={() => setPaletteOpen(true)}
        urlValue={urlValue}
        activeUrl={activeTab?.url ?? ""}
        urlFocused={urlFocused}
        onUrlFocusChange={setUrlFocused}
        onUrlChange={setUrlValue}
        onUrlSubmit={handleNavigate}
        onRunPageIntelligence={() => void runPageIntelligence()}
      />

      <div className="shell">
        <Sidebar
          tabs={tabs}
          spaces={spaces}
          activeTabId={activeTabId}
          expanded={sidebarExpanded}
          sidebarWidth={sidebarWidth}
          pinned={sidebarPinned}
          onHoverChange={handleSidebarHoverChange}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          onNewTab={handleNewTab}
          onTogglePinnedTab={(id) => updateTab(id, (tab) => ({ ...tab, pinned: !tab.pinned }))}
          onReorderTab={handleReorderTab}
          onMoveTabToSpace={(tabId, spaceId) => updateTab(tabId, (tab) => ({ ...tab, spaceId }))}
          onToggleSpaceCollapsed={(spaceId) =>
            setSpaces((prev) =>
              prev.map((space) =>
                space.id === spaceId ? { ...space, collapsed: !space.collapsed } : space
              )
            )
          }
          onAddSpace={() => {
            const name = `Space ${spaces.length + 1}`;
            const color = SPACE_COLORS[spaces.length % SPACE_COLORS.length];
            setSpaces((prev) => [...prev, createSpace(name, color)]);
          }}
          onToggleSidebarPin={() => setSidebarPinned((current) => !current)}
          onResizeWidth={(width) => setSidebarWidth(Math.min(420, Math.max(180, width)))}
          onOpenAI={() => setAiOpen(true)}
          onOpenSettings={() => setAiOpen(true)}
        />

        <main className="content-area">
          {currentIntel && (
            <section className="page-intel-banner">
              <div className="page-intel-top">
                <span>Summary</span>
                <span>{currentIntel.readingTimeMin} min read</span>
              </div>
              <p>{currentIntel.summary}</p>
              <div className="topic-tags">
                {currentIntel.topics.map((topic) => (
                  <span key={topic} className="topic-tag">{topic}</span>
                ))}
              </div>
            </section>
          )}

          <WebViewport
            tab={activeTab}
            webviewRef={webviewRef}
            onRestoreTab={() => activeTab && updateTab(activeTab.id, (tab) => ({ ...tab, suspended: false }))}
            onTitleChange={(title) => activeTab && updateTab(activeTab.id, (tab) => ({ ...tab, title }))}
            onUrlChange={(url) => activeTab && updateTab(activeTab.id, (tab) => ({ ...tab, url }))}
            onFaviconChange={(favicon) => activeTab && updateTab(activeTab.id, (tab) => ({ ...tab, favicon }))}
          />

          <footer className="status-bar">
            <span>{suspensionEnabled ? "Auto-suspend on" : "Auto-suspend off"}</span>
            <span>{memoryPressureRatio >= 0.7 ? "High memory pressure" : "Memory stable"}</span>
            <span>Active space: {spaces.find((space) => space.id === activeSpaceId)?.name ?? "General"}</span>
            <span>{theme === "light" ? "Light" : "Dark"} theme</span>
          </footer>
        </main>

        <AIPanel
          open={aiOpen}
          activeTab={activeTab}
          queuedPrompt={queuedPrompt}
          onQueuedPromptHandled={() => setQueuedPrompt(null)}
          onClose={() => setAiOpen(false)}
        />
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        tabs={tabs}
        onSelectTab={handleSelectTab}
        onRunCommand={handleRunCommand}
        onAISearchTabs={handleAISearchTabs}
      />

      <TaskManagerModal
        open={taskManagerOpen}
        tabs={tabs}
        onClose={() => setTaskManagerOpen(false)}
      />

      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast-item">
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
}
