import { app, dialog, ipcMain, session } from "electron";
import { Dirent, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import AdmZip from "adm-zip";
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

function extensionRoot(): string {
  const root = join(app.getPath("userData"), "extensions-cache");
  mkdirSync(root, { recursive: true });
  return root;
}

function extractIdFromWebStoreUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const byQuery = parsed.searchParams.get("id")?.toLowerCase() ?? "";
    if (/^[a-p]{32}$/.test(byQuery)) {
      return byQuery;
    }

    const segments = parsed.pathname
      .split("/")
      .map((segment) => decodeURIComponent(segment).trim().toLowerCase())
      .filter(Boolean);
    const strictSegment = segments.find((segment) => /^[a-p]{32}$/.test(segment));
    if (strictSegment) {
      return strictSegment;
    }
  } catch {
    // fall through to regex fallback
  }

  const allMatches = [...url.toLowerCase().matchAll(/[a-p]{32}/g)].map((match) => match[0]);
  return allMatches[allMatches.length - 1] ?? null;
}

function crxToZipBuffer(buffer: Buffer): Buffer {
  if (buffer.length < 16 || buffer.slice(0, 4).toString("ascii") !== "Cr24") {
    throw new Error("Invalid CRX file");
  }

  const version = buffer.readUInt32LE(4);
  if (version === 2) {
    const pubKeyLength = buffer.readUInt32LE(8);
    const sigLength = buffer.readUInt32LE(12);
    const zipStart = 16 + pubKeyLength + sigLength;
    return buffer.slice(zipStart);
  }

  if (version === 3) {
    const headerLength = buffer.readUInt32LE(8);
    const zipStart = 12 + headerLength;
    return buffer.slice(zipStart);
  }

  throw new Error(`Unsupported CRX version: ${version}`);
}

function unpackZipToExtensionFolder(zipBuffer: Buffer, extensionIdHint: string): string {
  const folder = join(extensionRoot(), `${extensionIdHint}-${Date.now()}`);
  mkdirSync(folder, { recursive: true });
  const zip = new AdmZip(zipBuffer);
  zip.extractAllTo(folder, true);
  return folder;
}

function hasManifest(path: string): boolean {
  return existsSync(join(path, "manifest.json"));
}

function findManifestRoot(root: string): string {
  if (hasManifest(root)) {
    return root;
  }

  const queue: Array<{ path: string; depth: number }> = [{ path: root, depth: 0 }];
  const maxDepth = 4;
  while (queue.length) {
    const current = queue.shift();
    if (!current || current.depth >= maxDepth) {
      continue;
    }

    let entries: Dirent[] = [];
    try {
      entries = readdirSync(current.path, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (entry.name === "__MACOSX" || entry.name.startsWith(".")) {
        continue;
      }

      const nextPath = join(current.path, entry.name);
      if (hasManifest(nextPath)) {
        return nextPath;
      }
      queue.push({ path: nextPath, depth: current.depth + 1 });
    }
  }

  throw new Error("No manifest.json found in extension package");
}

function removeExtensionPath(path: string): void {
  const cacheRoot = extensionRoot();
  if (!path.toLowerCase().startsWith(cacheRoot.toLowerCase())) {
    return;
  }

  let current = path;
  let parent = dirname(current);

  while (parent && parent !== current) {
    if (parent === cacheRoot) {
      rmSync(current, { recursive: true, force: true });
      return;
    }
    current = parent;
    parent = dirname(current);
  }
}

async function downloadWebStoreCrx(extensionId: string): Promise<Buffer> {
  const endpoints = [
    `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=132.0.6834.110&acceptformat=crx3,crx2&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`,
    `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=131.0.6778.86&acceptformat=crx3,crx2&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`,
    `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=133.0.6943.142&acceptformat=crx3,crx2&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`,
    `https://clients2.google.com/service/update2/crx?response=redirect&os=win&arch=x64&os_arch=x86_64&prod=chromium&prodchannel=stable&prodversion=132.0.6834.110&acceptformat=crx3,crx2&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`,
    `https://clients2.google.com/service/update2/crx?response=redirect&prod=chromecrx&prodchannel=unknown&prodversion=133.0.6943.142&acceptformat=crx3,crx2&x=id%3D${extensionId}%26uc`
  ];

  let lastError = "Unknown failure";

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
          Accept: "application/x-chrome-extension,application/octet-stream,*/*"
        },
        redirect: "follow",
        signal: AbortSignal.timeout(45_000)
      });

      if (!response.ok) {
        lastError = `Web Store download failed (${response.status})`;
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length < 4) {
        lastError = "Web Store returned empty extension package";
        continue;
      }

      // Valid CRX header
      if (buffer.slice(0, 4).toString("ascii") === "Cr24") {
        return buffer;
      }

      // ZIP payload (some mirrors can return unpacked zip)
      if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
        return buffer;
      }

      const snippet = buffer.slice(0, 180).toString("utf-8").replace(/\s+/g, " ").trim();
      lastError = snippet ? `Unexpected payload from Web Store: ${snippet}` : "Unexpected payload from Web Store";
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Network error while downloading extension";
    }
  }

  throw new Error(lastError);
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

