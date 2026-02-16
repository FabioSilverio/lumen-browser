import { FormEvent, useMemo } from "react";

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
    return parsed.hostname.replace(/^www\./, "") + parsed.pathname;
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
        <span className="security-icon">lock</span>
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
          AI
        </button>
      </form>
    </div>
  );
}
