import { useEffect, useState } from "react";
import { Command, Minus, PanelLeft, Square, SquareDashed, X } from "lucide-react";

interface TitleBarProps {
  sidebarPinned: boolean;
  onToggleSidebarPin: () => void;
  onOpenCommandPalette: () => void;
}

export function TitleBar({ sidebarPinned, onToggleSidebarPin, onOpenCommandPalette }: TitleBarProps) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    void window.lumen.window.isMaximized().then(setMaximized);
    return window.lumen.window.onMaximizedChange(setMaximized);
  }, []);

  return (
    <header className="title-bar">
      <div className="drag-region">
        <button
          className={`icon-button no-drag ${sidebarPinned ? "active" : ""}`}
          onClick={onToggleSidebarPin}
          title="Toggle sidebar pin (Ctrl+B)"
        >
          <PanelLeft size={16} />
        </button>
        <span className="wordmark">Lumen</span>
      </div>

      <div className="title-actions no-drag">
        <button className="icon-button" onClick={onOpenCommandPalette} title="Command palette (Ctrl+K)">
          <Command size={16} />
        </button>
        <button className="window-button" onClick={() => void window.lumen.window.minimize()} title="Minimize">
          <Minus size={15} />
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
          {maximized ? <SquareDashed size={14} /> : <Square size={14} />}
        </button>
        <button className="window-button close" onClick={() => void window.lumen.window.close()} title="Close">
          <X size={15} />
        </button>
      </div>
    </header>
  );
}
