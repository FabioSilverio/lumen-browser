import { MessageCircle } from "lucide-react";
import type { BoardColumnId, Chore } from "../types";
import { CHORE_ICON, kindAccent } from "../lib/choreIcons";
import { formatTimeRange, parseIsoLocal, addMinutes } from "../lib/dates";
import type { AppSettings } from "../types";
import { openWhatsappReminder } from "../lib/whatsapp";

const COLUMNS: { id: BoardColumnId; title: string }[] = [
  { id: "todo", title: "A fazer" },
  { id: "doing", title: "Fazendo" },
  { id: "done", title: "Feito" }
];

type Props = {
  chores: Chore[];
  settings: AppSettings;
  onColumnDrop: (choreId: string, column: BoardColumnId) => void;
  onSelectChore: (c: Chore) => void;
};

export function BoardView({ chores, settings, onColumnDrop, onSelectChore }: Props) {
  const waOk = settings.spouseWhatsapp.replace(/\D/g, "").length >= 10;

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Quadro (estilo Trello)</h2>
      </div>
      <div className="board">
        {COLUMNS.map((col) => {
          const items = chores.filter((c) => c.column === col.id);
          return (
            <section
              key={col.id}
              className="column"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/chore-id");
                if (id) onColumnDrop(id, col.id);
              }}
            >
              <header className="column-head">
                <span>{col.title}</span>
                <span className="chip">{items.length}</span>
              </header>
              <div
                className="column-body"
                data-drag={1}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/chore-id");
                  if (id) onColumnDrop(id, col.id);
                }}
              >
                {items.map((c) => {
                  const Icon = CHORE_ICON[c.kind];
                  const accent = kindAccent(c.kind);
                  const start = parseIsoLocal(c.start);
                  const end = addMinutes(start, c.durationMin);
                  return (
                    <article
                      key={c.id}
                      className="card"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/chore-id", c.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectChore(c)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectChore(c);
                        }
                      }}
                    >
                      <div className="card-icon" style={{ color: accent }}>
                        <Icon size={18} />
                      </div>
                      <div className="card-body">
                        <p className="card-title">{c.title}</p>
                        <p className="card-meta">{formatTimeRange(start, end)}</p>
                        {c.notes.trim() ? (
                          <p className="card-meta" style={{ marginTop: 6 }}>
                            {c.notes.length > 90 ? `${c.notes.slice(0, 90)}…` : c.notes}
                          </p>
                        ) : null}
                        <div className="card-actions">
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openWhatsappReminder(c, settings);
                            }}
                            disabled={!waOk}
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <MessageCircle size={14} /> WhatsApp
                            </span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
