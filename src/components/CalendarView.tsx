import type { Chore } from "../types";
import { CHORE_ICON, kindAccent } from "../lib/choreIcons";
import {
  addMinutes,
  formatDayMonth,
  formatTimeRange,
  formatWeekdayShort,
  minutesSinceMidnight,
  parseIsoLocal,
  sameLocalDay,
  startOfWeekMonday,
  toLocalInputDate
} from "../lib/dates";

const START_HOUR = 6;
const END_HOUR = 22;
const SLOT_MIN = 15;
const SLOT_PX = 28;

type Props = {
  weekAnchor: Date;
  chores: Chore[];
  today: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onSelectChore: (c: Chore) => void;
};

export function CalendarView({ weekAnchor, chores, today, onPrevWeek, onNextWeek, onSelectChore }: Props) {
  const monday = startOfWeekMonday(weekAnchor);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const slots = (END_HOUR - START_HOUR) * (60 / SLOT_MIN);
  const gridHeight = slots * SLOT_PX;

  function choresForDay(day: Date): Chore[] {
    return chores.filter((c) => sameLocalDay(parseIsoLocal(c.start), day));
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Calendário semanal</h2>
        <div className="week-nav">
          <button type="button" className="ghost-btn" onClick={onPrevWeek}>
            ← Semana
          </button>
          <button type="button" className="ghost-btn" onClick={onNextWeek}>
            Semana →
          </button>
        </div>
      </div>
      <div className="calendar-scroll">
        <div className="calendar-grid" style={{ height: gridHeight + 56 }}>
          <div className="corner" />
          {days.map((d) => {
            const isToday = sameLocalDay(d, today);
            return (
              <div key={toLocalInputDate(d)} className={`day-head${isToday ? " is-today" : ""}`}>
                <strong>{formatWeekdayShort(d)}</strong>
                <span>{formatDayMonth(d)}</span>
              </div>
            );
          })}

          <div className="time-col" style={{ height: gridHeight }}>
            {Array.from({ length: slots }, (_, i) => {
              const totalMin = START_HOUR * 60 + i * SLOT_MIN;
              const h = Math.floor(totalMin / 60);
              const m = totalMin % 60;
              const label = m === 0 ? `${h}h` : "";
              return (
                <div key={i} className="time-slot" style={{ height: SLOT_PX }}>
                  {label}
                </div>
              );
            })}
          </div>

          {days.map((day) => {
            const list = choresForDay(day);
            return (
              <div key={toLocalInputDate(day)} className="day-col" style={{ height: gridHeight }}>
                {Array.from({ length: slots }, (_, i) => (
                  <div key={i} className="slot-line" style={{ height: SLOT_PX }} />
                ))}
                {list.map((c) => {
                  const start = parseIsoLocal(c.start);
                  const end = addMinutes(start, c.durationMin);
                  const startMin = minutesSinceMidnight(start);
                  const offsetMin = startMin - START_HOUR * 60;
                  if (offsetMin < 0) return null;
                  const top = (offsetMin / SLOT_MIN) * SLOT_PX;
                  const height = Math.max((c.durationMin / SLOT_MIN) * SLOT_PX, SLOT_PX * 0.75);
                  const Icon = CHORE_ICON[c.kind];
                  const accent = kindAccent(c.kind);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className="event-pill"
                      style={{
                        top,
                        height,
                        borderLeft: `4px solid ${accent}`,
                        background: "rgba(15,23,42,0.78)"
                      }}
                      onClick={() => onSelectChore(c)}
                    >
                      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span className="card-icon" style={{ width: 22, height: 22, color: accent }}>
                          <Icon size={14} />
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <strong>{c.title}</strong>
                          <small style={{ display: "block" }}>{formatTimeRange(start, end)}</small>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <p className="hint" style={{ padding: "10px 14px 14px", margin: 0 }}>
        Grade de {START_HOUR}h às {END_HOUR}h · Toque num bloco para editar · Semana de{" "}
        <strong>{toLocalInputDate(monday)}</strong>
      </p>
    </div>
  );
}
