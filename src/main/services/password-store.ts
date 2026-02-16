import { app, safeStorage } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface SavedPasswordEntry {
  id: string;
  site: string;
  username: string;
  password: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

interface PasswordStoreShape {
  byProfile: Record<string, string>;
}

const EMPTY: PasswordStoreShape = { byProfile: {} };

function encrypt(value: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(value).toString("base64");
  }
  return Buffer.from(value, "utf-8").toString("base64");
}

function decrypt(value: string): string {
  if (!value) {
    return "[]";
  }
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(value, "base64"));
  }
  return Buffer.from(value, "base64").toString("utf-8");
}

export class PasswordStore {
  private readonly path = join(app.getPath("userData"), "passwords.json");

  private read(): PasswordStoreShape {
    if (!existsSync(this.path)) {
      return EMPTY;
    }

    try {
      const raw = JSON.parse(readFileSync(this.path, "utf-8")) as Partial<PasswordStoreShape>;
      return {
        byProfile: raw.byProfile ?? {}
      };
    } catch {
      return EMPTY;
    }
  }

  private write(value: PasswordStoreShape): void {
    const folder = dirname(this.path);
    if (!existsSync(folder)) {
      mkdirSync(folder, { recursive: true });
    }

    writeFileSync(this.path, JSON.stringify(value, null, 2), "utf-8");
  }

  list(profileId: string): SavedPasswordEntry[] {
    const payload = this.read();
    try {
      const serialized = decrypt(payload.byProfile[profileId] ?? "");
      const parsed = JSON.parse(serialized) as SavedPasswordEntry[];
      return Array.isArray(parsed) ? parsed.sort((a, b) => b.updatedAt - a.updatedAt) : [];
    } catch {
      return [];
    }
  }

  save(profileId: string, input: Omit<SavedPasswordEntry, "createdAt" | "updatedAt"> & { createdAt?: number }): SavedPasswordEntry[] {
    const existing = this.list(profileId);
    const now = Date.now();
    const next = existing.some((entry) => entry.id === input.id)
      ? existing.map((entry) =>
        entry.id === input.id
          ? {
            ...entry,
            site: input.site,
            username: input.username,
            password: input.password,
            notes: input.notes,
            updatedAt: now
          }
          : entry
      )
      : [
        ...existing,
        {
          id: input.id,
          site: input.site,
          username: input.username,
          password: input.password,
          notes: input.notes,
          createdAt: input.createdAt ?? now,
          updatedAt: now
        }
      ];

    const payload = this.read();
    payload.byProfile[profileId] = encrypt(JSON.stringify(next));
    this.write(payload);
    return next.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  remove(profileId: string, id: string): SavedPasswordEntry[] {
    const existing = this.list(profileId).filter((entry) => entry.id !== id);
    const payload = this.read();
    payload.byProfile[profileId] = encrypt(JSON.stringify(existing));
    this.write(payload);
    return existing.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}
