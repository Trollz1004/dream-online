const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const DATA_DIR = path.join(__dirname, 'data');
const CARDS_FILE = path.join(DATA_DIR, 'cards.json');
const PUBLISH_LOG = path.join(DATA_DIR, 'publish-log.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJSON(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) { /* ignore */ }
  return fallback;
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// Worker health cache
let workerHealth = null;
let workerHealthLastFetch = 0;

function fetchWorkerHealth() {
  return new Promise((resolve) => {
    const now = Date.now();
    if (workerHealth && (now - workerHealthLastFetch) < 30000) {
      return resolve(workerHealth);
    }
    http.get('http://127.0.0.1:8391/health', (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try {
          workerHealth = JSON.parse(body);
          workerHealthLastFetch = now;
          resolve(workerHealth);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function ensureLocalServer() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8392/api/node/status', (res) => {
      res.resume();
      resolve();
    });
    req.on('error', () => {
      try {
        const { server } = require('./server');
        server.listen(8392, '0.0.0.0', () => resolve());
      } catch (_) {
        resolve();
      }
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    title: 'HermesLeadGen — Sabretooth',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadURL('http://127.0.0.1:8392/');
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });
}

// Fix cache permission issues on Windows
app.setPath('userData', path.join(__dirname, '.app-data'));
app.setPath('cache', path.join(__dirname, '.app-cache'));

// Disable GPU to avoid rendering issues on AMD Windows
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

app.whenReady().then(async () => {
  await ensureLocalServer();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: Worker health
ipcMain.handle('worker:health', async () => fetchWorkerHealth());

// IPC: Cards
ipcMain.handle('cards:load', () => readJSON(CARDS_FILE, []));
ipcMain.handle('cards:save', (_e, cards) => { writeJSON(CARDS_FILE, cards); return true; });

// IPC: Publish log
ipcMain.handle('publish:load', () => readJSON(PUBLISH_LOG, []));
ipcMain.handle('publish:save', (_e, log) => { writeJSON(PUBLISH_LOG, log); return true; });

// IPC: Stats
ipcMain.handle('stats:load', () => readJSON(STATS_FILE, {
  emailsSent: 0, replies: 0, revenue: 0, revenueTarget: 10000,
  shortsToday: 0, shortsTodayDate: new Date().toDateString()
}));
ipcMain.handle('stats:save', (_e, stats) => { writeJSON(STATS_FILE, stats); return true; });

// IPC: File dialog for MP4 preview
const approvedDialogPaths = new Set();
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Video', extensions: ['mp4', 'mov', 'mkv', 'webm'] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const chosen = path.resolve(result.filePaths[0]);
  approvedDialogPaths.add(chosen);
  return chosen;
});

// IPC: OmniRoute call (proxy through main to avoid CORS)
const T5500_HOST = process.env.T5500_HOST || 'localhost';
ipcMain.handle('omniroute:chat', async (_e, { model, messages }) => {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      model: model || 'gemini-4-high-reasoning',
      messages: messages || [],
      temperature: 0.7
    });
    const req = http.request(`http://${T5500_HOST}:20128/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const content = json.choices?.[0]?.message?.content || '';
          resolve({ ok: true, content, raw: json });
        } catch (e) {
          resolve({ ok: false, error: e.message, raw: body });
        }
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.write(postData);
    req.end();
  });
});

// IPC: Mission control read-only
ipcMain.handle('missioncontrol:live', async () => {
  return new Promise((resolve) => {
    http.get(`http://${T5500_HOST}:3130/live`, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try { resolve({ ok: true, data: JSON.parse(body) }); }
        catch (e) { resolve({ ok: false, error: e.message, raw: body }); }
      });
    }).on('error', (e) => resolve({ ok: false, error: e.message }));
  });
});

// IPC: Open file in default app (restricted to dialog-selected paths or media-previews)
ipcMain.handle('shell:openPath', (_e, filePath) => {
  const resolved = path.resolve(String(filePath || ''));
  const mediaDir = path.resolve(__dirname, 'media-previews');
  const rel = path.relative(mediaDir, resolved);
  const insideMedia = rel && !rel.startsWith('..') && !path.isAbsolute(rel);
  if (!approvedDialogPaths.has(resolved) && !insideMedia) {
    throw new Error('Blocked shell:openPath outside approved media directories');
  }
  return shell.openPath(resolved);
});
ipcMain.handle('shell:openExternal', (_e, url) => {
  const parsed = new URL(String(url || ''));
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Blocked non-HTTP(S) URL in shell:openExternal');
  }
  return shell.openExternal(parsed.toString());
});
