import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import { Lock, Sparkles } from "lucide-react";

interface UrlBarProps {
  value: string;
  activeUrl: string;
  dragTabId?: string;
  focused: boolean;
  onFocusChange: (focused: boolean) => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onRunPageIntelligence: () => void;
  compact?: boolean;
}

const AI_COMMANDS = ["@chat", "@gpt", "@claude", "@grok", "@qwen", "@kimi", "@openclaw"];

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
  focused,
  onFocusChange,
  onChange,
  onSubmit,
  onRunPageIntelligence,
  compact = false
}: UrlBarProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);

  const display = useMemo(() => (focused ? value : simplify(activeUrl)), [value, activeUrl, focused]);

  const aiMatches = useMemo(() => {
    if (!focused) {
      return [];
    }

    const trimmed = value.trim();
    if (!trimmed.startsWith("@")) {
      return [];
    }

    const [prefix] = trimmed.split(/\s+/);
    if (!prefix) {
      return AI_COMMANDS;
    }

    return AI_COMMANDS.filter((cmd) => cmd.startsWith(prefix.toLowerCase())).slice(0, 5);
  }, [focused, value]);

  const applySuggestion = (command: string) => {
    const trimmed = value.trim();
    const parts = trimmed.split(/\s+/);
    const tail = parts.length > 1 ? parts.slice(1).join(" ") : "";
    onChange(tail ? `${command} ${tail}` : `${command} `);
    setSelectedSuggestion(0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!aiMatches.length) {
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const pick = aiMatches[selectedSuggestion] ?? aiMatches[0];
      if (pick) {
        applySuggestion(pick);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedSuggestion((prev) => (prev + 1) % aiMatches.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedSuggestion((prev) => (prev - 1 + aiMatches.length) % aiMatches.length);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (aiMatches.length && value.trim().startsWith("@") && !value.trim().includes(" ")) {
      const pick = aiMatches[selectedSuggestion] ?? aiMatches[0];
      if (pick) {
        applySuggestion(pick);
        return;
      }
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

      {focused && aiMatches.length ? (
        <div className="url-autocomplete">
          {aiMatches.map((cmd, idx) => (
            <button
              key={cmd}
              type="button"
              className={`url-autocomplete-item ${selectedSuggestion === idx ? "active" : ""}`}
              onMouseEnter={() => setSelectedSuggestion(idx)}
              onMouseDown={(event) => {
                event.preventDefault();
                applySuggestion(cmd);
              }}
            >
              {cmd}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
