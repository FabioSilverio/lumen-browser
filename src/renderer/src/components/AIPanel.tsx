import { useEffect, useMemo, useRef, useState } from "react";
import { AIPanelSettings, AIProvider, AIUsage, BrowserTab, ChatMessage } from "../types";

interface PromptSeed {
  id: string;
  text: string;
  feature?: "chat" | "url_bar" | "summary" | "tab_intelligence" | "context_menu" | "tab_search";
}

interface AIPanelProps {
  open: boolean;
  activeTab: BrowserTab | undefined;
  queuedPrompt: PromptSeed | null;
  onQueuedPromptHandled: () => void;
  onClose: () => void;
}

const PROVIDER_MODELS: Record<AIProvider, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o3-mini"],
  anthropic: ["claude-sonnet-4-20250514", "claude-opus-4-0-20250514", "claude-haiku-4-5-20251001"],
  xai: ["grok-3", "grok-3-mini"]
};

interface ChatUIMessage extends ChatMessage {
  id: string;
  pending?: boolean;
}

const EMPTY_USAGE: AIUsage = {
  periodKey: "",
  promptTokens: 0,
  completionTokens: 0,
  estimatedCostUsd: 0,
  daily: {},
  featureCosts: {}
};

export function AIPanel({
  open,
  activeTab,
  queuedPrompt,
  onQueuedPromptHandled,
  onClose
}: AIPanelProps) {
  const [settings, setSettings] = useState<AIPanelSettings | null>(null);
  const [usage, setUsage] = useState<AIUsage>(EMPTY_USAGE);
  const [models, setModels] = useState<string[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [budget, setBudget] = useState<{ limitUsd: number; warningUsd: number; reached: boolean }>({
    limitUsd: 0,
    warningUsd: 0,
    reached: false
  });
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [connectionMessage, setConnectionMessage] = useState("");
  const [messages, setMessages] = useState<ChatUIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const requestMap = useRef<Map<string, string>>(new Map());

  const loadConfig = async () => {
    const config = await window.lumen.ai.getConfig();
    setSettings(config.settings);
    setUsage(config.usage);
    setHasApiKey(config.hasApiKey);
    setModels(config.availableModels);
    setBudget(config.budget);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadConfig();
  }, [open]);

  useEffect(() => {
    return window.lumen.ai.onStream((payload) => {
      const assistantId = requestMap.current.get(payload.requestId);

      if (payload.queued) {
        setConnectionMessage(payload.message ?? "AI is busy. Request queued.");
      }

      if (!assistantId) {
        return;
      }

      if (payload.token) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: `${msg.content}${payload.token}`, pending: false }
              : msg
          )
        );
      }

      if (payload.done) {
        requestMap.current.delete(payload.requestId);
        setIsSending(false);

        if (payload.error) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: payload.error ?? "AI request failed", pending: false }
                : msg
            )
          );
          setConnectionMessage(payload.error);
        }

        if (payload.usage) {
          setUsage(payload.usage);
        }

        if (payload.budgetReached) {
          setConnectionMessage("Monthly budget reached. AI disabled until budget changes.");
        } else if (payload.budgetWarning) {
          setConnectionMessage("Budget warning: 80% of monthly budget used.");
        }
      }
    });
  }, []);

  const sendPrompt = async (
    userText: string,
    feature: "chat" | "url_bar" | "summary" | "tab_intelligence" | "context_menu" | "tab_search" = "chat"
  ) => {
    if (!settings || !hasApiKey || !userText.trim() || budget.reached) {
      return;
    }

    const userMessage: ChatUIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userText
    };

    const assistantMessage: ChatUIMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      pending: true
    };

    const pageContext = activeTab
      ? `Current tab: ${activeTab.title} (${activeTab.url})`
      : "No active tab";

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsSending(true);

    try {
      const result = await window.lumen.ai.startChat({
        conversationId: "panel-session",
        feature,
        maxTokens: feature === "summary" ? 450 : 800,
        temperature: 0.4,
        messages: [{ role: "user", content: `${pageContext}\n\n${userText}` }]
      });

      requestMap.current.set(result.requestId, assistantMessage.id);
    } catch (error) {
      setIsSending(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessage.id
            ? {
              ...msg,
              pending: false,
              content: error instanceof Error ? error.message : "AI request failed"
            }
            : msg
        )
      );
    }
  };

  useEffect(() => {
    if (!open || !queuedPrompt) {
      return;
    }

    void sendPrompt(queuedPrompt.text, queuedPrompt.feature ?? "context_menu").finally(() => {
      onQueuedPromptHandled();
    });
  }, [queuedPrompt, open]);

  const canSend = useMemo(() => {
    return Boolean(settings && hasApiKey && input.trim() && !isSending && !budget.reached);
  }, [settings, hasApiKey, input, isSending, budget.reached]);

  const handleSave = async () => {
    if (!settings) {
      return;
    }

    const result = await window.lumen.ai.saveConfig({
      settings,
      apiKey: apiKeyInput || undefined
    });

    setSettings(result.settings);
    setHasApiKey(result.hasApiKey);
    setModels(result.availableModels);
    setApiKeyInput("");
    setConnectionMessage("Saved.");
    await loadConfig();
  };

  const handleTestConnection = async () => {
    if (!settings) {
      return;
    }

    const result = await window.lumen.ai.testConnection(settings.provider);
    setConnectionMessage(result.message);
  };

  const budgetRatio = budget.limitUsd > 0 ? usage.estimatedCostUsd / budget.limitUsd : 0;
  const budgetLabel = `${usage.estimatedCostUsd.toFixed(4)} / ${budget.limitUsd.toFixed(2)} USD`;

  if (!open) {
    return null;
  }

  return (
    <aside className={`ai-panel ${open ? "open" : ""}`}>
      <div className="ai-header">
        <h2>AI</h2>
        <button className="icon-button" onClick={onClose}>X</button>
      </div>

      {settings && (
        <section className="ai-settings">
          <label>
            Provider
            <select
              value={settings.provider}
              onChange={(event) => {
                const provider = event.target.value as AIProvider;
                const nextModel = PROVIDER_MODELS[provider][0] ?? "";
                setSettings({ ...settings, provider, model: nextModel });
                setModels(PROVIDER_MODELS[provider]);
              }}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="xai">xAI</option>
            </select>
          </label>

          <label>
            Model
            <select
              value={settings.model}
              onChange={(event) => setSettings({ ...settings, model: event.target.value })}
            >
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </label>

          <label>
            API key
            <input
              value={apiKeyInput}
              onChange={(event) => setApiKeyInput(event.target.value)}
              placeholder={hasApiKey ? "Stored securely (enter to replace)" : "Paste API key"}
              type="password"
            />
          </label>

          <label>
            Monthly budget (USD)
            <input
              type="number"
              value={settings.monthlyBudgetUsd}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  monthlyBudgetUsd: Number(event.target.value || 0)
                })
              }
              min={1}
              max={2000}
            />
          </label>

          <label>
            System prompt
            <textarea
              value={settings.systemPrompt}
              onChange={(event) => setSettings({ ...settings, systemPrompt: event.target.value })}
            />
          </label>

          <div className="ai-settings-actions">
            <button className="secondary-button" onClick={() => void handleTestConnection()}>
              Test
            </button>
            <button className="primary-button" onClick={() => void handleSave()}>
              Save
            </button>
          </div>

          <div className="usage-meter">
            <div className="usage-meter-track">
              <div
                className={`usage-meter-fill ${budgetRatio >= 1 ? "danger" : budgetRatio >= 0.8 ? "warn" : ""}`}
                style={{ width: `${Math.min(100, Math.round(budgetRatio * 100))}%` }}
              />
            </div>
            <div className="helper-text">Budget: {budgetLabel}</div>
          </div>

          {connectionMessage && <p className="helper-text">{connectionMessage}</p>}
        </section>
      )}

      <section className="ai-usage">
        <div className="usage-title">Daily cost</div>
        <div className="usage-bars">
          {Object.entries(usage.daily)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-7)
            .map(([day, cost]) => (
              <div className="usage-row" key={day}>
                <span>{day.slice(5)}</span>
                <div className="usage-bar-track">
                  <div
                    className="usage-bar-fill"
                    style={{ width: `${Math.min(100, Math.round((cost / Math.max(0.01, budget.limitUsd)) * 100))}%` }}
                  />
                </div>
                <span>${cost.toFixed(3)}</span>
              </div>
            ))}
        </div>

        <div className="usage-title">Feature breakdown</div>
        <div className="usage-feature-list">
          {Object.entries(usage.featureCosts).map(([feature, cost]) => (
            <div className="usage-feature-row" key={feature}>
              <span>{feature}</span>
              <span>${cost.toFixed(3)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ai-chat">
        <div className="ai-messages">
          {messages.map((message) => (
            <article key={message.id} className={`chat-row ${message.role}`}>
              {message.pending && !message.content ? <span className="typing-dot">...</span> : message.content}
            </article>
          ))}
        </div>

        <form
          className="ai-input"
          onSubmit={(event) => {
            event.preventDefault();
            void sendPrompt(input, "chat");
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={hasApiKey ? "Ask about this page" : "Configure API key first"}
          />
          <button className="primary-button" disabled={!canSend}>
            Send
          </button>
        </form>
      </section>
    </aside>
  );
}
