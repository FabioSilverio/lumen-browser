import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Trash2, X } from "lucide-react";
import type { BoardColumnId, Chore, ChoreKind } from "../types";
import { CHORE_ICON, CHORE_KIND_LABEL, KIND_OPTIONS, kindAccent } from "../lib/choreIcons";
import {
  addMinutes,
  isoLocalFromDate,
  parseIsoLocal,
  roundToQuarterHour,
  toLocalInputDate,
  toLocalInputTime
} from "../lib/dates";
import { openWhatsappReminder } from "../lib/whatsapp";
import type { AppSettings } from "../types";
import { createId } from "../lib/id";

export type EditorMode = { type: "create" } | { type: "edit"; chore: Chore };

const COLUMN_LABEL: Record<BoardColumnId, string> = {
  todo: "A fazer",
  doing: "Fazendo",
  done: "Feito"
};

const DURATIONS = [15, 30, 45, 60, 90, 120];

type Props = {
  mode: EditorMode;
  settings: AppSettings;
  onClose: () => void;
  onSave: (chore: Chore) => void;
  onDelete?: (id: string) => void;
};

function defaultChore(): Omit<Chore, "id" | "createdAt" | "updatedAt"> {
  const start = roundToQuarterHour(new Date());
  return {
    title: "",
    notes: "",
    kind: "limpeza",
    column: "todo",
    start: isoLocalFromDate(start),
    durationMin: 60,
    remindAt: null
  };
}

