import { useEffect, useState } from "react";
import { Command, PanelLeft } from "lucide-react";
import { UrlBar } from "./UrlBar";

interface TitleBarProps {
  sidebarPinned: boolean;
  activeTabId?: string;
  onToggleSidebarPin: () => void;
  onOpenCommandPalette: () => void;
  urlValue: string;
  activeUrl: string;
  urlFocused: boolean;
  onUrlFocusChange: (focused: boolean) => void;
  onUrlChange: (value: string) => void;
  onUrlSubmit: () => void;
  onRunPageIntelligence: () => void;
}

export function TitleBar({
  sidebarPinned,
  activeTabId,
  onToggleSidebarPin,
  onOpenCommandPalette,
  urlValue,
  activeUrl,
  urlFocused,
  onUrlFocusChange,
  onUrlChange,
  onUrlSubmit,
  onRunPageIntelligence
}: TitleBarProps) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    void window.lumen.window.isMaximized().then(setMaximized);
    return window.lumen.window.onMaximizedChange(setMaximized);
  }, []);

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
      </div>

      <div className="title-center no-drag">
        <UrlBar
          compact
          dragTabId={activeTabId}
          value={urlValue}
          activeUrl={activeUrl}
          focused={urlFocused}
          onFocusChange={onUrlFocusChange}
          onChange={onUrlChange}
          onSubmit={onUrlSubmit}
          onRunPageIntelligence={onRunPageIntelligence}
        />
      </div>

      <div className="title-actions no-drag">
        <button className="icon-button" onClick={onOpenCommandPalette} title="Command palette (Ctrl+K)">
          <Command size={15} strokeWidth={1.8} />
        </button>
        <button className="window-button" onClick={() => void window.lumen.window.minimize()} title="Minimize">
          <span className="window-glyph minimize" />
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
          <span className={`window-glyph ${maximized ? "restore" : "maximize"}`} />
        </button>
        <button className="window-button close" onClick={() => void window.lumen.window.close()} title="Close">
          <span className="window-glyph close" />
        </button>
      </div>
    </header>
  );
}
