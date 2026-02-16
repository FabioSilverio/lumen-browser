import { useEffect, useMemo, useState } from "react";
import { BrowserTab } from "../types";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  tabs: BrowserTab[];
  onSelectTab: (id: string) => void;
  onRunCommand: (command: string) => void;
  onAISearchTabs: (query: string) => Promise<BrowserTab[]>;
}

const COMMANDS = [
  "New tab",
  "Close tab",
  "Focus address bar",
  "Go back",
  "Go forward",
  "Refresh page",
  "Toggle sidebar",
  "Toggle dark mode",
  "Suspend all tabs",
  "Open task manager",
  "Manage extensions",
  "Password manager",
  "Permission audit",
  "Toggle AI panel",
  "Toggle favorite",
  "Suggest stale tabs",
  "Group tabs by topic",
  "Summarize this page (AI)"
];

export function CommandPalette({
  open,
  onClose,
  tabs,
  onSelectTab,
  onRunCommand,
  onAISearchTabs
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [aiMatches, setAiMatches] = useState<BrowserTab[]>([]);
  const [searchingAI, setSearchingAI] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setAiMatches([]);
      setSearchingAI(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !query.toLowerCase().startsWith("tab:")) {
      setAiMatches([]);
      setSearchingAI(false);
      return;
    }

    const run = async () => {
      setSearchingAI(true);
      try {
        const matches = await onAISearchTabs(query.slice(4).trim());
        setAiMatches(matches);
      } finally {
        setSearchingAI(false);
      }
    };

    void run();
  }, [open, query, onAISearchTabs]);

  const tabResults = useMemo(() => {
    if (query.toLowerCase().startsWith("tab:")) {
      return aiMatches;
    }

    if (!query.trim()) {
      return tabs.slice(0, 8);
    }

    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    return tabs.filter((tab) =>
      tokens.every((token) => `${tab.title} ${tab.url}`.toLowerCase().includes(token))
    );
  }, [query, tabs, aiMatches]);

  const commandResults = useMemo(() => {
    if (!query.trim() || query.toLowerCase().startsWith("tab:")) {
      return COMMANDS;
    }

    return COMMANDS.filter((command) =>
      command.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  if (!open) {
    return null;
  }

  return (
    <div className="overlay" onClick={onClose}>
      <section className="palette" onClick={(event) => event.stopPropagation()}>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tabs, commands, or use tab: for AI tab search"
        />

        {query.toLowerCase().startsWith("tab:") && (
          <div className="palette-tip">
            {searchingAI ? "AI is finding matching tabs..." : "AI tab search mode"}
          </div>
        )}

        <div className="palette-section">
          <div className="palette-label">Commands</div>
          {commandResults.map((command) => (
            <button
              className="palette-item"
              key={command}
              onClick={() => {
                onRunCommand(command);
                onClose();
              }}
            >
              {command}
            </button>
          ))}
        </div>

        <div className="palette-section">
          <div className="palette-label">Tabs</div>
          {tabResults.map((tab) => (
            <button
              className="palette-item"
              key={tab.id}
              onClick={() => {
                onSelectTab(tab.id);
                onClose();
              }}
            >
              {tab.title}
            </button>
          ))}
          {!tabResults.length && <div className="palette-empty">No tabs found.</div>}
        </div>
      </section>
    </div>
  );
}
