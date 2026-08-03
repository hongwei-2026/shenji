const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('financeOS', {
  getApiBase: () => ipcRenderer.invoke('financeos:get-api-base'),
  openApp: (appMeta) => ipcRenderer.invoke('financeos:open-app', appMeta),
  openLogin: () => ipcRenderer.invoke('financeos:open-login'),
  quit: () => ipcRenderer.invoke('financeos:quit'),
});

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.setAttribute('data-financeos-shell', '1');
});
