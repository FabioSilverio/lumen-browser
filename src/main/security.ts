import { BrowserWindow, WebContents, app, dialog, session } from "electron";
import { PermissionAuditStore } from "./services/permission-audit-store";

const ALWAYS_ALLOW = new Set(["fullscreen", "clipboard-sanitized-write"]);
const PROMPT_ON_REQUEST = new Set(["notifications", "media", "geolocation", "midi", "pointerLock"]);
let sessionGuardsConfigured = false;

function isAllowedNavigationUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" || url === "about:blank";
  } catch {
    return false;
  }
}

function originHost(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
}

function normalizeOrigin(urlLike: string): string {
  try {
    return new URL(urlLike).origin;
  } catch {
    return urlLike;
  }
}

function configureSessionGuards(auditStore: PermissionAuditStore): void {
  if (sessionGuardsConfigured) {
    return;
  }
  sessionGuardsConfigured = true;

  const applyToSession = (current: Electron.Session) => {
    current.setPermissionRequestHandler((webContents, permission, callback, details) => {
      if (ALWAYS_ALLOW.has(permission)) {
        auditStore.record(details.requestingUrl || webContents.getURL(), permission, "allow_once");
        callback(true);
        return;
      }

      const target = details.requestingUrl || webContents.getURL();
      const normalizedOrigin = normalizeOrigin(target);
      const storedRule = auditStore.getRule(normalizedOrigin, permission);
      if (storedRule?.decision === "allow") {
        auditStore.record(normalizedOrigin, permission, "rule_allow");
        callback(true);
        return;
      }
      if (storedRule?.decision === "block") {
        auditStore.record(normalizedOrigin, permission, "rule_block");
        callback(false);
        return;
      }

      if (!PROMPT_ON_REQUEST.has(permission)) {
        auditStore.record(normalizedOrigin, permission, "block_once");
        callback(false);
        return;
      }

      const host = originHost(target);

      void dialog.showMessageBox({
        type: "question",
        buttons: ["Block", "Allow once", "Always allow", "Always block"],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
        title: "Permission request",
        message: `${host} is requesting "${permission}" access.`
      }).then((result) => {
        const response = result.response;
        if (response === 1) {
          auditStore.record(normalizedOrigin, permission, "allow_once");
          callback(true);
          return;
        }
        if (response === 2) {
          auditStore.setRule(normalizedOrigin, permission, "allow");
          auditStore.record(normalizedOrigin, permission, "allow_always");
          callback(true);
          return;
        }
        if (response === 3) {
          auditStore.setRule(normalizedOrigin, permission, "block");
          auditStore.record(normalizedOrigin, permission, "block_always");
          callback(false);
          return;
        }

        auditStore.record(normalizedOrigin, permission, "block_once");
        callback(false);
      }).catch(() => {
        auditStore.record(normalizedOrigin, permission, "block_once");
        callback(false);
      });
    });

    current.setPermissionCheckHandler((wc, permission, requestingOrigin) => {
      const origin = requestingOrigin || wc?.getURL() || "";
      const storedRule = auditStore.getRule(origin, permission);
      if (storedRule?.decision === "allow") {
        return true;
      }
      if (storedRule?.decision === "block") {
        return false;
      }
      return ALWAYS_ALLOW.has(permission);
    });
  };

  applyToSession(session.defaultSession);
  app.on("session-created", applyToSession);
}

function configureWebviewGuards(mainWindow: BrowserWindow): void {
  mainWindow.webContents.on("will-attach-webview", (event, webPreferences, params) => {
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    webPreferences.webSecurity = true;
    webPreferences.allowRunningInsecureContent = false;
    webPreferences.spellcheck = false;
    webPreferences.enableBlinkFeatures = "";

    const src = params.src ?? "about:blank";
    if (!isAllowedNavigationUrl(src)) {
      event.preventDefault();
    }
  });
}

function hardenAttachedWebContents(contents: WebContents): void {
  const blockUnsafeNavigation = (event: Electron.Event, url: string) => {
    if (!isAllowedNavigationUrl(url)) {
      event.preventDefault();
    }
  };

  contents.on("will-navigate", blockUnsafeNavigation);
  contents.on("will-redirect", blockUnsafeNavigation);
}

export function applyBrowserSecurity(mainWindow: BrowserWindow, auditStore: PermissionAuditStore): void {
  configureSessionGuards(auditStore);
  configureWebviewGuards(mainWindow);
  mainWindow.webContents.on("did-attach-webview", (_event, webContents) => {
    hardenAttachedWebContents(webContents);
  });
}

export { isAllowedNavigationUrl };
