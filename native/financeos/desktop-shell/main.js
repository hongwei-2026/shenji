const { app, BrowserWindow, ipcMain, shell, Menu, screen } = require('electron');
const path = require('path');

const API_BASE = (process.env.FINANCEOS_URL || process.env.APP_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
const OPEN_APP = process.argv.find((a) => a.startsWith('--app='))?.slice(6)
  || (process.env.FINANCEOS_APP || '');
const OPEN_URL = process.argv.find((a) => a.startsWith('--url='))?.slice(6) || '';

const APP_PATHS = {
  vouchers: '/finance/vouchers',
  receivables: '/finance/receivables',
  payables: '/finance/payables',
  invoices: '/finance/invoices',
  audit: '/dashboard',
  chat: '/chat',
  settings: '/profile',
};

/** @type {Map<string, BrowserWindow>} */
const appWindows = new Map();
let desktopWin = null;

function createDesktop() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  desktopWin = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    fullscreen: false,
    simpleFullscreen: false,
    backgroundColor: '#1e293b',
    title: 'FinanceOS',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
  });
  desktopWin.once('ready-to-show', () => {
    desktopWin.show();
    desktopWin.maximize();
  });
  desktopWin.loadFile(path.join(__dirname, 'shell', 'index.html'), {
    query: { api: API_BASE },
  });
  desktopWin.on('closed', () => {
    desktopWin = null;
  });
}

function openAppWindow(appMeta) {
  const id = appMeta.id || 'app';
  const existing = appWindows.get(id);
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return;
  }
  const url = appMeta.url?.startsWith('http')
    ? appMeta.url
    : `${API_BASE}${appMeta.url || appMeta.path || '/'}`;
  const cleanUrl = url.includes('chrome=os') ? url.trim() : `${url.trim()}${url.includes('?') ? '&' : '?'}chrome=os`;

  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    title: appMeta.name || 'FinanceOS App',
    backgroundColor: '#f3f4f6',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url: u }) => {
    if (u.startsWith(API_BASE) || u.startsWith('http://127.0.0.1') || u.startsWith('http://localhost')) {
      return { action: 'allow' };
    }
    shell.openExternal(u);
    return { action: 'deny' };
  });
  win.loadURL(cleanUrl);
  win.on('closed', () => appWindows.delete(id));
  appWindows.set(id, win);
}

function openLogin() {
  const win = new BrowserWindow({
    width: 480,
    height: 640,
    title: 'FinanceOS 登录',
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadURL(`${API_BASE}/login?chrome=os`);
}

ipcMain.handle('financeos:get-api-base', () => API_BASE);

ipcMain.handle('financeos:open-app', (_e, appMeta) => {
  openAppWindow(appMeta || {});
  return { ok: true };
});

ipcMain.handle('financeos:open-login', () => {
  openLogin();
  return { ok: true };
});

ipcMain.handle('financeos:quit', () => {
  app.quit();
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  if (OPEN_APP || OPEN_URL) {
    const rel = APP_PATHS[OPEN_APP] || '/';
    openAppWindow({
      id: OPEN_APP || 'app',
      name: OPEN_APP || 'FinanceOS',
      url: OPEN_URL || `${API_BASE}${rel}?chrome=os`,
    });
  } else {
    createDesktop();
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createDesktop();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
