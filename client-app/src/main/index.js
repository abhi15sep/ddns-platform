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
  },
});

let mainWindow = null;
let tray = null;

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
    width: 480,
    height: 600,
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
  // Use a simple 16x16 icon or template image
  const iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.png');
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    // Fallback: create a tiny colored square
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

  if (result.status === 'error' && store.get('showNotifications')) {
    new Notification({
      title: 'DDNS Update Failed',
      body: `${result.domain}: ${result.error || 'Unknown error'}`,
    }).show();
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
    mainWindow.webContents.send('status-update', {
      ip: result.ip,
      lastUpdate: new Date().toISOString(),
      changed: result.changed,
    });
  }
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
    stopUpdater();
    if (store.get('serverUrl') && store.get('domains').length > 0) {
      startUpdater(store, onUpdateResult);
    }
  }

  return true;
});

ipcMain.handle('check-now', () => checkNow(store, onUpdateResult));

ipcMain.handle('get-status', () => ({
  ip: store.get('lastKnownIp'),
  lastUpdate: store.get('lastUpdateTime'),
  serverUrl: store.get('serverUrl'),
  domains: store.get('domains'),
  isConfigured: !!(store.get('serverUrl') && store.get('domains').length > 0),
}));

// App lifecycle
app.on('ready', () => {
  createTray();

  // Start updater if already configured
  if (store.get('serverUrl') && store.get('domains').length > 0) {
    startUpdater(store, onUpdateResult);
  } else {
    createWindow(); // Show setup on first launch
  }
});

app.on('window-all-closed', (e) => {
  e.preventDefault(); // Keep running in tray
});

app.on('before-quit', () => {
  stopUpdater();
  app.isQuitting = true;
});

app.on('activate', () => createWindow());
