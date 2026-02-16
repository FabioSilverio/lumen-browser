import { FormEvent, useMemo } from "react";
import { Lock, Sparkles } from "lucide-react";

interface UrlBarProps {
  value: string;
  activeUrl: string;
  focused: boolean;
  onFocusChange: (focused: boolean) => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onRunPageIntelligence: () => void;
}

function simplify(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    return parsed.hostname.replace(/^www\./, "") + path;
  } catch {
    return url;
  }
}

export function UrlBar({ value, activeUrl, focused, onFocusChange, onChange, onSubmit, onRunPageIntelligence }: UrlBarProps) {
  const display = useMemo(() => (focused ? value : simplify(activeUrl)), [value, activeUrl, focused]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="url-shell">
      <form className={`url-bar ${focused ? "focused" : ""}`} onSubmit={handleSubmit}>
        <span className="security-icon" aria-hidden>
          <Lock size={15} />
        </span>
        <input
          id="lumen-url-input"
          value={display}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search or enter URL"
          spellCheck={false}
          autoComplete="off"
        />
        <button type="button" className="url-intelligence" onClick={onRunPageIntelligence} title="Page intelligence">
          <Sparkles size={14} />
        </button>
      </form>
    </div>
  );
}
