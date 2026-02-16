import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import { Lock, Sparkles } from "lucide-react";

interface UrlBarProps {
  value: string;
  activeUrl: string;
  dragTabId?: string;
  suggestions: string[];
  focused: boolean;
  onFocusChange: (focused: boolean) => void;
  onChange: (value: string) => void;
  onAcceptSuggestion: (value: string) => void;
  onSubmit: () => void;
  onRunPageIntelligence: () => void;
  compact?: boolean;
}

const AI_COMMANDS = ["@chat", "@gpt", "@claude", "@grok", "@qwen", "@kimi", "@openclaw"];

type DropdownItem = {
  value: string;
  kind: "command" | "suggestion";
};

function simplify(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    return `${parsed.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
}

export function UrlBar({
  value,
  activeUrl,
  dragTabId,
  suggestions,
  focused,
  onFocusChange,
  onChange,
  onAcceptSuggestion,
  onSubmit,
  onRunPageIntelligence,
  compact = false
}: UrlBarProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);

  const display = useMemo(() => (focused ? value : simplify(activeUrl)), [value, activeUrl, focused]);

  const dropdownItems = useMemo<DropdownItem[]>(() => {
    if (!focused) {
      return [];
    }

    const trimmed = value.trim();
    if (trimmed.startsWith("@")) {
      const [prefix] = trimmed.split(/\s+/);
      if (!prefix) {
        return AI_COMMANDS.map((cmd) => ({ value: cmd, kind: "command" }));
      }

      return AI_COMMANDS
        .filter((cmd) => cmd.startsWith(prefix.toLowerCase()))
        .slice(0, 6)
        .map((cmd) => ({ value: cmd, kind: "command" }));
    }

    return suggestions.slice(0, 8).map((item) => ({ value: item, kind: "suggestion" }));
  }, [focused, value, suggestions]);

  const applyCommand = (command: string) => {
    const trimmed = value.trim();
    const parts = trimmed.split(/\s+/);
    const tail = parts.length > 1 ? parts.slice(1).join(" ") : "";
    onChange(tail ? `${command} ${tail}` : `${command} `);
    setSelectedSuggestion(0);
  };

  const pickDropdownItem = (item: DropdownItem) => {
    if (item.kind === "command") {
      applyCommand(item.value);
      return;
    }

    onChange(item.value);
    onAcceptSuggestion(item.value);
    setSelectedSuggestion(0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownItems.length) {
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const pick = dropdownItems[selectedSuggestion] ?? dropdownItems[0];
      if (pick) {
        if (pick.kind === "command") {
          applyCommand(pick.value);
        } else {
          onChange(pick.value);
          setSelectedSuggestion(0);
        }
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedSuggestion((prev) => (prev + 1) % dropdownItems.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedSuggestion((prev) => (prev - 1 + dropdownItems.length) % dropdownItems.length);
      return;
    }

    if (event.key === "Enter") {
      const pick = dropdownItems[selectedSuggestion];
      if (pick?.kind === "suggestion") {
        event.preventDefault();
        onChange(pick.value);
        onAcceptSuggestion(pick.value);
      }
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const pick = dropdownItems[selectedSuggestion];
    if (pick && pick.kind === "command" && value.trim().startsWith("@") && !value.trim().includes(" ")) {
      applyCommand(pick.value);
      return;
    }

    onSubmit();
  };

  return (
    <div className={`url-shell ${compact ? "compact" : ""}`}>
      <form className={`url-bar ${focused ? "focused" : ""}`} onSubmit={handleSubmit}>
        <span className="security-icon" aria-hidden="true">
          <span
            draggable={Boolean(dragTabId)}
            onDragStart={(event) => {
              if (!dragTabId) {
                return;
              }
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/tab-id", dragTabId);
            }}
          >
            <Lock size={12} strokeWidth={1.8} />
          </span>
        </span>
        <input
          id="lumen-url-input"
          value={display}
          onFocus={() => onFocusChange(true)}
          onBlur={() => {
            setSelectedSuggestion(0);
            onFocusChange(false);
          }}
          onChange={(event) => {
            setSelectedSuggestion(0);
            onChange(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search, URL, or @chat/@claude/@gpt/@qwen"
          spellCheck={false}
          autoComplete="off"
        />
        <button type="button" className="url-intelligence" onClick={onRunPageIntelligence} title="Page intelligence">
          <Sparkles size={13} strokeWidth={1.8} />
        </button>
      </form>

      {focused && dropdownItems.length ? (
        <div className="url-autocomplete">
          {dropdownItems.map((item, idx) => (
            <button
              key={`${item.kind}:${item.value}`}
              type="button"
              className={`url-autocomplete-item ${selectedSuggestion === idx ? "active" : ""}`}
              onMouseEnter={() => setSelectedSuggestion(idx)}
              onMouseDown={(event) => {
                event.preventDefault();
                pickDropdownItem(item);
              }}
            >
              {item.value}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
