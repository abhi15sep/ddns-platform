# Desktop Client Application

A cross-platform Electron app that keeps users' IPs updated automatically. Designed for non-developers who don't want to use terminals, cron jobs, or scripts.

## How It Works

1. User downloads and installs the app
2. First-run setup wizard: enter server URL + paste token from dashboard
3. App runs in system tray, periodically checking and updating IP
4. Desktop notifications when IP changes
5. Optional auto-start on boot

## Directory Structure

```
client-app/
├── package.json              # Dependencies + electron-builder config
├── assets/
│   └── icon.png              # App icon (provide 512x512 PNG)
└── src/
    ├── main/
    │   ├── index.js           # Electron main process, tray, IPC handlers
    │   └── updater.js         # IP detection + DDNS update logic
    ├── preload/
    │   └── index.js           # Secure bridge (contextBridge) to renderer
    └── renderer/
        └── index.html         # UI: setup wizard, status, domains, settings
```

## Key Files

### `main/index.js` — Main Process
- Creates system tray icon with context menu (IP, last update, Check Now, Quit)
- Manages BrowserWindow (hidden to tray on close, not terminated)
- Handles IPC from renderer for config/status operations
- Starts the updater when configured
- Shows desktop notifications on IP change
- Manages auto-launch on boot via `auto-launch` package

### `main/updater.js` — Update Engine
The core logic that runs in the background:

1. **`detectPublicIP()`** — Gets current public IP using `api.ipify.org` (fallback: `ifconfig.me`)
2. **`smartUpdate()`** — Compares current IP with last known IP, sends update to DDNS server for each configured domain
3. **`startUpdater()`** — Runs `smartUpdate()` immediately, then on interval (configurable: 1-30 minutes)
4. **`stopUpdater()`** — Clears the interval
5. **`checkNow()`** — Triggers an immediate update

The updater sends the IP explicitly in the request (rather than relying on server detection) for accuracy.

### `preload/index.js` — Context Bridge
Exposes a secure `window.ddns` API to the renderer:

| Method | Description |
|--------|-------------|
| `getConfig()` | Returns full config object |
| `setConfig(key, value)` | Updates a config key |
| `getStatus()` | Returns current IP, last update, domain list |
| `checkNow()` | Triggers immediate IP check |
| `onStatusUpdate(callback)` | Listens for status changes from main process |

### `renderer/index.html` — User Interface
Single-page app with vanilla HTML/CSS/JS (no framework needed for this simple UI):

**Setup Page** (first run):
- Server URL input
- Subdomain + token inputs
- "Save & Start" button

**Status Page**:
- Connection indicator (green/yellow/red)
- Current IP, last updated, domain count
- "Check Now" button

**Domains Page**:
- List of configured domains with remove button
- Add new domain form (subdomain + token)

**Settings Page**:
- Server URL
- Update interval selector (1, 2, 5, 10, 30 minutes)
- Start on boot toggle
- Show notifications toggle

## Configuration Storage

Uses `electron-store` for persistent JSON config at:
- **macOS**: `~/Library/Application Support/ddns-client/config.json`
- **Windows**: `%APPDATA%/ddns-client/config.json`
- **Linux**: `~/.config/ddns-client/config.json`

```json
{
  "serverUrl": "https://api.devops-monk.com",
  "domains": [
    { "subdomain": "myhome", "token": "uuid-token-here" }
  ],
  "updateInterval": 5,
  "startOnBoot": false,
  "showNotifications": true,
  "lastKnownIp": "203.0.113.42",
  "lastUpdateTime": "2026-03-14T10:30:00Z"
}
```

## Running in Development

```bash
cd client-app
npm install
npm run dev
```

This opens the Electron app in dev mode with DevTools available.

## Building for Distribution

```bash
# macOS
npm run build:mac    # Outputs .dmg to client-app/out/

# Windows
npm run build:win    # Outputs .exe installer to client-app/out/

# Linux
npm run build:linux  # Outputs .deb and .AppImage to client-app/out/
```

### Build Prerequisites

- **macOS builds**: Requires macOS with Xcode command line tools
- **Windows builds**: Can cross-compile from macOS/Linux with Wine, or build natively on Windows
- **Linux builds**: Works on any Linux or macOS

### App Icon

Place a 512x512 PNG at `assets/icon.png`. electron-builder will auto-generate platform-specific icon formats (.icns for macOS, .ico for Windows).

## User Guide (for non-developers)

### Installation
1. Download the installer for your operating system
2. Run the installer (macOS: open .dmg and drag to Applications, Windows: run .exe, Linux: install .deb)

### First-Time Setup
1. Open the app — a setup screen appears
2. Enter your **Server URL** (provided by your DDNS administrator)
3. Enter your **Subdomain** (e.g., `myhome`)
4. Paste your **Token** (copy from the web dashboard)
5. Click **Save & Start**

### Daily Use
- The app runs in your system tray (menu bar on macOS, taskbar on Windows)
- Right-click the tray icon to see your current IP and last update time
- Click "Check Now" to force an immediate IP update
- The app notifies you when your IP address changes

### Settings
- **Update interval**: How often to check for IP changes (default: 5 minutes)
- **Start on boot**: Automatically run when you log in
- **Notifications**: Show desktop alerts when IP changes
