import type { AppSettings, Chore } from "../types";
import { DEFAULT_SETTINGS } from "../types";

const STORAGE_KEY = "casa-flow-data-v1";

export type PersistedState = {
  chores: Chore[];
  settings: AppSettings;
};

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { chores: [], settings: { ...DEFAULT_SETTINGS } };
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return { chores: [], settings: { ...DEFAULT_SETTINGS } };
    }
    const obj = parsed as Partial<PersistedState>;
    const settings = {
      ...DEFAULT_SETTINGS,
      ...(obj.settings && typeof obj.settings === "object" ? obj.settings : {})
    };
    const chores = Array.isArray(obj.chores) ? (obj.chores as Chore[]) : [];
    return { chores, settings };
  } catch {
    return { chores: [], settings: { ...DEFAULT_SETTINGS } };
  }
}

export function saveState(state: PersistedState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
