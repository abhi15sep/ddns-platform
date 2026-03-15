const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const AutoLaunch = require('auto-launch');
const { startUpdater, stopUpdater, checkNow } = require('./updater');

const store = new Store({
  defaults: {
    serverUrl: '',
    domains: [],
    updateInterval: 5,
    startOnBoot: false,
    showNotifications: true,
    lastKnownIp: null,
    lastUpdateTime: null,
    domainStatuses: {},   // { subdomain: { status, ip, error, lastUpdate } }
    lastError: null,
  },
});

let mainWindow = null;
let tray = null;
let healthInterval = null;

const autoLauncher = new AutoLaunch({
  name: 'DDNS Client',
  isHidden: true,
});

function createWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 500,
    height: 680,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.png');
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('DDNS Client');
  updateTrayMenu();
  tray.on('click', () => createWindow());
}

function updateTrayMenu() {
  const lastIp = store.get('lastKnownIp') || 'Unknown';
  const lastUpdate = store.get('lastUpdateTime');
  const lastStr = lastUpdate ? new Date(lastUpdate).toLocaleString() : 'Never';

  const menu = Menu.buildFromTemplate([
    { label: `IP: ${lastIp}`, enabled: false },
    { label: `Last update: ${lastStr}`, enabled: false },
    { type: 'separator' },
    { label: 'Open Dashboard', click: () => createWindow() },
    { label: 'Check Now', click: () => checkNow(store, onUpdateResult) },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  tray.setContextMenu(menu);
}

function onUpdateResult(result) {
  console.log(`[DDNS] Update result: ${result.domain} -> ${result.status} (IP: ${result.ip}${result.error ? ', error: ' + result.error : ''})`);

  // Store per-domain status
  const statuses = store.get('domainStatuses') || {};
  statuses[result.domain] = {
    status: result.status,
    ip: result.ip,
    error: result.error || null,
    lastUpdate: new Date().toISOString(),
  };
  store.set('domainStatuses', statuses);

  if (result.status === 'error') {
    store.set('lastError', result.error || 'Unknown error');
    if (store.get('showNotifications')) {
      new Notification({
        title: 'DDNS Update Failed',
        body: `${result.domain}: ${result.error || 'Unknown error'}`,
      }).show();
    }
  } else {
    store.set('lastError', null);
  }

  if (result.changed && store.get('showNotifications')) {
    new Notification({
      title: 'IP Address Changed',
      body: `Your IP changed to ${result.ip}`,
    }).show();
  }

  if (result.ip && result.ip !== 'Unknown') {
    store.set('lastKnownIp', result.ip);
  }
  store.set('lastUpdateTime', new Date().toISOString());
  updateTrayMenu();

  // Notify renderer if open
  if (mainWindow) {
    mainWindow.webContents.send('status-update', getFullStatus());
  }
}

function getFullStatus() {
  return {
    ip: store.get('lastKnownIp'),
    lastUpdate: store.get('lastUpdateTime'),
    serverUrl: store.get('serverUrl'),
    domains: store.get('domains'),
    domainStatuses: store.get('domainStatuses') || {},
    lastError: store.get('lastError'),
    isConfigured: !!(store.get('serverUrl') && store.get('domains').length > 0),
  };
}

// IPC handlers
ipcMain.handle('get-config', () => store.store);

ipcMain.handle('set-config', (_event, key, value) => {
  store.set(key, value);

  if (key === 'startOnBoot') {
    if (value) autoLauncher.enable();
    else autoLauncher.disable();
  }

  if (key === 'updateInterval' || key === 'domains' || key === 'serverUrl') {
    // Clean up statuses for removed domains
    if (key === 'domains') {
      const currentDomains = new Set(value.map(d => d.subdomain));
      const statuses = store.get('domainStatuses') || {};
      for (const sub of Object.keys(statuses)) {
        if (!currentDomains.has(sub)) {
          delete statuses[sub];
        }
      }
      store.set('domainStatuses', statuses);
      store.set('lastError', null);
    }

    stopUpdater();
    if (store.get('serverUrl') && store.get('domains').length > 0) {
      startUpdater(store, onUpdateResult);
    }
  }

  return true;
});

ipcMain.handle('check-now', () => checkNow(store, onUpdateResult));
ipcMain.handle('get-status', () => getFullStatus());

// Ping health endpoint
ipcMain.handle('ping-server', async () => {
  const serverUrl = store.get('serverUrl');
  if (!serverUrl) return { ok: false, error: 'No server configured' };

  const base = serverUrl.replace(/\/+$/, '');
  try {
    const start = Date.now();
    const res = await fetch(`${base}/health`, {
      headers: { 'User-Agent': 'DDNS-Desktop-Client/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;
    if (res.ok) {
      return { ok: true, latency };
    }
    return { ok: false, error: `HTTP ${res.status}`, latency };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Ping internet (ipify)
ipcMain.handle('ping-internet', async () => {
  try {
    const start = Date.now();
    const res = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      return { ok: true, ip: data.ip, latency };
    }
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// App lifecycle
app.on('ready', () => {
  createTray();

  if (store.get('serverUrl') && store.get('domains').length > 0) {
    startUpdater(store, onUpdateResult);
  } else {
    createWindow();
  }
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('before-quit', () => {
  stopUpdater();
  if (healthInterval) clearInterval(healthInterval);
  app.isQuitting = true;
});

app.on('activate', () => createWindow());
