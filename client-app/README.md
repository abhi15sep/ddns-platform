# DDNS Desktop Client

A lightweight desktop application that keeps your dynamic DNS records updated automatically. Runs silently in your system tray — no terminal knowledge required.

**Works on:** Windows, macOS, and Linux

---

## What It Does

Your home internet IP address changes periodically. This app detects your current public IP every few minutes and updates your DDNS record at `ddns.devops-monk.com` so your domain always points to the right place.

```
Your Computer                    DDNS Server                  Internet
    │                                │                            │
    ├── Detect public IP ──────────► │                            │
    │   (api.ipify.org)              │                            │
    │                                │                            │
    ├── IP changed? ─── Yes ───────► │ Update DNS record          │
    │                                │ homelab.dyn.devops-monk.com│
    │                                │      → 154.51.103.111      │
    │                                │                            │
    │   Sleep 5 minutes...           │                            │
    │                                │                            │
    └── Repeat ──────────────────────┘                            │
                                                                  │
                                     Anyone can now reach your    │
                                     home server via domain ◄─────┘
```

---

## Features

- **System tray app** — runs silently in the background, no window needed
- **Auto-start on boot** — configure once, never think about it again
- **Smart updates** — only sends update when IP actually changes (saves bandwidth)
- **Multiple domains** — manage several subdomains from one app
- **Desktop notifications** — get notified when your IP changes
- **Configurable interval** — check every 1, 2, 5, 10, or 30 minutes
- **Dual IP detection** — uses api.ipify.org with ifconfig.me as fallback
- **Cross-platform** — Windows, macOS, Linux
- **Open source** — inspect the code, build it yourself
- **Lightweight** — minimal CPU and memory usage

---

## Download & Install

### Option 1: Download Pre-Built Binary

Download the latest release for your platform:

