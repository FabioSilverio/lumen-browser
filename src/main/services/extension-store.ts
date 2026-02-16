import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

interface ExtensionStorePayload {
  unpackedPaths: string[];
}

const DEFAULT_PAYLOAD: ExtensionStorePayload = {
  unpackedPaths: []
};

export class ExtensionStore {
  private readonly path = join(app.getPath("userData"), "extensions.json");

  read(): ExtensionStorePayload {
    try {
      if (!existsSync(this.path)) {
        return DEFAULT_PAYLOAD;
      }

      const raw = readFileSync(this.path, "utf-8");
      const parsed = JSON.parse(raw) as Partial<ExtensionStorePayload>;
      return {
        unpackedPaths: Array.isArray(parsed.unpackedPaths)
          ? parsed.unpackedPaths.filter((value): value is string => typeof value === "string")
          : []
      };
    } catch {
      return DEFAULT_PAYLOAD;
    }
  }

  write(payload: ExtensionStorePayload): void {
    const folder = dirname(this.path);
    if (!existsSync(folder)) {
      mkdirSync(folder, { recursive: true });
    }

    writeFileSync(this.path, JSON.stringify(payload, null, 2), "utf-8");
  }
}

export type { ExtensionStorePayload };
