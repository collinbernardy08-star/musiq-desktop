const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, Notification } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { setupAutostart } = require('./autostart');
const { startTracker, stopTracker } = require('./tracker');
const { initDiscordRPC, updateDiscordRPC, destroyDiscordRPC } = require('./discord-rpc');
const { startThemeSync, stopThemeSync } = require('./theme-sync');
const { autoUpdater } = require('electron-updater');

const store = new Store();
const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;
let tray = null;
let isQuitting = false;

const DEFAULT_SETTINGS = {
  autostart: false,
  minimizeToTray: true,
  trackingInterval: 30,
  realtimeTracking: true,
  discordRPC: true,
  discordShowAlbum: true,
  discordShowProgress: true,
  notifications: true,
  theme: 'dark',
  language: 'de',
};

function getSettings() {
  return { ...DEFAULT_SETTINGS, ...store.get('settings', {}) };
}

// ─── Session expired ──────────────────────────────────────────────────────────
function onSessionExpired() {
  console.log('[Main] Session expired');
  store.delete('session');
  store.delete('currentTrack');
  stopTracker();
  stopThemeSync();
  destroyDiscordRPC();
  updateTrayMenu(null);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('session-expired');
  }
}

// ─── Theme change ─────────────────────────────────────────────────────────────
function onThemeChange(theme) {
  console.log(`[Main] Theme changed: ${theme.themeId}`);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('theme-changed', theme);
  }
}

// ─── Auto Updater ─────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  if (isDev) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.allowPrerelease = false;
  autoUpdater.verifyUpdateCodeSignature = () => Promise.resolve(undefined);

  autoUpdater.on('checking-for-update', () => sendUpdateStatus({ status: 'checking' }));
  autoUpdater.on('update-available', (info) => sendUpdateStatus({ status: 'available', version: info.version }));
  autoUpdater.on('update-not-available', () => sendUpdateStatus({ status: 'not-available' }));
  autoUpdater.on('error', (err) => {
    console.error('[Updater]', err.message);
    sendUpdateStatus({ status: 'error', message: err.message });
  });
  autoUpdater.on('download-progress', (p) => sendUpdateStatus({
    status: 'downloading',
    percent: Math.round(p.percent),
    transferred: p.transferred,
    total: p.total,
  }));
  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({ status: 'downloaded', version: info.version });
    if (Notification.isSupported()) {
      new Notification({
        title: 'Update bereit',
        body: `Version ${info.version} bereit. Neu starten zum Installieren.`,
        icon: path.join(__dirname, '../../assets/icon.png'),
        silent: false,
      }).show();
    }
  });
}

function sendUpdateStatus(data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', data);
  }
}

// ─── Window ──────────────────────────────────────────────────────────────────
function createWindow() {
  const { width, height } = store.get('windowBounds', { width: 900, height: 650 });

  mainWindow = new BrowserWindow({
    width, height,
    minWidth: 750,
    minHeight: 550,
    frame: false,
    transparent: false,
    backgroundColor: '#0f0f0f',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0f0f0f', symbolColor: '#ffffff', height: 36 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false,
  });

  if (isDev) mainWindow.loadURL('http://localhost:5173');
  else mainWindow.loadFile(path.join(__dirname, '../../src/renderer/dist/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    const session = store.get('session');
    if (session) {
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('session-restored', session);
      });
    }
  });

  mainWindow.on('resize', () => {
    if (!mainWindow.isMaximized()) store.set('windowBounds', mainWindow.getBounds());
  });
  mainWindow.on('close', (e) => {
    if (!isQuitting && getSettings().minimizeToTray) { e.preventDefault(); mainWindow.hide(); }
  });
}

// ─── Tray ─────────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  updateTrayMenu();
  tray.setToolTip('Mus-IQ');
  tray.on('click', () => {
    if (mainWindow.isVisible()) mainWindow.hide();
    else { mainWindow.show(); mainWindow.focus(); }
  });
}

