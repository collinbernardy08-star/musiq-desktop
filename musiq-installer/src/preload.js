const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('installer', {
  startInstall: (opts) => ipcRenderer.invoke('start-install', opts),
  getDefaultInstallDir: () => ipcRenderer.invoke('get-default-install-dir'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  launchApp: (dir) => ipcRenderer.invoke('launch-app', dir),
  onProgress: (cb) => {
    ipcRenderer.on('install-progress', (_, pct) => cb(pct));
    return () => ipcRenderer.removeAllListeners('install-progress');
  },
});
