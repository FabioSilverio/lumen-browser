import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Command, Download, Minus, PanelLeft, RotateCw, Square, SquareStack, X } from "lucide-react";
import { UrlBar } from "./UrlBar";
import { BrowserProfile } from "../types";

interface TitleBarProps {
  sidebarPinned: boolean;
  activeTabId?: string;
  profiles: BrowserProfile[];
  activeProfileId: string;
  onSwitchProfile: (profileId: string) => void;
  onAddProfile: () => void;
  onToggleSidebarPin: () => void;
  onOpenCommandPalette: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  canRefresh: boolean;
  canInstallStoreExtension: boolean;
  backHistoryItems: string[];
  onGoBack: () => void;
  onGoForward: () => void;
  onRefresh: () => void;
  onInstallStoreExtension: () => void;
  onNavigateBackHistory: (url: string) => void;
  urlValue: string;
  activeUrl: string;
  addressSuggestions: string[];
  urlFocused: boolean;
  onUrlFocusChange: (focused: boolean) => void;
  onUrlChange: (value: string) => void;
  onUrlAcceptSuggestion: (value: string) => void;
  onUrlSubmit: () => void;
  pageIntelligenceLoading: boolean;
  onRunPageIntelligence: () => void;
}

export function TitleBar({
  sidebarPinned,
  activeTabId,
  profiles,
  activeProfileId,
  onSwitchProfile,
  onAddProfile,
  onToggleSidebarPin,
  onOpenCommandPalette,
  canGoBack,
  canGoForward,
  canRefresh,
  canInstallStoreExtension,
  backHistoryItems,
  onGoBack,
  onGoForward,
  onRefresh,
  onInstallStoreExtension,
  onNavigateBackHistory,
  urlValue,
  activeUrl,
  addressSuggestions,
  urlFocused,
  onUrlFocusChange,
  onUrlChange,
  onUrlAcceptSuggestion,
  onUrlSubmit,
  pageIntelligenceLoading,
  onRunPageIntelligence
}: TitleBarProps) {
  const [maximized, setMaximized] = useState(false);
  const [showBackHistory, setShowBackHistory] = useState(false);
  const backHistoryRef = useRef<HTMLDivElement | null>(null);

  const backMenuItems = useMemo(() => backHistoryItems.slice(0, 20), [backHistoryItems]);

  useEffect(() => {
    void window.lumen.window.isMaximized().then(setMaximized);
    return window.lumen.window.onMaximizedChange(setMaximized);
  }, []);

  useEffect(() => {
    if (!showBackHistory) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!backHistoryRef.current) {
        return;
      }
      if (!backHistoryRef.current.contains(event.target as Node)) {
        setShowBackHistory(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [showBackHistory]);

  return (
    <header className="title-bar">
      <div className="title-left">
        <button
          className={`icon-button no-drag ${sidebarPinned ? "active" : ""}`}
          onClick={onToggleSidebarPin}
          title="Toggle sidebar pin (Ctrl+B)"
        >
          <PanelLeft size={16} strokeWidth={1.8} />
        </button>
        <span className="wordmark">Lumen</span>
        <div className="profile-picker no-drag">
          <select value={activeProfileId} onChange={(event) => onSwitchProfile(event.target.value)} title="Profile">
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
          <button className="tab-mini" onClick={onAddProfile} title="New profile">
            +
          </button>
        </div>

        <div className="nav-controls no-drag" ref={backHistoryRef}>
          <button
            className="icon-button"
            onClick={() => {
              setShowBackHistory(false);
              onGoBack();
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              if (!backMenuItems.length) {
                return;
              }
              setShowBackHistory((value) => !value);
            }}
            disabled={!canGoBack}
            title="Back (right-click for history)"
          >
            <ChevronLeft size={14} strokeWidth={1.9} />
          </button>
          <button className="icon-button" onClick={onGoForward} disabled={!canGoForward} title="Forward">
            <ChevronRight size={14} strokeWidth={1.9} />
          </button>
          <button className="icon-button" onClick={onRefresh} disabled={!canRefresh} title="Refresh">
            <RotateCw size={13} strokeWidth={1.9} />
          </button>
          <button
            className="icon-button"
            onClick={onInstallStoreExtension}
            disabled={!canInstallStoreExtension}
            title="Install extension from current Chrome Web Store page"
          >
            <Download size={13} strokeWidth={1.9} />
          </button>

          {showBackHistory && backMenuItems.length ? (
            <div className="back-history-menu">
              {backMenuItems.map((url) => (
                <button
                  key={url}
                  className="back-history-item"
                  onClick={() => {
                    onNavigateBackHistory(url);
                    setShowBackHistory(false);
                  }}
                  title={url}
                >
                  {url}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="title-center no-drag">
        <UrlBar
          compact
          dragTabId={activeTabId}
          value={urlValue}
          activeUrl={activeUrl}
          suggestions={addressSuggestions}
          focused={urlFocused}
          onFocusChange={onUrlFocusChange}
          onChange={onUrlChange}
          onAcceptSuggestion={onUrlAcceptSuggestion}
          onSubmit={onUrlSubmit}
          intelligenceLoading={pageIntelligenceLoading}
          onRunPageIntelligence={onRunPageIntelligence}
        />
      </div>

      <div className="title-actions no-drag">
        <button className="icon-button" onClick={onOpenCommandPalette} title="Command palette (Ctrl+K)">
          <Command size={15} strokeWidth={1.8} />
        </button>
        <button className="window-button" onClick={() => void window.lumen.window.minimize()} title="Minimize">
          <Minus size={14} strokeWidth={1.8} />
        </button>
        <button
          className="window-button"
          onClick={() =>
            void window.lumen.window.toggleMaximize().then((value) => {
              setMaximized(value);
            })
          }
          title={maximized ? "Restore" : "Maximize"}
        >
          {maximized ? <SquareStack size={13} strokeWidth={1.8} /> : <Square size={12} strokeWidth={1.8} />}
        </button>
        <button className="window-button close" onClick={() => void window.lumen.window.close()} title="Close">
          <X size={14} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}
