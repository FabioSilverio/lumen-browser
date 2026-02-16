import { BrowserWindow, ipcMain } from "electron";

export function registerWindowIpc(mainWindow: BrowserWindow): void {
  ipcMain.handle("window:minimize", () => {
    mainWindow.minimize();
  });

  ipcMain.handle("window:toggle-maximize", () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    }

    mainWindow.maximize();
    return true;
  });

  ipcMain.handle("window:close", () => {
    mainWindow.close();
  });

  ipcMain.handle("window:is-maximized", () => {
    return mainWindow.isMaximized();
  });
}