async function ensureLoaded(profileId: string, paths: string[]): Promise<{
  loaded: number;
  failures: Array<{ path: string; reason: string }>;
}> {
  const ses = session.fromPartition(profilePartition(profileId));
  let loaded = 0;
  const failures: Array<{ path: string; reason: string }> = [];

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
    } catch (error) {
      failures.push({
        path: unpackedPath,
        reason: error instanceof Error ? error.message : "Unknown load failure"
      });
    }
  }

  return { loaded, failures };
}

function profilePaths(store: ExtensionStore, profileId: string): string[] {
  const payload = store.read();
  return payload.byProfile[profileId] ?? payload.byProfile.default ?? [];
}

function saveProfilePaths(store: ExtensionStore, profileId: string, paths: string[]): void {
  const payload = store.read();
  payload.byProfile[profileId] = paths;
  store.write(payload);
}

export function registerExtensionsIpc(): void {
  const store = new ExtensionStore();

  ipcMain.handle("extensions:activate-profile", async (_, profileId: string) => {
    const { loaded } = await ensureLoaded(profileId, profilePaths(store, profileId));
    return { loaded };
  });

  ipcMain.handle("extensions:list", async (_, profileId: string) => {
    await ensureLoaded(profileId, profilePaths(store, profileId));
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

    const selectedPath = picked.filePaths[0];
    if (!selectedPath) {
      return toDTO(profileId);
    }
    const loadPath = findManifestRoot(selectedPath);
    const nextPaths = [...new Set([...profilePaths(store, profileId), loadPath])];
    saveProfilePaths(store, profileId, nextPaths);

    const result = await ensureLoaded(profileId, [loadPath]);
    if (!result.loaded) {
      throw new Error(result.failures[0]?.reason ?? "Could not load extension.");
    }
    return toDTO(profileId);
  });

  ipcMain.handle("extensions:import-crx", async (_, profileId: string) => {
    const picked = await dialog.showOpenDialog({
      title: "Import extension CRX/ZIP",
      properties: ["openFile"],
      filters: [{ name: "Extensions", extensions: ["crx", "zip"] }]
    });

    if (picked.canceled || picked.filePaths.length === 0) {
      return toDTO(profileId);
    }

    const path = picked.filePaths[0];
    if (!path) {
      return toDTO(profileId);
    }
    const source = readFileSync(path);
    const isZipPayload = source[0] === 0x50 && source[1] === 0x4b;
    const zipBuffer = path.toLowerCase().endsWith(".zip") || isZipPayload ? source : crxToZipBuffer(source);
    const unpackedPath = unpackZipToExtensionFolder(zipBuffer, "imported");
    const loadPath = findManifestRoot(unpackedPath);
    const nextPaths = [...new Set([...profilePaths(store, profileId), loadPath])];
    saveProfilePaths(store, profileId, nextPaths);
    const result = await ensureLoaded(profileId, [loadPath]);
    if (result.loaded < 1) {
      removeExtensionPath(unpackedPath);
      throw new Error(result.failures[0]?.reason ?? "Imported extension could not be loaded.");
    }

    return toDTO(profileId);
  });

  ipcMain.handle("extensions:install-from-web-store", async (_, payload: { profileId: string; storeUrl: string }) => {
    const extensionId = extractIdFromWebStoreUrl(payload.storeUrl);
    if (!extensionId) {
      throw new Error("Could not find Chrome Web Store extension id in URL.");
    }

    const crxBuffer = await downloadWebStoreCrx(extensionId);
    const debugCrxPath = join(extensionRoot(), `${extensionId}-${Date.now()}.crx`);
    writeFileSync(debugCrxPath, crxBuffer);
    const isZipPayload = crxBuffer[0] === 0x50 && crxBuffer[1] === 0x4b;
    const zipBuffer = isZipPayload ? crxBuffer : crxToZipBuffer(crxBuffer);
    const unpackedPath = unpackZipToExtensionFolder(zipBuffer, extensionId);
    const loadPath = findManifestRoot(unpackedPath);

    const nextPaths = [...new Set([...profilePaths(store, payload.profileId), loadPath])];
    saveProfilePaths(store, payload.profileId, nextPaths);

    try {
      const result = await ensureLoaded(payload.profileId, [loadPath]);
      if (result.loaded < 1) {
        throw new Error(result.failures[0]?.reason ?? "Extension package extracted but failed to load.");
      }
    } catch (error) {
      removeExtensionPath(unpackedPath);
      throw new Error(error instanceof Error ? error.message : "Extension downloaded but failed to load.");
    }

    return toDTO(payload.profileId);
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

    const removePath = found?.path?.trim();
    if (removePath) {
      const nextPaths = profilePaths(store, payload.profileId).filter((entry) => entry !== removePath);
      saveProfilePaths(store, payload.profileId, nextPaths);
      removeExtensionPath(removePath);
    }

    return toDTO(payload.profileId);
  });
}
