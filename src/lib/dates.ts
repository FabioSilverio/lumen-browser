const MS_DAY = 86_400_000;

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Segunda-feira como início da semana (pt-BR) */
export function startOfWeekMonday(d: Date): Date {
  const day = d.getDay(); // 0 dom ... 6 sáb
  const diff = day === 0 ? -6 : 1 - day;
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + diff);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function weekDaysFrom(base: Date): Date[] {
  const start = startOfWeekMonday(base);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function toLocalInputDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function toLocalInputTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function parseLocalDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y!, m! - 1, d!, hh!, mm!, 0, 0);
}

export function formatWeekdayShort(d: Date): string {
  return d.toLocaleDateString("pt-BR", { weekday: "short" });
}

export function formatDayMonth(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function formatTimeRange(start: Date, end: Date): string {
  const a = start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const b = end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${a}–${b}`;
}

export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function addMinutes(d: Date, m: number): Date {
  return new Date(d.getTime() + m * 60_000);
}

export function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isoLocalFromDate(d: Date): string {
  return `${toLocalInputDate(d)}T${toLocalInputTime(d)}:00`;
}

export function parseIsoLocal(iso: string): Date {
  const [datePart, timePart] = iso.split("T");
  if (!datePart || !timePart) return new Date(iso);
  const time = timePart.slice(0, 5);
  return parseLocalDateTime(datePart, time);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function roundToQuarterHour(d: Date): Date {
  const m = d.getMinutes();
  const rounded = Math.round(m / 15) * 15;
  const x = new Date(d);
  x.setMinutes(rounded, 0, 0);
  if (rounded === 60) {
    x.setHours(x.getHours() + 1, 0, 0, 0);
  }
  return x;
}

export function daysBetween(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / MS_DAY);
}
