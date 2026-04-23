import type { Chore } from "../types";
import { parseIsoLocal } from "./dates";

const notified = new Set<string>();

function choreKey(c: Chore, when: number): string {
  return `${c.id}:${when}`;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function tickReminders(chores: Chore[], now = Date.now()): void {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  for (const c of chores) {
    if (!c.remindAt) continue;
    const t = parseIsoLocal(c.remindAt).getTime();
    if (Number.isNaN(t)) continue;
    if (t > now || t < now - 120_000) continue;
    const key = choreKey(c, t);
    if (notified.has(key)) continue;
    notified.add(key);
    try {
      new Notification(c.title, {
        body: c.notes.trim() || "Tarefa de casa",
        tag: c.id,
        lang: "pt-BR"
      });
    } catch {
      notified.delete(key);
    }
  }
}
