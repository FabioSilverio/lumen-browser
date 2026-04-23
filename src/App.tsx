import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, KanbanSquare, Plus, Settings } from "lucide-react";
import type { BoardColumnId, Chore } from "./types";
import { loadState, saveState } from "./lib/storage";
import { addDays, startOfWeekMonday } from "./lib/dates";
import { tickReminders } from "./lib/reminders";
import { CalendarView } from "./components/CalendarView";
import { BoardView } from "./components/BoardView";
import { ChoreEditor, type EditorMode } from "./components/ChoreEditor";
import { SettingsPanel } from "./components/SettingsPanel";

type Tab = "calendar" | "board";

export default function App() {
  const initial = useMemo(() => loadState(), []);
  const [chores, setChores] = useState<Chore[]>(initial.chores);
  const [settings, setSettings] = useState(initial.settings);
  const [tab, setTab] = useState<Tab>("calendar");
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    saveState({ chores, settings });
  }, [chores, settings]);

  useEffect(() => {
    const id = window.setInterval(() => tickReminders(chores), 30_000);
    tickReminders(chores);
    return () => window.clearInterval(id);
  }, [chores]);

  const upsertChore = useCallback((c: Chore) => {
    setChores((prev) => {
      const idx = prev.findIndex((x) => x.id === c.id);
      if (idx === -1) return [...prev, c];
      const next = [...prev];
      next[idx] = c;
      return next;
    });
    setEditor(null);
  }, []);

  const deleteChore = useCallback((id: string) => {
    setChores((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const moveChore = useCallback((choreId: string, column: BoardColumnId) => {
    setChores((prev) =>
      prev.map((c) => (c.id === choreId ? { ...c, column, updatedAt: new Date().toISOString() } : c))
    );
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1 className="app-title">Casa Flow</h1>
          <p className="app-sub">Calendário semanal + quadro ágil para tarefas de casa, com lembretes e WhatsApp.</p>
        </div>
        <button type="button" className="icon-btn" aria-label="Ajustes" onClick={() => setSettingsOpen(true)}>
          <Settings size={20} />
        </button>
      </header>

      <div className="tabs" role="tablist" aria-label="Visualização">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "calendar"}
          className="tab"
          onClick={() => setTab("calendar")}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <CalendarDays size={16} /> Calendário
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "board"}
          className="tab"
          onClick={() => setTab("board")}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <KanbanSquare size={16} /> Quadro
          </span>
        </button>
      </div>

      {tab === "calendar" ? (
        <CalendarView
          weekAnchor={weekStart}
          chores={chores}
          today={new Date()}
          onPrevWeek={() => setWeekStart((d) => addDays(d, -7))}
          onNextWeek={() => setWeekStart((d) => addDays(d, 7))}
          onSelectChore={(c) => setEditor({ type: "edit", chore: c })}
        />
      ) : (
        <BoardView
          chores={chores}
          settings={settings}
          onColumnDrop={moveChore}
          onSelectChore={(c) => setEditor({ type: "edit", chore: c })}
        />
      )}

      <button type="button" className="fab" aria-label="Nova tarefa" onClick={() => setEditor({ type: "create" })}>
        <Plus size={26} />
      </button>

      {editor ? (
        <ChoreEditor
          mode={editor}
          settings={settings}
          onClose={() => setEditor(null)}
          onSave={upsertChore}
          onDelete={editor.type === "edit" ? deleteChore : undefined}
        />
      ) : null}

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
