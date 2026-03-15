# Spotify Tracker Desktop App

Ein Electron-basiertes Addon zur [Spotify Tracker Web-App](https://spotifytracker.lovable.app).

## Features

- 🎵 **Background Tracking** – Trackt Spotify auch wenn der Browser geschlossen ist
- 🔔 **Systembenachrichtigungen** – Benachrichtigung bei jedem neuen Song
- 🎮 **Discord Rich Presence** – Zeigt aktuellen Song im Discord-Status
- 🚀 **Autostart** – Startet automatisch mit dem System
- 🗂️ **Tray-Icon** – Läuft unauffällig im Systembereich
- ⚙️ **Settings** – Alle Optionen anpassbar

## Schnellstart

### Voraussetzungen
- Node.js 18+ ([nodejs.org](https://nodejs.org))
- Git

### Installation

```bash
# 1. Klone das Repo / entpacke den Ordner
cd spotify-tracker-desktop

# 2. Haupt-Dependencies installieren
npm install

# 3. Renderer-Dependencies installieren
cd src/renderer
npm install
cd ../..

# 4. App starten (Development)
npm run dev
```

### Build (Distribution)

```bash
# Für alle Plattformen
npm run dist

# Nur Windows
npm run dist -- --win

# Nur macOS
npm run dist -- --mac

# Nur Linux
npm run dist -- --linux
```

Die fertigen Installer landen im `dist/` Ordner.

## Projektstruktur

```
spotify-tracker-desktop/
├── src/
│   ├── main/               # Electron Main Process (Node.js)
│   │   ├── main.js         # Entry point, Window & Tray
│   │   ├── preload.js      # Sichere IPC-Bridge
│   │   ├── tracker.js      # Spotify Background Tracking
│   │   ├── discord-rpc.js  # Discord Rich Presence
│   │   └── autostart.js    # Autostart (Win/Mac/Linux)
│   └── renderer/           # React Frontend
│       └── src/
│           ├── App.jsx
│           ├── pages/      # Dashboard, Stats, Settings
│           └── components/ # TitleBar, Sidebar
├── assets/                 # Icons (icon.png, tray-icon.png)
└── package.json
```

## Icons hinzufügen

Lege folgende Dateien in den `assets/` Ordner:
- `icon.png` – App-Icon (512x512px empfohlen)
- `tray-icon.png` – Tray-Icon (16x16px oder 32x32px)
- `icon.ico` – Windows Icon
- `icon.icns` – macOS Icon

Du kannst dein vorhandenes Spotify Tracker Logo verwenden.

## Discord Rich Presence

Discord RPC funktioniert out-of-the-box sobald Discord geöffnet ist.
Der Status zeigt:
- Song-Name und Artist
- Fortschrittsbalken (Restzeit)
- "Auf Spotify öffnen" Button

Wenn du eine eigene Discord App (mit eigenem Icon) verwenden willst:
1. Gehe zu [discord.com/developers](https://discord.com/developers/applications)
2. Erstelle eine neue App
3. Ersetze `DISCORD_CLIENT_ID` in `src/main/discord-rpc.js`

## Technologie

- **Electron 28** – Desktop Framework
- **React 18** – UI
- **Vite 5** – Renderer Build
- **@supabase/supabase-js** – Auth & API
- **discord-rpc** – Discord Integration
- **electron-store** – Lokale Einstellungen
