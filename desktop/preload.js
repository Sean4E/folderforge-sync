// Preload script for FolderForge Sync Desktop Agent
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// specific IPC channels for secure communication with the main process
contextBridge.exposeInMainWorld('api', {
  // Configuration
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // Folder selection
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Directory scanning for import
  browseDirectory: () => ipcRenderer.invoke('browse-directory'),
  scanDirectory: (path) => ipcRenderer.invoke('scan-directory', path),

  // Connection
  testConnection: () => ipcRenderer.invoke('test-connection'),
  disconnect: () => ipcRenderer.invoke('disconnect'),

  // Window control
  closeWindow: () => ipcRenderer.invoke('close-settings-window'),

  // Events from main process
  onSyncStatus: (callback) => {
    ipcRenderer.on('sync-status', (event, status) => callback(status));
  },

  onNotification: (callback) => {
    ipcRenderer.on('notification', (event, data) => callback(data));
  },
});
