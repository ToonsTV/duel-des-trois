'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('duelApp', {
  platform: process.platform,
  getVersion: () => ipcRenderer.invoke('get-version'),
  onUpdate: cb => { ipcRenderer.on('update-status', (_e, d) => cb(d)); },
  checkUpdates: () => ipcRenderer.send('check-updates'),
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  installUpdate: () => ipcRenderer.send('install-update'),
  openReleases: () => ipcRenderer.send('open-releases')
});
