const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const path = require('path');

const APP_URL = (
  process.env.APP_URL ||
  'https://u909320-gg7n-7e2d25d3.weste.seetacloud.com:8443'
).replace(/\/$/, '');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: '智能财务系统',
    backgroundColor: '#1a2332',
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
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('did-fail-load', (_e, code, desc) => {
    if (code === -3) return;
    dialog.showErrorBox(
      '无法连接服务器',
      `地址: ${APP_URL}\n错误: ${desc} (${code})\n请确认公网服务已启动，或设置 APP_URL。`,
    );
  });
  win.loadURL(APP_URL + '/?source=desktop');
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
