import { contextBridge, ipcRenderer } from "electron";
import { ChatRequest } from "./ai/types";

const api = {
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    toggleMaximize: () => ipcRenderer.invoke("window:toggle-maximize"),
    close: () => ipcRenderer.invoke("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:is-maximized"),
    onMaximizedChange: (listener: (maximized: boolean) => void) => {
      const wrapped = (_event: unknown, maximized: boolean) => listener(maximized);
      ipcRenderer.on("window:maximized", wrapped);
      return () => ipcRenderer.removeListener("window:maximized", wrapped);
    }
  },
  system: {
    metrics: () => ipcRenderer.invoke("system:metrics")
  },
  ai: {
    getConfig: () => ipcRenderer.invoke("ai:get-config"),
    saveConfig: (payload: unknown) => ipcRenderer.invoke("ai:save-config", payload),
    testConnection: (provider: string) => ipcRenderer.invoke("ai:test-connection", provider),
    startChat: (request: ChatRequest) => ipcRenderer.invoke("ai:start-chat", request),
    cancelChat: (requestId: string) => ipcRenderer.invoke("ai:cancel-chat", requestId),
    onStream: (listener: (event: unknown) => void) => {
      const wrapped = (_event: unknown, payload: unknown) => listener(payload);
      ipcRenderer.on("ai:stream", wrapped);
      return () => ipcRenderer.removeListener("ai:stream", wrapped);
    },
    onContextAction: (listener: (event: unknown) => void) => {
      const wrapped = (_event: unknown, payload: unknown) => listener(payload);
      ipcRenderer.on("ai:context-action", wrapped);
      return () => ipcRenderer.removeListener("ai:context-action", wrapped);
    }
  },
  browser: {
    getAddressSuggestions: (query: string) => ipcRenderer.invoke("browser:get-address-suggestions", query),
    onNewTabRequested: (listener: (payload: { url: string }) => void) => {
      const wrapped = (_event: unknown, payload: { url: string }) => listener(payload);
      ipcRenderer.on("browser:new-tab-requested", wrapped);
      return () => ipcRenderer.removeListener("browser:new-tab-requested", wrapped);
    }
  },
  extensions: {
    activateProfile: (profileId: string) => ipcRenderer.invoke("extensions:activate-profile", profileId),
    list: (profileId: string) => ipcRenderer.invoke("extensions:list", profileId),
    pickAndInstall: (profileId: string) => ipcRenderer.invoke("extensions:pick-and-install", profileId),
    remove: (profileId: string, extensionId: string) => ipcRenderer.invoke("extensions:remove", { profileId, extensionId })
  }
};

contextBridge.exposeInMainWorld("lumen", api);