export function ChoreEditor({ mode, settings, onClose, onSave, onDelete }: Props) {
  const base = useMemo(() => {
    if (mode.type === "edit") {
      const c = mode.chore;
      return {
        title: c.title,
        notes: c.notes,
        kind: c.kind,
        column: c.column,
        start: c.start,
        durationMin: c.durationMin,
        remindAt: c.remindAt
      };
    }
    return defaultChore();
  }, [mode]);

  const [title, setTitle] = useState(base.title);
  const [notes, setNotes] = useState(base.notes);
  const [kind, setKind] = useState<ChoreKind>(base.kind);
  const [column, setColumn] = useState<BoardColumnId>(base.column);
  const [dateStr, setDateStr] = useState(() => toLocalInputDate(parseIsoLocal(base.start)));
  const [timeStr, setTimeStr] = useState(() => toLocalInputTime(parseIsoLocal(base.start)));
  const [durationMin, setDurationMin] = useState(base.durationMin);
  const [remindDate, setRemindDate] = useState(() =>
    base.remindAt ? toLocalInputDate(parseIsoLocal(base.remindAt)) : ""
  );
  const [remindTime, setRemindTime] = useState(() =>
    base.remindAt ? toLocalInputTime(parseIsoLocal(base.remindAt)) : ""
  );

  useEffect(() => {
    setTitle(base.title);
    setNotes(base.notes);
    setKind(base.kind);
    setColumn(base.column);
    setDateStr(toLocalInputDate(parseIsoLocal(base.start)));
    setTimeStr(toLocalInputTime(parseIsoLocal(base.start)));
    setDurationMin(base.durationMin);
    setRemindDate(base.remindAt ? toLocalInputDate(parseIsoLocal(base.remindAt)) : "");
    setRemindTime(base.remindAt ? toLocalInputTime(parseIsoLocal(base.remindAt)) : "");
  }, [base]);

  const startIso = useMemo(() => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    if (!y || !m || !d || hh === undefined || mm === undefined) return base.start;
    const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
    return isoLocalFromDate(dt);
  }, [dateStr, timeStr, base.start]);

  const remindAt: string | null = useMemo(() => {
    if (!remindDate || !remindTime) return null;
    const [y, m, d] = remindDate.split("-").map(Number);
    const [hh, mm] = remindTime.split(":").map(Number);
    if (!y || !m || !d || hh === undefined || mm === undefined) return null;
    return isoLocalFromDate(new Date(y, m - 1, d, hh, mm, 0, 0));
  }, [remindDate, remindTime]);

  const previewChore: Chore = useMemo(() => {
    const now = new Date().toISOString();
    if (mode.type === "edit") {
      return {
        ...mode.chore,
        title: title.trim() || mode.chore.title,
        notes,
        kind,
        column,
        start: startIso,
        durationMin,
        remindAt,
        updatedAt: now
      };
    }
    return {
      id: "preview",
      title: title.trim() || "Nova tarefa",
      notes,
      kind,
      column,
      start: startIso,
      durationMin,
      remindAt,
      createdAt: now,
      updatedAt: now
    };
  }, [column, durationMin, kind, mode, notes, remindAt, startIso, title]);

  function handleSave() {
    const t = title.trim();
    if (!t) return;
    const now = new Date().toISOString();
    if (mode.type === "edit") {
      onSave({
        ...mode.chore,
        title: t,
        notes,
        kind,
        column,
        start: startIso,
        durationMin,
        remindAt,
        updatedAt: now
      });
      return;
    }
    onSave({
      id: createId(),
      title: t,
      notes,
      kind,
      column,
      start: startIso,
      durationMin,
      remindAt,
      createdAt: now,
      updatedAt: now
    });
  }

  const waOk = settings.spouseWhatsapp.replace(/\D/g, "").length >= 10;

  return (
    <div className="backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="sheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h3>{mode.type === "edit" ? "Editar tarefa" : "Nova tarefa"}</h3>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="sheet-body">
          <div className="field">
            <label htmlFor="chore-title">Título</label>
            <input
              id="chore-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Limpar a geladeira"
              autoFocus
            />
          </div>

          <div className="field">
            <span className="field" style={{ marginBottom: 0 }}>
              <label>Tipo (ícone)</label>
            </span>
            <div className="kind-grid" role="list">
              {KIND_OPTIONS.map((k) => {
                const Icon = CHORE_ICON[k];
                const pressed = k === kind;
                return (
                  <button
                    key={k}
                    type="button"
                    className="kind-tile"
                    aria-pressed={pressed}
                    onClick={() => setKind(k)}
                  >
                    <span
                      className="card-icon"
                      style={{
                        color: kindAccent(k),
                        borderColor: "rgba(255,255,255,0.12)",
                        background: "rgba(15,23,42,0.55)"
                      }}
                    >
                      <Icon size={18} />
                    </span>
                    {CHORE_KIND_LABEL[k]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <label htmlFor="chore-notes">Anotações</label>
            <textarea
              id="chore-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Lista de passos, produtos, detalhes…"
            />
          </div>

          <div className="row-2">
            <div className="field">
              <label htmlFor="chore-date">Dia</label>
              <input id="chore-date" type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="chore-time">Horário de início</label>
              <input id="chore-time" type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="chore-duration">Duração</label>
            <select
              id="chore-duration"
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
            >
              {DURATIONS.map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="chore-column">Coluna no quadro</label>
            <select id="chore-column" value={column} onChange={(e) => setColumn(e.target.value as BoardColumnId)}>
              {(Object.keys(COLUMN_LABEL) as BoardColumnId[]).map((c) => (
                <option key={c} value={c}>
                  {COLUMN_LABEL[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="row-2">
            <div className="field">
              <label htmlFor="remind-date">Lembrete (dia)</label>
              <input
                id="remind-date"
                type="date"
                value={remindDate}
                onChange={(e) => setRemindDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="remind-time">Lembrete (hora)</label>
              <input
                id="remind-time"
                type="time"
                value={remindTime}
                onChange={(e) => setRemindTime(e.target.value)}
              />
            </div>
          </div>
          <p className="hint">
            O lembrete usa notificação do navegador neste aparelho. Para avisar no WhatsApp, use o botão abaixo com o
            número da pessoa cadastrado em Ajustes.
          </p>

          <div className="sheet-actions">
            <button type="button" className="primary-btn" onClick={handleSave} disabled={!title.trim()}>
              Salvar
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => openWhatsappReminder(previewChore, settings)}
              disabled={!waOk}
              title={waOk ? "Abre o WhatsApp com a mensagem pronta" : "Cadastre o WhatsApp em Ajustes"}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <MessageCircle size={16} /> WhatsApp
              </span>
            </button>
            {mode.type === "edit" && onDelete ? (
              <button
                type="button"
                className="danger-btn"
                onClick={() => {
                  onDelete(mode.chore.id);
                  onClose();
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Trash2 size={16} /> Excluir
                </span>
              </button>
            ) : null}
          </div>

          <p className="hint">
            Prévia do horário:{" "}
            <strong>
              {toLocalInputTime(parseIsoLocal(startIso))} →{" "}
              {toLocalInputTime(addMinutes(parseIsoLocal(startIso), durationMin))}
            </strong>
          </p>
        </div>
      </div>
    </div>
  );
}
