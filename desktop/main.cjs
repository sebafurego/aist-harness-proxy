// AiST desktop: starts the AiST proxy and the Harness web UI as child processes on the bundled
// Node runtime, then shows the UI in a window. Auto-updates from GitHub Releases when packaged.
const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const { spawn, execFileSync } = require('node:child_process');
const { existsSync, mkdirSync, createWriteStream } = require('node:fs');
const { join, dirname } = require('node:path');
const log = require('electron-log');
const { prepareDshHome } = require('./bootstrap.cjs');

app.setName('AiST');
const PROXY_PORT = Number(process.env.AIST_PROXY_PORT || 3091);
const isPackaged = app.isPackaged;
const repoRoot = join(__dirname, '..');

// ---- paths -----------------------------------------------------------------
const res = isPackaged ? process.resourcesPath : __dirname;
const paths = {
  nodeBin: isPackaged
    ? join(res, 'node', process.platform === 'win32' ? 'node.exe' : 'node')
    : process.env.AIST_NODE || 'node',
  dshBin: join(isPackaged ? join(res, 'runtime') : join(__dirname, 'runtime'), 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
  proxyServer: isPackaged ? join(res, 'proxy', 'server.js') : join(repoRoot, 'server.js'),
  dshAssets: isPackaged ? join(res, 'dsh') : join(repoRoot, 'dsh'),
};
const userData = app.getPath('userData');
const dshHome = join(userData, 'dsh');
const proxyDir = join(userData, 'proxy');
const logsDir = join(userData, 'logs');
for (const d of [dshHome, proxyDir, logsDir]) mkdirSync(d, { recursive: true });
log.transports.file.resolvePathFn = () => join(logsDir, 'aist.log');
log.info('AiST starting', { version: app.getVersion(), packaged: isPackaged, userData });

// ---- child processes ---------------------------------------------------------
const children = [];
function pipeTo(name, child) {
  const out = createWriteStream(join(logsDir, `${name}.log`), { flags: 'a' });
  child.stdout.on('data', (d) => out.write(d));
  child.stderr.on('data', (d) => out.write(d));
  child.on('exit', (code, signal) => { log.warn(`${name} exited`, { code, signal }); out.end(); });
  children.push(child);
  return out;
}
function killAll() {
  for (const c of children) {
    if (c.exitCode !== null) continue;
    try {
      if (process.platform === 'win32') execFileSync('taskkill', ['/pid', String(c.pid), '/T', '/F'], { stdio: 'ignore' });
      else { try { process.kill(-c.pid, 'SIGTERM'); } catch { c.kill('SIGTERM'); } }
    } catch (e) { log.warn('kill failed', e.message); }
  }
}

function startProxy() {
  const { patch } = prepareDshHome(dshHome, paths.dshAssets, app.getVersion());
  const env = {
    ...process.env,
    PORT: String(PROXY_PORT),
    DSH_PATCH_FILE: patch,
    ASSISTANTS_FILE: join(proxyDir, 'assistants.json'),
    LOG_LEVEL: 'info',
  };
  const child = spawn(paths.nodeBin, [paths.proxyServer], { cwd: proxyDir, env, detached: process.platform !== 'win32', windowsHide: true });
  pipeTo('proxy', child);
  return child;
}

async function waitForProxy(timeoutMs = 20000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try { const r = await fetch(`http://127.0.0.1:${PROXY_PORT}/health`); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

function startHarness() {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      DSH_HOME: dshHome,
      AIST_PROXY_KEY: 'local',
      PATH: `${dirname(paths.nodeBin)}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH || ''}`,
      ELECTRON_RUN_AS_NODE: undefined,
    };
    const child = spawn(paths.nodeBin, [paths.dshBin, 'web', '--no-open', '--host', '127.0.0.1', '--port', '0'], { cwd: dshHome, env, detached: process.platform !== 'win32', windowsHide: true });
    pipeTo('harness', child);
    let buf = '';
    const onData = (d) => {
      buf += d.toString();
      const m = buf.match(/dsh web: (http:\/\/[^\s]+)/);
      if (m) { child.stdout.off('data', onData); resolve({ child, url: m[1] }); }
      if (buf.length > 200000) buf = buf.slice(-50000);
    };
    child.stdout.on('data', onData);
    child.on('exit', (code) => reject(new Error(`Приложение не запустилось (код ${code}). Смотрите ${join(logsDir, 'harness.log')}`)));
    setTimeout(() => reject(new Error('Приложение не запустилось за 120 с. Логи: ' + logsDir)), 120000);
  });
}

