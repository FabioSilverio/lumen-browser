import { BrowserWindow, WebContents, app, dialog, session } from "electron";

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

function configureSessionGuards(): void {
  if (sessionGuardsConfigured) {
    return;
  }
  sessionGuardsConfigured = true;

  const applyToSession = (current: Electron.Session) => {
    current.setPermissionRequestHandler((webContents, permission, callback, details) => {
      if (ALWAYS_ALLOW.has(permission)) {
        callback(true);
        return;
      }

      if (!PROMPT_ON_REQUEST.has(permission)) {
        callback(false);
        return;
      }

      const target = details.requestingUrl || webContents.getURL();
      const host = originHost(target);

      void dialog.showMessageBox({
        type: "question",
        buttons: ["Block", "Allow once"],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
        title: "Permission request",
        message: `${host} is requesting "${permission}" access.`
      }).then((result) => {
        callback(result.response === 1);
      }).catch(() => {
        callback(false);
      });
    });

    current.setPermissionCheckHandler((_wc, permission) => {
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

export function applyBrowserSecurity(mainWindow: BrowserWindow): void {
  configureSessionGuards();
  configureWebviewGuards(mainWindow);
  mainWindow.webContents.on("did-attach-webview", (_event, webContents) => {
    hardenAttachedWebContents(webContents);
  });
}

export { isAllowedNavigationUrl };
