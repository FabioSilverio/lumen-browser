import { MutableRefObject, useEffect } from "react";
import { BrowserTab } from "../types";

interface WebViewportProps {
  tab: BrowserTab | undefined;
  webviewRef: MutableRefObject<Electron.WebviewTag | null>;
  onTitleChange: (title: string) => void;
  onUrlChange: (url: string) => void;
  onFaviconChange: (favicon: string) => void;
  onRestoreTab: () => void;
}

export function WebViewport({
  tab,
  webviewRef,
  onTitleChange,
  onUrlChange,
  onFaviconChange,
  onRestoreTab
}: WebViewportProps) {
  useEffect(() => {
    if (!tab || tab.suspended) {
      return;
    }

    const webview = webviewRef.current;
    if (!webview) {
      return;
    }

    const handleTitle = (event: Electron.PageTitleUpdatedEvent) => {
      if (event.title) {
        onTitleChange(event.title);
      }
    };

    const handleNavigate = (event: Electron.DidNavigateEvent) => {
      if (event.url) {
        onUrlChange(event.url);
      }
    };

    const handleInPageNavigate = (event: Electron.DidNavigateInPageEvent) => {
      if (event.url) {
        onUrlChange(event.url);
      }
    };

    const handleFavicon = (event: Electron.PageFaviconUpdatedEvent) => {
      if (event.favicons.length > 0 && event.favicons[0]) {
        onFaviconChange(event.favicons[0]);
      }
    };

    webview.addEventListener("page-title-updated", handleTitle);
    webview.addEventListener("did-navigate", handleNavigate);
    webview.addEventListener("did-navigate-in-page", handleInPageNavigate);
    webview.addEventListener("page-favicon-updated", handleFavicon);

    return () => {
      webview.removeEventListener("page-title-updated", handleTitle);
      webview.removeEventListener("did-navigate", handleNavigate);
      webview.removeEventListener("did-navigate-in-page", handleInPageNavigate);
      webview.removeEventListener("page-favicon-updated", handleFavicon);
    };
  }, [tab?.id, tab?.url, tab?.suspended, onTitleChange, onUrlChange, onFaviconChange, webviewRef]);

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

  return (
    <section className="viewport">
      <webview
        ref={(node) => {
          webviewRef.current = node as Electron.WebviewTag | null;
        }}
        className="webview"
        src={tab.url}
        allowpopups
      />
    </section>
  );
}
