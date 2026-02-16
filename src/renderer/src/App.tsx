import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AIPanel } from "./components/AIPanel";
import { CommandPalette } from "./components/CommandPalette";
import { Sidebar } from "./components/Sidebar";
import { TaskManagerModal } from "./components/TaskManagerModal";
import { TitleBar } from "./components/TitleBar";
import { WebViewport } from "./components/WebViewport";
import { AIChatFeature, AIProvider, BrowserProfile, BrowserTab, TabSpace } from "./types";

const SUSPEND_AFTER_MS = 5 * 60 * 1000;
const STALE_AFTER_MS = 2 * 60 * 60 * 1000;
const LEGACY_STORAGE_KEY = "lumen.session.v2";
const GLOBAL_STORAGE_KEY = "lumen.global.v1";
const PROFILE_STORAGE_PREFIX = "lumen.profile.session.v1.";
const SUMMARY_CACHE_KEY = "lumen.summary.cache.v1";

const SPACE_COLORS = ["#0a84ff", "#30d158", "#ff9f0a", "#ff375f", "#64d2ff", "#bf5af2"];

interface ProfileSession {
  tabs: BrowserTab[];
  spaces: TabSpace[];
  activeTabId: string;
  urlHistory: string[];
}

interface GlobalSettings {
  sidebarPinned: boolean;
  suspensionEnabled: boolean;
  sidebarWidth: number;
  theme: "light" | "dark";
  profiles: BrowserProfile[];
  activeProfileId: string;
}

interface AppBootstrap {
  global: GlobalSettings;
  session: ProfileSession;
  activeProfileId: string;
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

function createWelcomeTab(spaceId: string): BrowserTab {
  return {
    id: crypto.randomUUID(),
    title: "Welcome to Lumen",
    url: "lumen://welcome",
    kind: "welcome",
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
    aiLoading: true,
    aiMessages: [
      { role: "user", content: cleanQuery },
      { role: "assistant", content: "" }
    ]
  };
}

function createProfile(name: string): BrowserProfile {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now()
  };
}

