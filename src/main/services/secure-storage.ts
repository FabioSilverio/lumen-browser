import { app, safeStorage } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { AIProvider } from "../ai/types";

interface SecretsShape {
  apiKeys: Partial<Record<AIProvider, string>>;
}

const EMPTY: SecretsShape = { apiKeys: {} };

export class SecureStorage {
  private readonly path = join(app.getPath("userData"), "secrets.json");

  private read(): SecretsShape {
    if (!existsSync(this.path)) {
      return EMPTY;
    }

    try {
      const raw = JSON.parse(readFileSync(this.path, "utf-8")) as SecretsShape;
      return { ...EMPTY, ...raw };
    } catch {
      return EMPTY;
    }
  }

  private write(value: SecretsShape): void {
    const folder = dirname(this.path);
    if (!existsSync(folder)) {
      mkdirSync(folder, { recursive: true });
    }

    writeFileSync(this.path, JSON.stringify(value, null, 2), "utf-8");
  }

  setAPIKey(provider: AIProvider, key: string): void {
    const payload = this.read();
    payload.apiKeys[provider] = this.encrypt(key);
    this.write(payload);
  }

  getAPIKey(provider: AIProvider): string {
    const payload = this.read();
    const encrypted = payload.apiKeys[provider];
    if (!encrypted) {
      return "";
    }

    return this.decrypt(encrypted);
  }

  hasAPIKey(provider: AIProvider): boolean {
    return Boolean(this.getAPIKey(provider));
  }

  private encrypt(value: string): string {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(value).toString("base64");
    }

    return Buffer.from(value, "utf-8").toString("base64");
  }

  private decrypt(value: string): string {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(value, "base64"));
    }

    return Buffer.from(value, "base64").toString("utf-8");
  }
}