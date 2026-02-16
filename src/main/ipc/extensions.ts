import { dialog, ipcMain, session } from "electron";
import { ExtensionStore } from "../services/extension-store";

interface ExtensionDTO {
  id: string;
  name: string;
  version: string;
  description: string;
  path: string;
}

function profilePartition(profileId: string): string {
  return `persist:lumen-profile-${profileId}`;
}

function toDTO(profileId: string): ExtensionDTO[] {
  const ses = session.fromPartition(profilePartition(profileId));
  const entries = Object.values(ses.getAllExtensions());
  return entries
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      version: entry.version,
      description: ((entry as unknown as { manifest?: { description?: string } }).manifest?.description ?? ""),
      path: entry.path
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function ensureLoaded(profileId: string, paths: string[]): Promise<number> {
  const ses = session.fromPartition(profilePartition(profileId));
  let loaded = 0;

  for (const unpackedPath of paths) {
    try {
      const existing = Object.values(ses.getAllExtensions()).find((entry) => entry.path === unpackedPath);
      if (existing) {
        continue;
      }

      await ses.loadExtension(unpackedPath, {
        allowFileAccess: true
      });
      loaded += 1;
    } catch {
      // Skip invalid or already loaded extensions and continue loading others.
    }
  }

  return loaded;
}

export function registerExtensionsIpc(): void {
  const store = new ExtensionStore();

  ipcMain.handle("extensions:activate-profile", async (_, profileId: string) => {
    const payload = store.read();
    const loaded = await ensureLoaded(profileId, payload.unpackedPaths);
    return { loaded };
  });

  ipcMain.handle("extensions:list", async (_, profileId: string) => {
    const payload = store.read();
    await ensureLoaded(profileId, payload.unpackedPaths);
    return toDTO(profileId);
  });

  ipcMain.handle("extensions:pick-and-install", async (_, profileId: string) => {
    const picked = await dialog.showOpenDialog({
      title: "Select unpacked extension folder",
      properties: ["openDirectory"]
    });

    if (picked.canceled || picked.filePaths.length === 0) {
      return toDTO(profileId);
    }

    const unpackedPath = picked.filePaths[0];
    if (!unpackedPath) {
      return toDTO(profileId);
    }
    const payload = store.read();
    const nextPaths = [...new Set([...payload.unpackedPaths, unpackedPath])];
    store.write({ unpackedPaths: nextPaths });

    await ensureLoaded(profileId, [unpackedPath]);
    return toDTO(profileId);
  });

  ipcMain.handle("extensions:remove", async (_, payload: { profileId: string; extensionId: string }) => {
    const ses = session.fromPartition(profilePartition(payload.profileId));
    const found = ses.getExtension(payload.extensionId);

    if (found) {
      try {
        ses.removeExtension(payload.extensionId);
      } catch {
        // Continue and keep storage consistent.
      }
    }

    const saved = store.read();
    const removePath = found?.path;
    if (removePath) {
      store.write({
        unpackedPaths: saved.unpackedPaths.filter((entry) => entry !== removePath)
      });
    }

    return toDTO(payload.profileId);
  });
}
