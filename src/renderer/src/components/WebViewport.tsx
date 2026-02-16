import { FormEvent, MutableRefObject, useEffect, useState } from "react";
import { BrowserTab } from "../types";

interface WebViewportProps {
  tab: BrowserTab | undefined;
  profileId: string;
  webviewRef: MutableRefObject<Electron.WebviewTag | null>;
  onTitleChange: (title: string) => void;
  onUrlChange: (url: string) => void;
  onFaviconChange: (favicon: string) => void;
  onNavigationStateChange: (state: { canGoBack: boolean; canGoForward: boolean }) => void;
  onRestoreTab: () => void;
  onSendAIMessage: (tabId: string, text: string) => Promise<void>;
  onStartBrowsing: (url: string) => void;
}

export function WebViewport({
  tab,
  profileId,
  webviewRef,
  onTitleChange,
  onUrlChange,
  onFaviconChange,
  onNavigationStateChange,
  onRestoreTab,
  onSendAIMessage,
  onStartBrowsing
}: WebViewportProps) {
  const [aiInput, setAiInput] = useState("");

  useEffect(() => {
    setAiInput("");
  }, [tab?.id]);

  useEffect(() => {
    if (!tab || tab.suspended || tab.kind === "ai") {
      return;
    }

    const webview = webviewRef.current;
    if (!webview) {
      return;
    }

    const emitNavState = () => {
      onNavigationStateChange({
        canGoBack: webview.canGoBack(),
        canGoForward: webview.canGoForward()
      });
    };

    const handleTitle = (event: Electron.PageTitleUpdatedEvent) => {
      if (event.title) {
        onTitleChange(event.title);
      }
    };

    const handleNavigate = (event: Electron.DidNavigateEvent) => {
      if (event.url) {
        onUrlChange(event.url);
      }
      emitNavState();
    };

    const handleInPageNavigate = (event: Electron.DidNavigateInPageEvent) => {
      if (event.url) {
        onUrlChange(event.url);
      }
      emitNavState();
    };

    const handleFavicon = (event: Electron.PageFaviconUpdatedEvent) => {
      if (event.favicons.length > 0 && event.favicons[0]) {
        onFaviconChange(event.favicons[0]);
      }
    };

    const handleDidStopLoading = () => {
      emitNavState();
    };

    webview.addEventListener("page-title-updated", handleTitle);
    webview.addEventListener("did-navigate", handleNavigate);
    webview.addEventListener("did-navigate-in-page", handleInPageNavigate);
    webview.addEventListener("page-favicon-updated", handleFavicon);
    webview.addEventListener("did-stop-loading", handleDidStopLoading);
    emitNavState();

    return () => {
      webview.removeEventListener("page-title-updated", handleTitle);
      webview.removeEventListener("did-navigate", handleNavigate);
      webview.removeEventListener("did-navigate-in-page", handleInPageNavigate);
      webview.removeEventListener("page-favicon-updated", handleFavicon);
      webview.removeEventListener("did-stop-loading", handleDidStopLoading);
    };
  }, [tab?.id, tab?.url, tab?.suspended, tab?.kind, onTitleChange, onUrlChange, onFaviconChange, onNavigationStateChange, webviewRef]);

  if (!tab) {
    return (
      <section className="viewport-empty">
        <h1>Open a tab</h1>
      </section>
    );
  }

  if (tab.suspended) {
    return (
      <section className="viewport-empty">
        <h1>{tab.title}</h1>
        <p>This tab is suspended to reduce memory usage.</p>
        <button className="primary-button" onClick={onRestoreTab}>
          Restore tab
        </button>
      </section>
    );
  }

  if (tab.kind === "ai") {
    const conversation = tab.aiMessages ?? [];

    return (
      <section className="viewport ai-tab-view">
        <header className="ai-tab-head">
          <div className="ai-tab-provider">{tab.aiProviderLabel ?? "AI"}</div>
          <h1>{tab.aiQuery || "AI Query"}</h1>
        </header>

        <article className="ai-tab-content">
          {conversation.length ? (
            conversation.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`ai-tab-message ${message.role}`}>
                <div className="ai-tab-message-role">{message.role === "user" ? "You" : "AI"}</div>
                <div className="ai-tab-message-content">
                  {message.content || (tab.aiLoading && message.role === "assistant" ? "Thinking..." : "")}
                </div>
              </div>
            ))
          ) : tab.aiLoading ? (
            <p className="ai-tab-placeholder">Thinking...</p>
          ) : (
            <pre>{tab.aiResponse || tab.aiError || "No response yet."}</pre>
          )}
        </article>

        <form
          className="ai-tab-input"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!aiInput.trim()) {
              return;
            }
            void onSendAIMessage(tab.id, aiInput.trim());
            setAiInput("");
          }}
        >
          <input
            value={aiInput}
            onChange={(event) => setAiInput(event.target.value)}
            placeholder="Reply to continue this AI conversation"
          />
          <button className="primary-button" type="submit" disabled={tab.aiLoading}>
            Send
          </button>
        </form>
      </section>
    );
  }

  if (tab.kind === "welcome") {
    return (
      <section className="viewport welcome-view">
        <div className="welcome-card">
          <h1>Lumen</h1>
          <p>Welcome. Type a URL or search query to start browsing.</p>
          <div className="welcome-actions">
            <button className="primary-button" onClick={() => onStartBrowsing("https://duckduckgo.com")}>
              Start browsing
            </button>
            <button className="secondary-button" onClick={() => onStartBrowsing("https://www.youtube.com")}>
              Open YouTube
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="viewport">
      <webview
        key={`${profileId}:${tab.id}`}
        ref={(node) => {
          webviewRef.current = node as Electron.WebviewTag | null;
        }}
        className="webview"
        src={tab.url}
        partition={`persist:lumen-profile-${profileId}`}
        allowpopups
      />
    </section>
  );
}
