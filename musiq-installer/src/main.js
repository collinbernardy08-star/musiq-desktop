const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 520,
    height: 640,
    resizable: false,
    frame: false,
    backgroundColor: '#0f0f0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../assets/icon.ico'),
    show: false,
    center: true,
  });

  win.loadFile(path.join(__dirname, 'index.html'));
  win.once('ready-to-show', () => win.show());
}

function getInstallerPath() {
  // Log all paths we try for debugging
  const candidates = [
    // Production: extraResources puts files directly in resources/
    path.join(process.resourcesPath, 'Mus-IQ-Core-Setup.exe'),
    path.join(process.resourcesPath, 'payload', 'Mus-IQ-Core-Setup.exe'),
    // Dev fallback
    path.join(__dirname, '../payload/Mus-IQ-Core-Setup.exe'),
    path.join(__dirname, 'payload/Mus-IQ-Core-Setup.exe'),
  ];

  for (const p of candidates) {
    console.log('[Installer] Checking:', p, '→', fs.existsSync(p) ? 'FOUND' : 'not found');
    if (fs.existsSync(p)) return p;
  }

  // Return the path that was actually searched so UI can show it
  return null;
}

ipcMain.handle('start-install', async (_, options) => {
  const installerPath = getInstallerPath();

  if (!installerPath) {
    // List what's in resourcesPath to help debug
    let contents = '';
    try {
      contents = fs.readdirSync(process.resourcesPath).join(', ');
    } catch (e) {
      contents = e.message;
    }
    return {
      success: false,
      error: `Installer nicht gefunden.\nGesucht in: ${process.resourcesPath}\nInhalt: ${contents}`
    };
  }

  return new Promise((resolve) => {
    const installDir = options?.installDir ||
      path.join(os.homedir(), 'AppData', 'Local', 'Mus-IQ Desktop');

    const proc = spawn(installerPath, ['/S', `/D=${installDir}`], { detached: false });

    let progress = 0;
    let done = false;
    const tick = setInterval(() => {
      if (done) return;
      const remaining = 92 - progress;
      progress += Math.max(0.5, remaining * 0.06);
      progress = Math.min(progress, 92);
      win?.webContents.send('install-progress', Math.round(progress));
    }, 300);

    proc.on('close', (code) => {
      done = true;
      clearInterval(tick);
      win?.webContents.send('install-progress', 100);
      setTimeout(() => resolve({ success: code === 0, code }), 400);
    });

    proc.on('error', (err) => {
      done = true;
      clearInterval(tick);
      resolve({ success: false, error: err.message });
    });
  });
});

ipcMain.handle('close-window', () => app.quit());
ipcMain.handle('minimize-window', () => win?.minimize());
ipcMain.handle('open-external', (_, url) => shell.openExternal(url));
ipcMain.handle('get-default-install-dir', () =>
  path.join(os.homedir(), 'AppData', 'Local', 'Mus-IQ Desktop')
);
ipcMain.handle('launch-app', () => {
  const appExe = path.join(
    os.homedir(), 'AppData', 'Local', 'Mus-IQ Desktop', 'Mus-IQ.exe'
  );
  if (fs.existsSync(appExe)) {
    spawn(appExe, [], { detached: true, stdio: 'ignore' }).unref();
  }
  app.quit();
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
