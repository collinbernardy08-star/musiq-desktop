const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings) => ipcRenderer.invoke('set-settings', settings),

  // Auth / Session
  getSession: () => ipcRenderer.invoke('get-session'),
  setSession: (session) => ipcRenderer.invoke('set-session', session),
  logout: () => ipcRenderer.invoke('logout'),

  // Tracking
  getCurrentTrack: () => ipcRenderer.invoke('get-current-track'),
  getStats: () => ipcRenderer.invoke('get-stats'),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Misc
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),

  // Events from main process
  onTrackChanged: (callback) => {
    ipcRenderer.on('track-changed', (_, track) => callback(track));
    return () => ipcRenderer.removeAllListeners('track-changed');
  },
  onStatsUpdated: (callback) => {
    ipcRenderer.on('stats-updated', (_, stats) => callback(stats));
    return () => ipcRenderer.removeAllListeners('stats-updated');
  },
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('update-status');
  },
});
