const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ddns', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),
  getStatus: () => ipcRenderer.invoke('get-status'),
  checkNow: () => ipcRenderer.invoke('check-now'),
  pingServer: () => ipcRenderer.invoke('ping-server'),
  pingInternet: () => ipcRenderer.invoke('ping-internet'),
  onStatusUpdate: (callback) => {
    ipcRenderer.on('status-update', (_event, data) => callback(data));
  },
});