function updateTrayMenu(currentTrack = null) {
  const trackLabel = currentTrack
    ? `▶ ${currentTrack.name} – ${currentTrack.artist}`
    : '⏸ Nichts läuft gerade';

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Mus-IQ', enabled: false },
    { type: 'separator' },
    { label: trackLabel, enabled: false },
    { type: 'separator' },
    { label: 'Öffnen', click: () => { mainWindow.show(); mainWindow.focus(); } },
    {
      label: 'Tracking pausieren', type: 'checkbox', checked: store.get('trackingPaused', false),
      click: (item) => {
        store.set('trackingPaused', item.checked);
        if (item.checked) stopTracker();
        else startTracker(getSettings(), onTrackChange, onSessionExpired);
      },
    },
    { type: 'separator' },
    {
      label: 'Auf Updates prüfen', click: () => {
        mainWindow.show(); mainWindow.focus();
        if (!isDev) autoUpdater.checkForUpdates().catch(console.error);
      },
    },
    { type: 'separator' },
    { label: 'Beenden', click: () => { isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(contextMenu);
}

// ─── Track Change ─────────────────────────────────────────────────────────────
function onTrackChange(track) {
  updateTrayMenu(track);
  const settings = getSettings();
  if (settings.discordRPC) updateDiscordRPC(track, settings);
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('track-changed', track);
  if (settings.notifications && track && Notification.isSupported()) {
    new Notification({
      title: track.name,
      body: `${track.artist} · ${track.album}`,
      icon: track.albumArt || path.join(__dirname, '../../assets/icon.png'),
      silent: true,
    }).show();
  }
}

// ─── IPC ─────────────────────────────────────────────────────────────────────
ipcMain.handle('get-settings', () => getSettings());
ipcMain.handle('set-settings', (_, newSettings) => {
  const updated = { ...getSettings(), ...newSettings };
  store.set('settings', updated);
  if ('autostart' in newSettings) setupAutostart(newSettings.autostart);
  if ('discordRPC' in newSettings) {
    if (newSettings.discordRPC) initDiscordRPC().catch(() => {});
    else destroyDiscordRPC();
  }
  if ('trackingInterval' in newSettings || 'realtimeTracking' in newSettings) {
    stopTracker();
    startTracker(updated, onTrackChange, onSessionExpired);
  }
  return updated;
});

ipcMain.handle('get-session', () => store.get('session', null));
ipcMain.handle('set-session', async (_, session) => {
  store.set('session', session);
  if (session) {
    const settings = getSettings();
    startTracker(settings, onTrackChange, onSessionExpired);
    startThemeSync(session, onThemeChange);
    if (settings.discordRPC) initDiscordRPC().catch(() => {});
  } else {
    stopTracker();
    stopThemeSync();
    destroyDiscordRPC();
  }
});
ipcMain.handle('logout', () => {
  store.delete('session');
  store.delete('currentTrack');
  stopTracker();
  stopThemeSync();
  destroyDiscordRPC();
  updateTrayMenu(null);
});
ipcMain.handle('get-current-track', () => store.get('currentTrack', null));
ipcMain.handle('get-stats', () => store.get('localStats', { tracksToday: 0, minutesToday: 0, sessionsTotal: 0 }));
ipcMain.handle('open-external', (_, url) => shell.openExternal(url));
ipcMain.handle('minimize-window', () => mainWindow?.minimize());
ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('close-window', () => {
  if (getSettings().minimizeToTray) mainWindow?.hide();
  else { isQuitting = true; app.quit(); }
});
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('check-for-updates', async () => {
  if (isDev) { sendUpdateStatus({ status: 'not-available' }); return; }
  try { await autoUpdater.checkForUpdates(); }
  catch (err) { sendUpdateStatus({ status: 'error', message: err.message }); }
});
ipcMain.handle('download-update', () => {
  autoUpdater.downloadUpdate().catch((err) => sendUpdateStatus({ status: 'error', message: err.message }));
});
ipcMain.handle('install-update', () => autoUpdater.quitAndInstall());

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  createWindow();
  createTray();
  setupAutoUpdater();

  const settings = getSettings();
  const session = store.get('session');

  if (session && !store.get('trackingPaused', false)) {
    startTracker(settings, onTrackChange, onSessionExpired);
    startThemeSync(session, onThemeChange);
    if (settings.discordRPC) initDiscordRPC().catch(() => {});
  }

  setupAutostart(settings.autostart);

  if (!isDev) setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else mainWindow?.show();
});
app.on('before-quit', () => { isQuitting = true; stopTracker(); stopThemeSync(); destroyDiscordRPC(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
