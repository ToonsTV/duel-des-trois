'use strict';
/* Duel des Trois : processus principal (fenêtre, mises à jour automatiques) */
const { app, BrowserWindow, Menu, dialog, shell, protocol, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const pkg = require('./package.json');

// Adresse interne stable : la progression (localStorage) survit à toutes les mises à jour.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

// Une seule fenêtre à la fois (évite les fichiers verrouillés pendant une mise à jour).
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const ROOT = path.join(__dirname, 'app');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2'
};

let win = null;
let manualCheck = false;
let updaterReady = false;

function repoUrl() {
  const r = typeof pkg.repository === 'string' ? pkg.repository : (pkg.repository && pkg.repository.url) || '';
  const m = r.match(/github[:/]+([^/\s]+\/[^/\s.]+)/i);
  return m ? `https://github.com/${m[1]}/releases/latest` : null;
}

function send(status, extra) {
  if (win && !win.isDestroyed()) win.webContents.send('update-status', Object.assign({ status }, extra || {}));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 640, minHeight: 360,
    backgroundColor: '#0a0910', title: 'Duel des Trois', show: false, autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.once('ready-to-show', () => win.show());
  win.loadURL('app://duel/index.html');
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) e.preventDefault(); });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  win.on('closed', () => { win = null; });
}

function buildMenu() {
  const tpl = [{
    label: 'Jeu',
    submenu: [
      { label: 'Plein écran', accelerator: 'F11', click: () => win && win.setFullScreen(!win.isFullScreen()) },
      { label: 'Rechercher une mise à jour', click: () => checkUpdates(true) },
      { type: 'separator' },
      { role: 'quit', label: 'Quitter' }
    ]
  }];
  if (process.platform === 'darwin') tpl.unshift({ role: 'appMenu' });
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

/* ---------- mises à jour ---------- */
// Règles pour que la mise à jour ne pose jamais de problème :
//  - une erreur de mise à jour (hors ligne, GitHub indisponible…) n'empêche JAMAIS de jouer ;
//  - Windows et Linux (AppImage) : téléchargement automatique + installation à la fermeture ;
//  - macOS : l'appli n'est pas signée par Apple, donc la mise à jour automatique est impossible :
//    on prévient le joueur et on ouvre la page de téléchargement.
function setupUpdater() {
  if (!app.isPackaged) return;
  if (process.platform === 'linux' && !process.env.APPIMAGE) return;
  let autoUpdater;
  try { autoUpdater = require('electron-updater').autoUpdater; } catch (e) { console.error('electron-updater indisponible', e); return; }
  const mac = process.platform === 'darwin';
  autoUpdater.autoDownload = !mac;
  autoUpdater.autoInstallOnAppQuit = !mac;
  autoUpdater.allowPrerelease = false;
  autoUpdater.on('checking-for-update', () => send('checking'));
  autoUpdater.on('update-available', info => {
    send('available', { version: info.version });
    if (mac) {
      dialog.showMessageBox(win, {
        type: 'info', title: 'Mise à jour disponible', message: `La version ${info.version} est disponible.`,
        detail: 'Télécharge-la et remplace l’application pour la mettre à jour. Ta progression est conservée.',
        buttons: ['Télécharger', 'Plus tard'], defaultId: 0, cancelId: 1
      }).then(r => { const u = repoUrl(); if (r.response === 0 && u) shell.openExternal(u); }).catch(() => {});
    }
  });
  autoUpdater.on('update-not-available', () => {
    send('none');
    if (manualCheck) dialog.showMessageBox(win, { type: 'info', message: 'Tu as déjà la dernière version.', buttons: ['OK'] }).catch(() => {});
    manualCheck = false;
  });
  autoUpdater.on('download-progress', p => send('downloading', { percent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', info => {
    send('ready', { version: info.version });
    dialog.showMessageBox(win, {
      type: 'info', title: 'Mise à jour prête', message: `La version ${info.version} est prête.`,
      detail: 'Redémarre maintenant pour l’installer. Sinon, elle s’installera toute seule à la fermeture du jeu.',
      buttons: ['Redémarrer maintenant', 'Plus tard'], defaultId: 0, cancelId: 1
    }).then(r => { if (r.response === 0) autoUpdater.quitAndInstall(true, true); }).catch(() => {});
  });
  autoUpdater.on('error', err => {
    console.error('Mise à jour :', err && err.message);
    send('error');
    if (manualCheck) {
      dialog.showMessageBox(win, { type: 'warning', message: 'Impossible de vérifier les mises à jour.', detail: 'Vérifie ta connexion internet. Tu peux continuer à jouer normalement.', buttons: ['OK'] }).catch(() => {});
      manualCheck = false;
    }
  });
  updaterReady = true;
  global.__autoUpdater = autoUpdater;
}

function checkUpdates(manual) {
  manualCheck = !!manual;
  if (!app.isPackaged || !updaterReady) {
    if (manual && win) dialog.showMessageBox(win, { type: 'info', message: 'Les mises à jour ne sont pas disponibles dans cette version.', buttons: ['OK'] }).catch(() => {});
    return;
  }
  Promise.resolve(global.__autoUpdater.checkForUpdates()).catch(() => {});
}

/* ---------- démarrage ---------- */
app.whenReady().then(() => {
  protocol.handle('app', async req => {
    try {
      let p = decodeURIComponent(new URL(req.url).pathname);
      if (!p || p === '/') p = '/index.html';
      const file = path.normalize(path.join(ROOT, p));
      if (!file.startsWith(ROOT)) return new Response('Interdit', { status: 403 });
      const data = await fs.promises.readFile(file);
      return new Response(data, { headers: { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' } });
    } catch (e) {
      return new Response('Introuvable', { status: 404 });
    }
  });
  ipcMain.handle('get-version', () => app.getVersion());
  ipcMain.on('check-updates', () => checkUpdates(true));
  ipcMain.on('toggle-fullscreen', () => win && win.setFullScreen(!win.isFullScreen()));
  buildMenu();
  createWindow();
  setupUpdater();
  setTimeout(() => checkUpdates(false), 4000);
  setInterval(() => checkUpdates(false), 4 * 60 * 60 * 1000);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => { app.quit(); });
