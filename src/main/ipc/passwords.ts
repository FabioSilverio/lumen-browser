import { ipcMain } from "electron";
import { randomUUID } from "node:crypto";
import { PasswordStore } from "../services/password-store";

interface SavePasswordPayload {
  profileId: string;
  entry: {
    id?: string;
    site: string;
    username: string;
    password: string;
    notes?: string;
  };
}

export function registerPasswordIpc(): void {
  const store = new PasswordStore();

  ipcMain.handle("passwords:list", (_, profileId: string) => {
    return store.list(profileId);
  });

  ipcMain.handle("passwords:save", (_, payload: SavePasswordPayload) => {
    const id = payload.entry.id ?? randomUUID();
    return store.save(payload.profileId, {
      id,
      site: payload.entry.site.trim(),
      username: payload.entry.username.trim(),
      password: payload.entry.password,
      notes: payload.entry.notes?.trim()
    });
  });

  ipcMain.handle("passwords:remove", (_, payload: { profileId: string; id: string }) => {
    return store.remove(payload.profileId, payload.id);
  });
}