function defaultSession(): ProfileSession {
  const baseSpace = createSpace("General", SPACE_COLORS[0] ?? "#0a84ff");
  const welcomeTab = createWelcomeTab(baseSpace.id);

  return {
    tabs: [welcomeTab],
    spaces: [baseSpace],
    activeTabId: welcomeTab.id,
    urlHistory: []
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

  if (lowerPrefix === "@" && rest.length) {
    const [inlineCommand = "", ...inlineRest] = rest;
    const inlineLower = inlineCommand.toLowerCase();
    const inlineQuery = inlineRest.join(" ").trim();

    if (inlineLower === "chat") {
      return inlineQuery ? { query: inlineQuery, label: "AI" } : null;
    }

    if (inlineLower === "gpt" || inlineLower === "openai") {
      return inlineQuery ? { query: inlineQuery, providerOverride: "openai", label: "AI (openai)" } : null;
    }

    if (inlineLower === "claude" || inlineLower === "anthropic") {
      return inlineQuery ? { query: inlineQuery, providerOverride: "anthropic", label: "AI (claude)" } : null;
    }

    if (inlineLower === "grok" || inlineLower === "xai") {
      return inlineQuery ? { query: inlineQuery, providerOverride: "xai", label: "AI (grok)" } : null;
    }

    if (inlineLower === "qwen") {
      return inlineQuery
        ? { query: inlineQuery, providerOverride: "openrouter", modelOverride: "qwen/qwen3-coder:free", label: "AI (qwen)" }
        : null;
    }

    if (inlineLower === "kimi") {
      return inlineQuery
        ? { query: inlineQuery, providerOverride: "openrouter", modelOverride: "moonshotai/kimi-k2:free", label: "AI (kimi)" }
        : null;
    }

    if (inlineLower === "openclaw" || inlineLower === "claw") {
      return inlineQuery ? { query: inlineQuery, providerOverride: "openclaw", label: "AI (openclaw)" } : null;
    }
  }

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

function normalizeSession(input: Partial<ProfileSession> | null | undefined): ProfileSession {
  const fallback = defaultSession();
  if (!input) {
    return fallback;
  }

  const spaces = input.spaces?.length ? input.spaces : fallback.spaces;
  const defaultSpaceId = spaces[0]?.id ?? fallback.spaces[0]!.id;
  const tabs = input.tabs?.length
    ? input.tabs.map((tab) => ({
      ...tab,
      kind: tab.kind ?? "web",
      spaceId: tab.spaceId || defaultSpaceId
    }))
    : fallback.tabs;
  const activeTabId = tabs.some((tab) => tab.id === input.activeTabId)
    ? input.activeTabId ?? tabs[0]!.id
    : tabs[0]!.id;

  return {
    tabs,
    spaces,
    activeTabId,
    urlHistory: input.urlHistory ?? []
  };
}

function defaultGlobal(profile: BrowserProfile): GlobalSettings {
  return {
    sidebarPinned: true,
    suspensionEnabled: true,
    sidebarWidth: 240,
    theme: "light",
    profiles: [profile],
    activeProfileId: profile.id
  };
}

function profileSessionKey(profileId: string): string {
  return `${PROFILE_STORAGE_PREFIX}${profileId}`;
}

function readProfileSession(profileId: string): ProfileSession {
  try {
    const raw = window.localStorage.getItem(profileSessionKey(profileId));
    return normalizeSession(raw ? (JSON.parse(raw) as Partial<ProfileSession>) : null);
  } catch {
    return defaultSession();
  }
}

function loadBootstrap(): AppBootstrap {
  const defaultProf = createProfile("Personal");

  try {
    const globalRaw = window.localStorage.getItem(GLOBAL_STORAGE_KEY);
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);

    if (!globalRaw && legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as Partial<{
        tabs: BrowserTab[];
        spaces: TabSpace[];
        activeTabId: string;
        theme: "light" | "dark";
        sidebarPinned: boolean;
        suspensionEnabled: boolean;
        sidebarWidth: number;
      }>;

      const global: GlobalSettings = {
        ...defaultGlobal(defaultProf),
        theme: legacy.theme === "dark" ? "dark" : "light",
        sidebarPinned: legacy.sidebarPinned ?? true,
        suspensionEnabled: legacy.suspensionEnabled ?? true,
        sidebarWidth: typeof legacy.sidebarWidth === "number" ? Math.min(420, Math.max(180, legacy.sidebarWidth)) : 240
      };
      const session = normalizeSession({
        tabs: legacy.tabs,
        spaces: legacy.spaces,
        activeTabId: legacy.activeTabId
      });

      window.localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(global));
      window.localStorage.setItem(profileSessionKey(global.activeProfileId), JSON.stringify(session));
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);

      return {
        global,
        session,
        activeProfileId: global.activeProfileId
      };
    }

    if (!globalRaw) {
      const global = defaultGlobal(defaultProf);
      const session = defaultSession();
      window.localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(global));
      window.localStorage.setItem(profileSessionKey(global.activeProfileId), JSON.stringify(session));

      return {
        global,
        session,
        activeProfileId: global.activeProfileId
      };
    }

    const parsed = JSON.parse(globalRaw) as Partial<GlobalSettings>;
    const profiles = parsed.profiles?.length ? parsed.profiles : [defaultProf];
    const activeProfileId = profiles.some((profile) => profile.id === parsed.activeProfileId)
      ? parsed.activeProfileId ?? profiles[0]!.id
      : profiles[0]!.id;

    const global: GlobalSettings = {
      sidebarPinned: parsed.sidebarPinned ?? true,
      suspensionEnabled: parsed.suspensionEnabled ?? true,
      sidebarWidth: typeof parsed.sidebarWidth === "number" ? Math.min(420, Math.max(180, parsed.sidebarWidth)) : 240,
      theme: parsed.theme === "dark" ? "dark" : "light",
      profiles,
      activeProfileId
    };
    const session = readProfileSession(activeProfileId);

    return {
      global,
      session,
      activeProfileId
    };
  } catch {
    const global = defaultGlobal(defaultProf);
    const session = defaultSession();
    return {
      global,
      session,
      activeProfileId: global.activeProfileId
    };
  }
}