// ---- window -------------------------------------------------------------------
let win;
let lastUrl = null;
function splash(text) {
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(`<!doctype html><html><head><meta charset="utf-8"><title>AiST.Ai</title>
<style>html,body{height:100%;margin:0;background:#141414;color:#eee;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif}
.c{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}
.logo{width:72px;height:72px;border-radius:18px;background:linear-gradient(135deg,#5b6cff,#5a3fd6 45%,#c25a9a 75%,#f2a35c);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:34px;color:#fff}
.t{font-size:15px;color:#aaa}.err{max-width:560px;color:#e5484d;white-space:pre-wrap;text-align:center;font-size:13px;line-height:20px}</style></head>
<body><div class="c"><div class="logo">Ai</div><div class="${text.startsWith('!') ? 'err' : 't'}">${text.replace(/^!/, '')}</div></div></body></html>`);
}
function createWindow() {
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 900, minHeight: 600,
    title: 'AiST', backgroundColor: '#141414', show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.on('closed', () => { win = null; });
  win.loadURL(splash('Запуск AiST.Ai…'));
  return win;
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ label: 'AiST', submenu: [{ role: 'about', label: 'О программе AiST.Ai' }, { type: 'separator' }, { label: 'Проверить обновления…', click: () => checkUpdates(true) }, { type: 'separator' }, { role: 'hide', label: 'Скрыть AiST.Ai' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit', label: 'Завершить AiST.Ai' }] }] : []),
    { label: 'Правка', submenu: [{ role: 'undo', label: 'Отменить' }, { role: 'redo', label: 'Повторить' }, { type: 'separator' }, { role: 'cut', label: 'Вырезать' }, { role: 'copy', label: 'Копировать' }, { role: 'paste', label: 'Вставить' }, { role: 'selectAll', label: 'Выбрать всё' }] },
    { label: 'Вид', submenu: [{ role: 'reload', label: 'Перезагрузить' }, { role: 'toggleDevTools', label: 'Инструменты разработчика' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen', label: 'Во весь экран' }] },
    { label: 'Справка', submenu: [
      { label: 'Папка с логами', click: () => shell.openPath(logsDir) },
      { label: 'Папка данных', click: () => shell.openPath(userData) },
      ...(isMac ? [] : [{ label: 'Проверить обновления…', click: () => checkUpdates(true) }, { label: 'О программе', click: () => dialog.showMessageBox({ title: 'AiST', message: `AiST.Ai ${app.getVersion()}`, detail: 'Десктоп-приложение для ассистентов AiST' }) }]),
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---- updates -------------------------------------------------------------------
let autoUpdater = null;
function setupUpdates() {
  if (!isPackaged) return;
  try {
    ({ autoUpdater } = require('electron-updater'));
    autoUpdater.logger = log;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-downloaded', async (info) => {
      const { response } = await dialog.showMessageBox(win, { type: 'info', buttons: ['Перезапустить сейчас', 'Позже'], defaultId: 0, cancelId: 1, title: 'Обновление AiST.Ai', message: `Загружена версия ${info.version}`, detail: 'Обновление установится при перезапуске приложения.' });
      if (response === 0) { killAll(); autoUpdater.quitAndInstall(); }
    });
    autoUpdater.on('error', (e) => log.warn('updater', e?.message || e));
    autoUpdater.checkForUpdates().catch(() => {});
    setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 6 * 60 * 60 * 1000);
  } catch (e) { log.warn('updater unavailable', e.message); }
}
async function checkUpdates(interactive) {
  if (!autoUpdater) { if (interactive) dialog.showMessageBox({ message: 'Обновления доступны только в установленной версии приложения.' }); return; }
  try {
    const r = await autoUpdater.checkForUpdates();
    if (interactive && (!r || !r.updateInfo || r.updateInfo.version === app.getVersion())) dialog.showMessageBox(win, { message: `У вас актуальная версия AiST.Ai ${app.getVersion()}.` });
  } catch (e) { if (interactive) dialog.showMessageBox(win, { type: 'error', message: 'Не удалось проверить обновления', detail: String(e?.message || e) }); }
}

// ---- lifecycle --------------------------------------------------------------------
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(async () => {
  buildMenu();
  createWindow();
  try {
    if (!existsSync(paths.dshBin)) throw new Error('Не найден рантайм приложения: ' + paths.dshBin);
    startProxy();
    if (!(await waitForProxy())) throw new Error('Служба AiST не запустилась на порту ' + PROXY_PORT + '. Возможно, уже открыт другой экземпляр AiST.Ai.');
    win.loadURL(splash('Запуск AiST.Ai… первый запуск может занять до минуты'));
    const { url } = await startHarness();
    log.info('Harness ready', url.replace(/token=.*/, 'token=…'));
    lastUrl = url;
    win.loadURL(url);
    setupUpdates();
  } catch (e) {
    log.error(e);
    if (win) win.loadURL(splash('!Не удалось запустить AiST.Ai.\n' + (e?.message || e)));
  }
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) { createWindow(); if (lastUrl) win.loadURL(lastUrl); } });
app.on('before-quit', killAll);
process.on('exit', killAll);
