const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

function setupAutostart(enabled) {
  const platform = process.platform;
  const appName = 'Spotify Tracker';
  const execPath = process.execPath;

  if (platform === 'win32') {
    setupAutostartWindows(enabled, appName, execPath);
  } else if (platform === 'darwin') {
    setupAutostartMac(enabled, appName, execPath);
  } else if (platform === 'linux') {
    setupAutostartLinux(enabled, appName, execPath);
  }
}

// ─── Windows ──────────────────────────────────────────────────────────────────
function setupAutostartWindows(enabled, appName, execPath) {
  try {
    const { exec } = require('child_process');
    const regKey = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run`;

    if (enabled) {
      const command = `reg add "${regKey}" /v "${appName}" /t REG_SZ /d "${execPath}" /f`;
      exec(command, (err) => {
        if (err) console.error('[Autostart] Windows reg add error:', err);
        else console.log('[Autostart] Windows autostart enabled');
      });
    } else {
      const command = `reg delete "${regKey}" /v "${appName}" /f`;
      exec(command, (err) => {
        // Ignore error if key doesn't exist
        if (err && !err.message.includes('not found')) {
          console.error('[Autostart] Windows reg delete error:', err);
        } else {
          console.log('[Autostart] Windows autostart disabled');
        }
      });
    }
  } catch (err) {
    console.error('[Autostart] Windows error:', err);
  }
}

// ─── macOS ────────────────────────────────────────────────────────────────────
function setupAutostartMac(enabled, appName, execPath) {
  try {
    const plistDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
    const plistPath = path.join(plistDir, `com.spotifytracker.plist`);

    if (!fs.existsSync(plistDir)) {
      fs.mkdirSync(plistDir, { recursive: true });
    }

    if (enabled) {
      const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.spotifytracker</string>
  <key>ProgramArguments</key>
  <array>
    <string>${execPath}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
</dict>
</plist>`;
      fs.writeFileSync(plistPath, plistContent);
      console.log('[Autostart] macOS autostart enabled');
    } else {
      if (fs.existsSync(plistPath)) {
        fs.unlinkSync(plistPath);
        console.log('[Autostart] macOS autostart disabled');
      }
    }
  } catch (err) {
    console.error('[Autostart] macOS error:', err);
  }
}

// ─── Linux ────────────────────────────────────────────────────────────────────
function setupAutostartLinux(enabled, appName, execPath) {
  try {
    const autostartDir = path.join(os.homedir(), '.config', 'autostart');
    const desktopPath = path.join(autostartDir, 'spotify-tracker.desktop');

    if (!fs.existsSync(autostartDir)) {
      fs.mkdirSync(autostartDir, { recursive: true });
    }

    if (enabled) {
      const desktopContent = `[Desktop Entry]
Type=Application
Name=${appName}
Exec=${execPath}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Comment=Spotify Tracker Desktop App
`;
      fs.writeFileSync(desktopPath, desktopContent);
      console.log('[Autostart] Linux autostart enabled');
    } else {
      if (fs.existsSync(desktopPath)) {
        fs.unlinkSync(desktopPath);
        console.log('[Autostart] Linux autostart disabled');
      }
    }
  } catch (err) {
    console.error('[Autostart] Linux error:', err);
  }
}

module.exports = { setupAutostart };
