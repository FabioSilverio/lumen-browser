import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

interface ExtensionStorePayload {
  byProfile: Record<string, string[]>;
}

const DEFAULT_PAYLOAD: ExtensionStorePayload = {
  byProfile: {}
};

export class ExtensionStore {
  private readonly path = join(app.getPath("userData"), "extensions.json");

  read(): ExtensionStorePayload {
    try {
      if (!existsSync(this.path)) {
        return DEFAULT_PAYLOAD;
      }

      const raw = readFileSync(this.path, "utf-8");
      const parsed = JSON.parse(raw) as Partial<ExtensionStorePayload & { unpackedPaths?: string[] }>;
      if (Array.isArray(parsed.unpackedPaths)) {
        return {
          byProfile: {
            default: parsed.unpackedPaths.filter((value): value is string => typeof value === "string")
          }
        };
      }

      const byProfile = parsed.byProfile ?? {};
      return {
        byProfile: Object.fromEntries(
          Object.entries(byProfile).map(([profileId, values]) => [
            profileId,
            Array.isArray(values) ? values.filter((value): value is string => typeof value === "string") : []
          ])
        )
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
