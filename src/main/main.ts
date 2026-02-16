import { app, BrowserWindow, Menu, nativeTheme } from "electron";
import { join } from "node:path";
import { registerWindowIpc } from "./ipc/window-controls";
import { registerSystemIpc } from "./ipc/system";
import { registerAIIpc } from "./ipc/ai";

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

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
    void mainWindow.loadFile(join(process.cwd(), "dist/renderer/index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    mainWindow.webContents.send("browser:new-tab-requested", { url });
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-attach-webview", (_event, webContents) => {
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

  const mainWindow = createMainWindow();

  registerWindowIpc(mainWindow);
  registerSystemIpc();
  registerAIIpc(mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const window = createMainWindow();
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