export function App() {
  const bootstrap = loadBootstrap();
  const [tabs, setTabs] = useState<BrowserTab[]>(bootstrap.session.tabs);
  const [spaces, setSpaces] = useState<TabSpace[]>(bootstrap.session.spaces);
  const [activeTabId, setActiveTabId] = useState<string>(bootstrap.session.activeTabId);
  const [urlHistory, setUrlHistory] = useState<string[]>(bootstrap.session.urlHistory);
  const [urlValue, setUrlValue] = useState("");
  const [urlFocused, setUrlFocused] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(bootstrap.global.theme);
  const [sidebarPinned, setSidebarPinned] = useState(bootstrap.global.sidebarPinned);
  const [sidebarPeek, setSidebarPeek] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPanelIntent, setAiPanelIntent] = useState<"chat" | "settings">("chat");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [taskManagerOpen, setTaskManagerOpen] = useState(false);
  const [suspensionEnabled, setSuspensionEnabled] = useState(bootstrap.global.suspensionEnabled);
  const [sidebarWidth, setSidebarWidth] = useState(bootstrap.global.sidebarWidth);
  const [profiles, setProfiles] = useState<BrowserProfile[]>(bootstrap.global.profiles);
  const [activeProfileId, setActiveProfileId] = useState<string>(bootstrap.activeProfileId);
  const [providerSuggestions, setProviderSuggestions] = useState<string[]>([]);
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
  const aiTabRequestMap = useRef<Map<string, { tabId: string; messageIndex: number }>>(new Map());
  const pendingAIMap = useRef<Map<string, PendingAI>>(new Map());

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId), [tabs, activeTabId]);

  const localAddressSuggestions = useMemo(() => {
    const query = urlValue.trim().toLowerCase();
    if (!query || query.startsWith("@") || query.startsWith(">") || query.startsWith("ask:")) {
      return [];
    }

    const fromHistory = urlHistory
      .filter((entry) => entry.toLowerCase().includes(query))
      .slice(0, 5);
    const fromTabs = tabs
      .map((tab) => tab.url)
      .filter((url) => url.toLowerCase().includes(query))
      .slice(0, 5);

    return [...new Set([...fromHistory, ...fromTabs])].slice(0, 8);
  }, [urlValue, urlHistory, tabs]);

  const addressSuggestions = useMemo(() => {
    return [...new Set([...localAddressSuggestions, ...providerSuggestions])].slice(0, 8);
  }, [localAddressSuggestions, providerSuggestions]);

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
    if (activeTab.kind !== "web") {
      addToast("Page intelligence is available only on webpage tabs.");
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
      if (activeTab.kind === "ai" || activeTab.kind === "welcome") {
        setUrlValue("");
      } else {
        setUrlValue(activeTab.url);
      }
    }
  }, [activeTab?.id, activeTab?.url, activeTab?.kind]);

  useEffect(() => {
    const query = urlValue.trim();
    if (!urlFocused || query.length < 2 || query.startsWith("@") || query.startsWith(">") || query.toLowerCase().startsWith("ask:")) {
      setProviderSuggestions([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void window.lumen.browser.getAddressSuggestions(query).then((items) => {
        setProviderSuggestions(items);
      }).catch(() => {
        setProviderSuggestions([]);
      });
    }, 160);

    return () => window.clearTimeout(timer);
  }, [urlValue, urlFocused]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const global: GlobalSettings = {
      theme,
      sidebarPinned,
      suspensionEnabled,
      sidebarWidth,
      profiles,
      activeProfileId
    };
    window.localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(global));
  }, [theme, sidebarPinned, suspensionEnabled, sidebarWidth, profiles, activeProfileId]);

  useEffect(() => {
    const session: ProfileSession = {
      tabs,
      spaces,
      activeTabId,
      urlHistory
    };
    window.localStorage.setItem(profileSessionKey(activeProfileId), JSON.stringify(session));
  }, [tabs, spaces, activeTabId, urlHistory, activeProfileId]);

  useEffect(() => {
    return window.lumen.ai.onStream((payload) => {
      const aiRequest = aiTabRequestMap.current.get(payload.requestId);
      if (aiRequest) {
        if (payload.token) {
          setTabs((prev) =>
            prev.map((tab) =>
              tab.id === aiRequest.tabId
                ? {
                  ...tab,
                  aiResponse: `${tab.aiResponse ?? ""}${payload.token}`,
                  aiMessages: (tab.aiMessages ?? []).map((message, index) =>
                    index === aiRequest.messageIndex
                      ? { ...message, content: `${message.content}${payload.token}` }
                      : message
                  ),
                  aiLoading: true
                }
                : tab
            )
          );
        }

        if (payload.done) {
          setTabs((prev) =>
            prev.map((tab) =>
              tab.id === aiRequest.tabId
                ? {
                  ...tab,
                  aiLoading: false,
                  aiError: payload.error,
                  aiResponse: payload.error ? (tab.aiResponse || payload.error) : tab.aiResponse,
                  aiMessages: payload.error
                    ? (tab.aiMessages ?? []).map((message, index) =>
                      index === aiRequest.messageIndex && !message.content
                        ? { ...message, content: payload.error ?? "AI request failed" }
                        : message
                    )
                    : tab.aiMessages
                }
                : tab
            )
          );

          if (payload.error) {
            addToast(payload.error);
          }

          aiTabRequestMap.current.delete(payload.requestId);
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
        setAiPanelIntent("chat");
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
        setAiPanelIntent("chat");
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
        setAiPanelIntent("chat");
        setAiOpen(true);
        setQueuedPrompt({
          id: crypto.randomUUID(),
          text: `Translate this text to ${language}:\n\n${selected}`,
          feature: "context_menu"
        });
        return;
      }

      if (payload.action === "rewrite") {
        setAiPanelIntent("chat");
        setAiOpen(true);
        setQueuedPrompt({
          id: crypto.randomUUID(),
          text: `Rewrite this text to be clearer and more concise:\n\n${selected}`,
          feature: "context_menu"
        });
        return;
      }

      if (payload.action === "search_selection") {
        void runAddressAIQuery({
          text: `Search this selected term with AI and provide a concise answer with key points:\n\n${selected}`,
          label: "AI (selection)"
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
  }, [requestAIText, addToast, runAddressAIQuery]);

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

  const handleSwitchProfile = (profileId: string) => {
    if (profileId === activeProfileId) {
      return;
    }

    const currentSession: ProfileSession = { tabs, spaces, activeTabId, urlHistory };
    window.localStorage.setItem(profileSessionKey(activeProfileId), JSON.stringify(currentSession));

    const nextSession = readProfileSession(profileId);
    setActiveProfileId(profileId);
    setTabs(nextSession.tabs);
    setSpaces(nextSession.spaces);
    setActiveTabId(nextSession.activeTabId);
    setUrlHistory(nextSession.urlHistory);
    setUrlFocused(false);
    setProviderSuggestions([]);
  };

  const handleAddProfile = () => {
    const nextIndex = profiles.length + 1;
    const profile = createProfile(`Profile ${nextIndex}`);
    setProfiles((prev) => [...prev, profile]);
    const session = defaultSession();
    window.localStorage.setItem(profileSessionKey(profile.id), JSON.stringify(session));
    handleSwitchProfile(profile.id);
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

  function navigateToAddress(rawInput: string): void {
    const nextUrl = normalizeAddress(rawInput);

    if (!activeTab) {
      return;
    }

    updateTab(activeTab.id, (tab) => {
      if (tab.kind === "ai" || tab.kind === "welcome") {
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

    setUrlHistory((prev) => [nextUrl, ...prev.filter((entry) => entry !== nextUrl)].slice(0, 120));
    setUrlFocused(false);
    setUrlValue("");
    setProviderSuggestions([]);
  }

  async function runAddressAIQuery(query: {
    text: string;
    providerOverride?: AIProvider;
    modelOverride?: string;
    label: string;
  }): Promise<void> {
    const fallbackSpace = activeTab?.spaceId ?? spaces[0]?.id ?? createSpace("General", SPACE_COLORS[0]).id;
    const aiTab = createAITab(fallbackSpace, query.text, query.label);

    setTabs((prev) => [...prev, aiTab]);
    setActiveTabId(aiTab.id);
    setUrlFocused(false);
    setUrlValue("");
    setProviderSuggestions([]);

    try {
      const response = await window.lumen.ai.startChat({
        conversationId: `url-bar-${aiTab.id}`,
        feature: "url_bar",
        maxTokens: 900,
        providerOverride: query.providerOverride,
        modelOverride: query.modelOverride,
        messages: [
          {
            role: "user",
            content: `Current page: ${activeTab?.title ?? "Unknown"} (${activeTab?.url ?? "N/A"})\n\n${query.text}`
          }
        ]
      });

      aiTabRequestMap.current.set(response.requestId, {
        tabId: aiTab.id,
        messageIndex: 1
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI request failed";
      updateTab(aiTab.id, (tab) => ({
        ...tab,
        aiLoading: false,
        aiError: message,
        aiResponse: message,
        aiMessages: (tab.aiMessages ?? []).map((item, index) =>
          index === 1 ? { ...item, content: message } : item
        )
      }));
    }
  }

  const handleAcceptAddressSuggestion = (value: string) => {
    navigateToAddress(value);
  };

  async function handleSendAITabMessage(tabId: string, text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const target = tabs.find((tab) => tab.id === tabId);
    if (!target || target.kind !== "ai") {
      return;
    }

    const nextMessages = [
      ...(target.aiMessages ?? []),
      { role: "user" as const, content: trimmed },
      { role: "assistant" as const, content: "" }
    ];
    const responseIndex = nextMessages.length - 1;

    updateTab(tabId, (tab) => ({
      ...tab,
      aiMessages: nextMessages,
      aiLoading: true,
      aiError: undefined,
      aiResponse: ""
    }));

    try {
      const response = await window.lumen.ai.startChat({
        conversationId: `url-bar-${tabId}`,
        feature: "chat",
        maxTokens: 900,
        messages: nextMessages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      });

      aiTabRequestMap.current.set(response.requestId, {
        tabId,
        messageIndex: responseIndex
      });
    } catch (error) {
      updateTab(tabId, (tab) => ({
        ...tab,
        aiLoading: false,
        aiError: error instanceof Error ? error.message : "AI request failed",
        aiMessages: (tab.aiMessages ?? []).map((message, index) =>
          index === responseIndex
            ? { ...message, content: error instanceof Error ? error.message : "AI request failed" }
            : message
        )
      }));
    }
  }

  const handleNavigate = async () => {
    const raw = urlValue.trim();
    const aiQuery = parseAddressAI(raw);

    if (aiQuery) {
      await runAddressAIQuery({
        text: aiQuery.query,
        providerOverride: aiQuery.providerOverride,
        modelOverride: aiQuery.modelOverride,
        label: aiQuery.label
      });
      return;
    }

    navigateToAddress(raw);
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
        setAiPanelIntent("chat");
        setAiOpen((current) => !current);
        break;
      case "Suggest stale tabs":
        void handleSuggestStaleTabs();
        break;
      case "Group tabs by topic":
        void handleAutoGroupTabs();
        break;
      case "Summarize this page (AI)":
        void runPageIntelligence();
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
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSwitchProfile={handleSwitchProfile}
        onAddProfile={handleAddProfile}
        onToggleSidebarPin={() => setSidebarPinned((current) => !current)}
        onOpenCommandPalette={() => setPaletteOpen(true)}
        urlValue={urlValue}
        activeUrl={activeTab?.kind === "web" ? activeTab.url : ""}
        addressSuggestions={addressSuggestions}
        urlFocused={urlFocused}
        onUrlFocusChange={setUrlFocused}
        onUrlChange={setUrlValue}
        onUrlAcceptSuggestion={handleAcceptAddressSuggestion}
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
          onOpenAI={() => {
            setAiPanelIntent("chat");
            setAiOpen(true);
          }}
          onOpenSettings={() => {
            setAiPanelIntent("settings");
            setAiOpen(true);
          }}
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
            profileId={activeProfileId}
            webviewRef={webviewRef}
            onRestoreTab={() => activeTab && updateTab(activeTab.id, (tab) => ({ ...tab, suspended: false }))}
            onTitleChange={(title) => activeTab && updateTab(activeTab.id, (tab) => ({ ...tab, title }))}
            onUrlChange={(url) => activeTab && updateTab(activeTab.id, (tab) => ({ ...tab, url }))}
            onFaviconChange={(favicon) => activeTab && updateTab(activeTab.id, (tab) => ({ ...tab, favicon }))}
            onSendAIMessage={handleSendAITabMessage}
            onStartBrowsing={(seedUrl) => {
              if (!activeTab) {
                return;
              }
              setUrlValue(seedUrl);
              navigateToAddress(seedUrl);
            }}
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
          intent={aiPanelIntent}
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
