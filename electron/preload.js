const { contextBridge, ipcRenderer, webFrame } = require("electron");

// Detect Wine environment locally without blocking synchronous IPC
const isWine = Object.keys(process.env).some(key => key.toUpperCase().startsWith("WINE")) || 
               (process.env.PATH && process.env.PATH.includes("/.wine")) ||
               !!process.env.PORTPROTON ||
               !!process.env.WINEPREFIX ||
               !!process.env.WINELOADER;

// Expose safe, isolated Electron API to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,
  isWine: !!isWine,
  minimizeWindow: () => ipcRenderer.send("window-minimize"),
  maximizeWindow: () => ipcRenderer.send("window-maximize"),
  closeWindow: () => ipcRenderer.send("window-close"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  isMaximized: () => ipcRenderer.invoke("is-maximized"),
  checkServerHealth: () => ipcRenderer.invoke("check-server-health"),
  getZoomLevel: () => webFrame.getZoomLevel(),
  setZoomLevel: (level) => webFrame.setZoomLevel(level),

  // Auto-update: main process fires this when user clicked "Later" on the dialog.
  // `callback` receives the new version string e.g. "1.1.0"
  onUpdateDeferred: (callback) => {
    const handler = (_event, version) => callback(version);
    ipcRenderer.on("update-deferred", handler);
    return () => ipcRenderer.removeListener("update-deferred", handler);
  },
  onUpdateProgress: (callback) => {
    const handler = (_event, percent) => callback(percent);
    ipcRenderer.on("update-progress", handler);
    return () => ipcRenderer.removeListener("update-progress", handler);
  },
  onUpdateReady: (callback) => {
    const handler = (_event, version) => callback(version);
    ipcRenderer.on("update-ready", handler);
    return () => ipcRenderer.removeListener("update-ready", handler);
  },
  installUpdate: () => ipcRenderer.send("install-update"),

  // Server and database status APIs
  getServerStatus: () => ipcRenderer.invoke("get-server-status"),
  getMigrationStatus: () => ipcRenderer.invoke("get-migration-status"),
  onServerStatus: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on("server-status", handler);
    return () => ipcRenderer.removeListener("server-status", handler);
  },
  onMigrationStatus: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on("migration-status", handler);
    return () => ipcRenderer.removeListener("migration-status", handler);
  },

  // OS Dialog wrappers
  showOpenDialog: (options) => ipcRenderer.invoke("dialog-show-open-dialog", options),
  showSaveDialog: (options) => ipcRenderer.invoke("dialog-show-save-dialog", options),
  showMessageBox: (options) => ipcRenderer.invoke("dialog-show-message-box", options),

  // Synchronous dialog triggers for window.alert and window.confirm
  showAlert: (message) => ipcRenderer.sendSync("window-alert", message),
  showConfirm: (message) => ipcRenderer.sendSync("window-confirm", message),

  // Spawn modal child windows
  createModalWindow: (url, options) => ipcRenderer.invoke("create-modal-window", url, options),
});
