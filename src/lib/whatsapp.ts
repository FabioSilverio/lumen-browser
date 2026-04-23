import type { AppSettings } from "../types";
import { CHORE_KIND_LABEL } from "./choreIcons";
import type { Chore } from "../types";
import { formatDayMonth, formatTimeRange, parseIsoLocal, addMinutes } from "./dates";

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export function buildWhatsappUrl(phoneDigits: string, text: string): string | null {
  const d = onlyDigits(phoneDigits);
  if (d.length < 10) return null;
  const enc = encodeURIComponent(text);
  return `https://wa.me/${d}?text=${enc}`;
}

export function reminderMessageForSpouse(
  chore: Chore,
  settings: AppSettings
): string {
  const start = parseIsoLocal(chore.start);
  const end = addMinutes(start, chore.durationMin);
  const tipo = CHORE_KIND_LABEL[chore.kind];
  const data = formatDayMonth(start);
  const horario = formatTimeRange(start, end);
  const name = settings.spouseName.trim() || "amor";
  const lines = [
    `Oi ${name}!`,
    `Lembrete: ${chore.title}`,
    `Tipo: ${tipo}`,
    `Quando: ${data} · ${horario}`
  ];
  if (chore.notes.trim()) {
    lines.push(`Obs: ${chore.notes.trim()}`);
  }
  lines.push("", "(Casa Flow — cadastrei pra gente não esquecer)");
  return lines.join("\n");
}

export function openWhatsappReminder(chore: Chore, settings: AppSettings): boolean {
  const url = buildWhatsappUrl(settings.spouseWhatsapp, reminderMessageForSpouse(chore, settings));
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