| Platform | Format | Download |
|----------|--------|----------|
| Windows | `.exe` installer | [Download for Windows](#) |
| macOS | `.dmg` disk image | [Download for macOS](#) |
| Linux (Debian/Ubuntu) | `.deb` package | [Download for Linux (.deb)](#) |
| Linux (Universal) | `.AppImage` | [Download for Linux (.AppImage)](#) |

> Replace `#` with your actual GitLab/GitHub releases URL once binaries are built.

### Option 2: Build From Source

**Prerequisites:**
- Node.js 18+ (`node --version`)
- npm 9+ (`npm --version`)
- Git

**Steps:**

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ddns-platform.git
cd ddns-platform/client-app

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for your current platform
npm run build

# Build for a specific platform
npm run build:mac      # macOS (.dmg)
npm run build:win      # Windows (.exe)
npm run build:linux    # Linux (.deb + .AppImage)
```

Built packages will be in the `./out` directory.

---

## First-Time Setup

### Step 1: Get Your Subdomain and Token

1. Go to [ddns.devops-monk.com](https://ddns.devops-monk.com)
2. Sign in with Google, GitHub, or email/password
3. Create a subdomain (e.g., `homelab`)
4. Click on your domain to see the **token**

### Step 2: Configure the Desktop App

1. Launch **DDNS Client** — the setup wizard appears on first run
2. Enter the server URL: `https://ddns.devops-monk.com`
3. Enter your subdomain: `homelab`
4. Paste your token from the dashboard
5. Click **Save & Start**

### Step 3: Verify It Works

- The app icon appears in your system tray (near the clock)
- Click the tray icon to see your current IP and last update time
- Go back to the dashboard — your domain should show the current IP

### Step 4: Enable Auto-Start (Optional)

1. Click the tray icon → Open the app window
2. Go to **Settings** tab
3. Enable **Start on boot**
4. The app will now launch automatically when you log in

---

## Usage

### System Tray

Once configured, the app runs in the system tray:

- **Left-click** the tray icon to open the main window
- **Right-click** (or left-click on macOS) shows a menu:
  - Current IP address
  - Last update timestamp
  - **Open Dashboard** — opens the web dashboard
  - **Check Now** — triggers an immediate IP check
  - **Quit** — stops the app

### Main Window Tabs

| Tab | What It Shows |
|-----|---------------|
| **Status** | Current IP, connection status, last update time |
| **Domains** | List of configured domains with their tokens |
| **Settings** | Update interval, auto-start, notifications |

### Closing the Window

Closing the window **hides it to the tray** — the app keeps running in the background. To fully quit, right-click the tray icon and select **Quit**.

---

## Configuration

All settings are stored locally on your machine and persist between restarts.

| Setting | Default | Options |
|---------|---------|---------|
| Server URL | (none) | Any DDNS server URL |
| Update interval | 5 minutes | 1, 2, 5, 10, 30 minutes |
| Start on boot | Off | On / Off |
| Notifications | On | On / Off |

Config file location:
- **Windows:** `%APPDATA%/ddns-client/config.json`
- **macOS:** `~/Library/Application Support/ddns-client/config.json`
- **Linux:** `~/.config/ddns-client/config.json`

---

## Don't Want to Install an App? Use a Script Instead

If you prefer the terminal, you can update your IP with a simple cron job:

### Linux / macOS

```bash
# Open crontab
crontab -e

# Add this line (updates every 5 minutes):
*/5 * * * * curl -s "https://ddns.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN&ip=auto" > /dev/null
```

### macOS (launchd — more reliable than cron)

Create `~/Library/LaunchAgents/com.ddns.updater.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ddns.updater</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/curl</string>
        <string>-s</string>
        <string>https://ddns.devops-monk.com/update?domain=SUBDOMAIN&amp;token=YOUR_TOKEN&amp;ip=auto</string>
    </array>
    <key>StartInterval</key>
    <integer>300</integer>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.ddns.updater.plist
```

### Windows (Task Scheduler + PowerShell)

```powershell
# Create a scheduled task that runs every 5 minutes
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument '-Command "Invoke-WebRequest -Uri ''https://ddns.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN&ip=auto'' -UseBasicParsing"'
$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 5) -At (Get-Date) -Once
Register-ScheduledTask -TaskName "DDNS Updater" -Action $action -Trigger $trigger -Description "Keep DDNS IP updated"
```

### Docker

```yaml
# docker-compose.yml
services:
  ddns-updater:
    image: curlimages/curl:latest
    restart: unless-stopped
    command: >
      sh -c 'while true; do
        curl -s "https://ddns.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN&ip=auto";
        echo " [$(date)]";
        sleep 300;
      done'
```

```bash
docker compose up -d
```

### Synology NAS

1. Go to **Control Panel** → **Task Scheduler**
2. Create → **Scheduled Task** → **User-defined script**
3. Schedule: Every 5 minutes
4. Script:
```bash
curl -s "https://ddns.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN&ip=auto"
```

### Router (DD-WRT / OpenWRT)

Most routers with custom firmware support custom DDNS. Set:
- **Service:** Custom
- **URL:** `https://ddns.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN&ip=auto`
- **Update interval:** 5 minutes

### Raspberry Pi

Same as Linux — use cron:
```bash
crontab -e
*/5 * * * * curl -s "https://ddns.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN&ip=auto" > /dev/null
```

---

## Troubleshooting

### App says "Could not detect IP"
- Check your internet connection
- Try opening https://api.ipify.org in a browser — it should show your IP
- If behind a corporate proxy, the app may not be able to detect your public IP

### IP updates but DNS doesn't resolve
- Wait 60 seconds (DNS TTL)
- Check: `nslookup SUBDOMAIN.dyn.devops-monk.com`
- If still failing, check the server status at `https://ddns.devops-monk.com`

### App doesn't start on boot
- Make sure "Start on boot" is enabled in Settings
- On Linux, some desktop environments don't support auto-launch — use cron instead
- On macOS, check System Preferences → Login Items

### "Invalid token" error
- Go to the dashboard and check your token
- If you regenerated the token on the website, update it in the desktop app too

### App uses too much CPU/memory
- The app should use < 50MB RAM and near-zero CPU
- If it's higher, restart the app
- Report the issue with your OS and Electron version

---

## How It Works (Technical)

1. **IP Detection:** The app calls `https://api.ipify.org?format=json` to get your public IPv4 address. If that fails, it falls back to `https://ifconfig.me/ip`.

2. **Change Detection:** The detected IP is compared with the last known IP stored locally. If they match, no update is sent.

3. **DNS Update:** When the IP changes, the app sends a GET request to:
   ```
   https://ddns.devops-monk.com/update?domain=SUBDOMAIN&token=TOKEN&ip=NEW_IP
   ```
   The server validates the token, updates the PowerDNS A record, and returns `OK`.

4. **Scheduling:** The check runs on a configurable interval (default: every 5 minutes) using JavaScript's `setInterval()`.

5. **Persistence:** Configuration is stored using `electron-store` (encrypted JSON file on disk).

---

## Development

### Project Structure

```
client-app/
├── package.json              # Dependencies & build config
├── README.md                 # This file
└── src/
    ├── main/
    │   ├── index.js          # Electron main process (window, tray, IPC)
    │   └── updater.js        # IP detection & DDNS update logic
    ├── preload/
    │   └── index.js          # Secure IPC bridge (renderer ↔ main)
    └── renderer/
        └── index.html        # UI (setup wizard, status, settings)
```

### IPC API (preload bridge)

The renderer communicates with the main process via:

```javascript
window.ddns.getConfig()              // Get all settings
window.ddns.setConfig(key, value)    // Update a setting
window.ddns.getStatus()              // Get current IP & status
window.ddns.checkNow()               // Trigger immediate check
window.ddns.onStatusUpdate(callback) // Listen for IP changes
```

### Building Releases

```bash
# Build for all platforms (requires platform-specific tools)
npm run build

# Platform-specific builds
npm run build:mac      # Requires macOS
npm run build:win      # Can cross-compile on macOS/Linux with Wine
npm run build:linux    # Can build on any platform
```

Output goes to `./out/` directory.

---

## License

MIT
