import { app, BrowserWindow, Menu, nativeTheme } from "electron";
import { join } from "node:path";
import { registerWindowIpc } from "./ipc/window-controls";
import { registerSystemIpc } from "./ipc/system";
import { registerAIIpc } from "./ipc/ai";
import { registerBrowserIpc } from "./ipc/browser";
import { registerExtensionsIpc } from "./ipc/extensions";
import { registerPasswordIpc } from "./ipc/passwords";
import { registerSecurityIpc } from "./ipc/security";
import { applyBrowserSecurity } from "./security";
import { PermissionAuditStore } from "./services/permission-audit-store";

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
type ShortcutAction =
  | "new_tab"
  | "close_tab"
  | "focus_url"
  | "toggle_palette"
  | "toggle_sidebar"
  | "toggle_theme"
  | "toggle_suspend"
  | "toggle_ai"
  | "group_tabs"
  | "toggle_task_manager"
  | "refresh_page"
  | "next_tab"
  | "prev_tab";

function mapInputToShortcut(input: Electron.Input): ShortcutAction | null {
  if (input.type !== "keyDown") {
    return null;
  }

  const key = (input.key ?? "").toLowerCase();
  const ctrl = Boolean(input.control);
  const shift = Boolean(input.shift);

  if (!ctrl) {
    return null;
  }

  if (key === "t" && shift) {
    return "toggle_task_manager";
  }
  if (key === "t") {
    return "new_tab";
  }
  if (key === "w") {
    return "close_tab";
  }
  if (key === "l") {
    return "focus_url";
  }
  if (key === "k") {
    return "toggle_palette";
  }
  if (key === "b") {
    return "toggle_sidebar";
  }
  if (key === "/" || key === "divide") {
    return "toggle_theme";
  }
  if (key === "s" && shift) {
    return "toggle_suspend";
  }
  if (key === "a" && shift) {
    return "toggle_ai";
  }
  if (key === "g" && shift) {
    return "group_tabs";
  }
  if (key === "tab" && shift) {
    return "prev_tab";
  }
  if (key === "tab") {
    return "next_tab";
  }
  if (key === "r" || key === "f5") {
    return "refresh_page";
  }

  return null;
}

function bindShortcutForwarding(mainWindow: BrowserWindow, contents: Electron.WebContents): void {
  contents.on("before-input-event", (event, input) => {
    const action = mapInputToShortcut(input);
    if (!action) {
      return;
    }
    event.preventDefault();
    mainWindow.webContents.send("app:shortcut", { action });
  });
}

function configurePerformance(): void {
  app.commandLine.appendSwitch("disable-features", "BackForwardCache,Prerender2");
  app.commandLine.appendSwitch("enable-features", "CanvasOopRasterization");
  app.commandLine.appendSwitch("js-flags", "--max-old-space-size=128");
}

function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1080,
    minHeight: 700,
    frame: false,
    backgroundColor: "#FAFAFA",
    show: false,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
      backgroundThrottling: true,
      spellcheck: false
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("maximize", () => {
    mainWindow.webContents.send("window:maximized", true);
  });

  mainWindow.on("unmaximize", () => {
    mainWindow.webContents.send("window:maximized", false);
  });

  if (isDev) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(join(app.getAppPath(), "dist/renderer/index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    mainWindow.webContents.send("browser:new-tab-requested", { url });
    return { action: "deny" };
  });
  bindShortcutForwarding(mainWindow, mainWindow.webContents);

  mainWindow.webContents.on("did-attach-webview", (_event, webContents) => {
    bindShortcutForwarding(mainWindow, webContents);

    webContents.setWindowOpenHandler(({ url }) => {
      mainWindow.webContents.send("browser:new-tab-requested", { url });
      return { action: "deny" };
    });

    webContents.on("context-menu", (_contextEvent, params) => {
      const selectedText = params.selectionText?.trim() ?? "";
      if (!selectedText) {
        return;
      }

      const menu = Menu.buildFromTemplate([
        {
          label: "Ask AI about this",
          click: () => {
            mainWindow.webContents.send("ai:context-action", {
              action: "ask",
              text: selectedText
            });
          }
        },
        {
          label: "Summarize selection",
          click: () => {
            mainWindow.webContents.send("ai:context-action", {
              action: "summarize",
              text: selectedText
            });
          }
        },
        {
          label: "Explain simply",
          click: () => {
            mainWindow.webContents.send("ai:context-action", {
              action: "eli5",
              text: selectedText
            });
          }
        },
        {
          label: "Translate to English",
          click: () => {
            mainWindow.webContents.send("ai:context-action", {
              action: "translate:English",
              text: selectedText
            });
          }
        },
        {
          label: "Rewrite",
          click: () => {
            mainWindow.webContents.send("ai:context-action", {
              action: "rewrite",
              text: selectedText
            });
          }
        },
        {
          label: "Search this selection with AI",
          click: () => {
            mainWindow.webContents.send("ai:context-action", {
              action: "search_selection",
              text: selectedText
            });
          }
        }
      ]);

      menu.popup({ window: mainWindow });
    });
  });

  return mainWindow;
}

async function bootstrap(): Promise<void> {
  configurePerformance();
  await app.whenReady();

  nativeTheme.themeSource = "light";
  const permissionAuditStore = new PermissionAuditStore();

  const mainWindow = createMainWindow();
  applyBrowserSecurity(mainWindow, permissionAuditStore);

  registerWindowIpc(mainWindow);
  registerSystemIpc();
  registerBrowserIpc();
  registerExtensionsIpc();
  registerPasswordIpc();
  registerSecurityIpc(permissionAuditStore);
  registerAIIpc(mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const window = createMainWindow();
      applyBrowserSecurity(window, permissionAuditStore);
      registerWindowIpc(window);
      registerAIIpc(window);
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}

void bootstrap();
