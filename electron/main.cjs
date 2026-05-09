const {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  protocol,
  screen,
  shell,
  Tray,
} = require('electron');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const { randomUUID } = require('node:crypto');
const { execFile, spawn } = require('node:child_process');

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
const windows = new Map();
let topmostGuard = null;
let currentAppIconPath = path.join(app.getAppPath(), 'public', 'assets', 'idle', 'png', 'idle.png');
let tray = null;
let currentAppIcon = null;
const floatingConfiguredWindows = new WeakSet();
const IGNORED_DISTRACTION_APPS = ['DeskSprite', 'PawPal', 'Electron'];
const CODEX_STATUS = {
  IDLE: 'idle',
  NEEDS_INPUT: 'needs-input',
  WORKING: 'working',
  DONE: 'done',
};
const DEFAULT_CODEX_HTTP_PROXY = 'http://127.0.0.1:6478';
const DEFAULT_CODEX_SOCKS_PROXY = 'socks5://127.0.0.1:6478';
const CURRENT_CODEX_THREAD_ID = process.env.DESKSPRITE_CODEX_THREAD_ID || process.env.CODEX_THREAD_ID || '';
const codingState = {
  status: CODEX_STATUS.DONE,
  messages: [],
  running: null,
  threadId: CURRENT_CODEX_THREAD_ID,
};
const claudeCodingState = {
  status: CODEX_STATUS.DONE,
  messages: [],
  running: null,
  threadId: '',
};
const CODEX_INHERIT_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const CODEX_INHERIT_ACTIVE_MS = 90 * 1000;
const inheritedCodingAcknowledged = new Map();
const codexAppServer = {
  child: null,
  buffer: '',
  nextId: 1,
  pending: new Map(),
  ready: null,
  loadedThreadId: '',
  activeTurn: null,
};

app.setName('DeskSprite');
if (process.platform === 'darwin') app.setActivationPolicy('regular');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'desksprite-app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
  {
    scheme: 'desksprite-file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function preload(label) {
  return {
    preload: path.join(__dirname, 'preload.cjs'),
    additionalArguments: [`--desksprite-label=${label}`],
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
  };
}

function rendererUrl(label) {
  if (isDev) return `${devUrl}/#${label}`;
  return `desksprite-app://localhost/index.html#${label}`;
}

function send(win, channel, payload) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send(`desksprite:event:${channel}`, payload);
}

function broadcast(channel, payload) {
  for (const win of windows.values()) send(win, channel, payload);
}

function applyFloatingFullscreenBehavior(win, options = {}) {
  if (!win || win.isDestroyed()) return;
  const force = Boolean(options.force);
  if (process.platform === 'darwin') {
    if (!force && floatingConfiguredWindows.has(win) && win.isAlwaysOnTop()) return;
    if (app.dock) app.dock.show();
    win.setSkipTaskbar(false);
    win.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    });
    win.setFullScreenable(false);
    win.setAlwaysOnTop(true, 'screen-saver', 1);
    floatingConfiguredWindows.add(win);
    if (force) win.moveTop();
  } else {
    if (!force && floatingConfiguredWindows.has(win) && win.isAlwaysOnTop()) return;
    win.setAlwaysOnTop(true, 'normal');
    win.setSkipTaskbar(true);
    floatingConfiguredWindows.add(win);
  }
}

function makeSquareIcon(iconPath, size = 512) {
  if (!fs.existsSync(iconPath)) return nativeImage.createEmpty();
  const source = nativeImage.createFromPath(iconPath);
  if (source.isEmpty()) return source;
  const sourceSize = source.getSize();
  if (!sourceSize.width || !sourceSize.height) return source;
  const ratio = Math.min(size / sourceSize.width, size / sourceSize.height);
  const drawWidth = Math.round(sourceSize.width * ratio);
  const drawHeight = Math.round(sourceSize.height * ratio);
  const x = Math.round((size - drawWidth) / 2);
  const y = Math.round((size - drawHeight) / 2);
  const resized = source.resize({ width: drawWidth, height: drawHeight });
  const bitmap = resized.toBitmap();
  const rgba = Buffer.alloc(size * size * 4);

  for (let row = 0; row < drawHeight; row += 1) {
    for (let col = 0; col < drawWidth; col += 1) {
      const sourceOffset = (row * drawWidth + col) * 4;
      const targetOffset = ((y + row) * size + x + col) * 4;
      rgba[targetOffset] = bitmap[sourceOffset + 2];
      rgba[targetOffset + 1] = bitmap[sourceOffset + 1];
      rgba[targetOffset + 2] = bitmap[sourceOffset];
      rgba[targetOffset + 3] = bitmap[sourceOffset + 3];
    }
  }

  return nativeImage.createFromBuffer(encodePngRgba(size, size, rgba));
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePngRgba(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let row = 0; row < height; row += 1) {
    const rawOffset = row * (width * 4 + 1);
    raw[rawOffset] = 0;
    rgba.copy(raw, rawOffset + 1, row * width * 4, (row + 1) * width * 4);
  }

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function makeProportionalIcon(iconPath, height = 512) {
  if (!fs.existsSync(iconPath)) return nativeImage.createEmpty();
  const image = nativeImage.createFromPath(iconPath);
  if (image.isEmpty()) return image;
  return image.resize({ height });
}

function makeIconImage(iconPath, size = 24) {
  const image = makeProportionalIcon(iconPath, size);
  if (image.isEmpty()) return image;
  image.setTemplateImage(false);
  return image;
}

function centerBounds(widthRatio, heightRatio = widthRatio) {
  const display = screen.getPrimaryDisplay();
  const work = display.workArea;
  const width = Math.round(work.width * widthRatio);
  const height = Math.round(work.height * heightRatio);
  return {
    width,
    height,
    x: Math.round(work.x + (work.width - width) / 2),
    y: Math.round(work.y + (work.height - height) / 2),
  };
}

function createWindow(label, options) {
  const existing = windows.get(label);
  if (existing && !existing.isDestroyed()) return existing;

  const win = new BrowserWindow({
    show: false,
    backgroundColor: '#00000000',
    icon: currentAppIconPath,
    ...options,
    webPreferences: preload(label),
  });
  windows.set(label, win);
  win.loadURL(rendererUrl(label));
  win.setTitle('');
  win.on('move', () => send(win, 'window:moved', null));
  win.on('closed', () => windows.delete(label));
  return win;
}

function resolveAppIconPath(iconPath) {
  if (!iconPath || typeof iconPath !== 'string') return currentAppIconPath;
  if (iconPath.startsWith('assets/')) {
    return path.join(app.getAppPath(), 'public', iconPath);
  }
  return iconPath;
}

function setAppIcon(iconPath) {
  const resolved = resolveAppIconPath(iconPath);
  if (!fs.existsSync(resolved)) return false;
  currentAppIconPath = resolved;
  const image = makeProportionalIcon(resolved, 512);
  if (image.isEmpty()) return false;
  currentAppIcon = image;
  if (process.platform === 'darwin' && app.dock) {
    const dockImage = makeSquareIcon(resolved, 512);
    app.dock.show();
    app.dock.setIcon(dockImage.isEmpty() ? image : dockImage);
  }
  const trayImage = makeIconImage(resolved, 18);
  if (!trayImage.isEmpty()) {
    if (!tray) {
      tray = new Tray(trayImage);
      tray.setToolTip('DeskSprite');
      updateTrayMenu();
      tray.on('right-click', updateTrayMenu);
      tray.on('click', updateTrayMenu);
    } else {
      tray.setImage(trayImage);
      updateTrayMenu();
    }
  }
  for (const win of windows.values()) {
    if (!win || win.isDestroyed()) continue;
    win.setIcon(image);
  }
  return true;
}

function activeWindowScript() {
  return `
tell application "System Events"
  set frontAppProcess to first application process whose frontmost is true
  set frontApp to name of frontAppProcess
  set frontWindow to ""
  try
    set frontWindow to name of front window of frontAppProcess
  end try
end tell
return frontApp & linefeed & frontWindow
`;
}

function readActiveWindow() {
  if (process.platform !== 'darwin') {
    return Promise.resolve({ supported: false, appName: '', windowTitle: '', error: 'unsupported' });
  }
  return new Promise((resolve) => {
    execFile('/usr/bin/osascript', ['-e', activeWindowScript()], { timeout: 2500 }, (error, stdout) => {
      if (error) {
        resolve({
          supported: true,
          appName: '',
          windowTitle: '',
          error: error.message || String(error),
        });
        return;
      }
      const [appName = '', ...titleParts] = String(stdout || '').trimEnd().split('\n');
      resolve({
        supported: true,
        appName: appName.trim(),
        windowTitle: titleParts.join('\n').trim(),
        error: null,
      });
    });
  });
}

function normalizeRuleList(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim().toLowerCase()).filter(Boolean) : [];
}

function classifyDistraction(active, settings) {
  const appNameLower = String(active.appName || '').toLowerCase();
  const titleLower = String(active.windowTitle || '').toLowerCase();
  if (!appNameLower && !titleLower) return null;
  if (IGNORED_DISTRACTION_APPS.some((ignored) => ignored.toLowerCase() === appNameLower)) return null;
  const blockedApp = normalizeRuleList(settings?.distractionBlockedApps)
    .find((rule) => appNameLower.includes(rule));
  if (blockedApp) return `app:${blockedApp}`;
  const blockedKeyword = normalizeRuleList(settings?.distractionBlockedKeywords)
    .find((rule) => titleLower.includes(rule) || appNameLower.includes(rule));
  return blockedKeyword ? `keyword:${blockedKeyword}` : null;
}

async function checkDistraction({ settings }) {
  const active = await readActiveWindow();
  if (!active.supported || active.error) {
    return { ...active, matchedRule: null };
  }
  return {
    ...active,
    matchedRule: classifyDistraction(active, settings || {}),
    checkedAt: Date.now(),
  };
}

function isPetVisible() {
  const win = windows.get('pet');
  return Boolean(win && !win.isDestroyed() && win.isVisible());
}

function showPetWindow() {
  const win = windows.get('pet') || createPetWindow();
  applyFloatingFullscreenBehavior(win, { force: true });
  win.showInactive();
  applyFloatingFullscreenBehavior(win, { force: true });
  win.moveTop();
}

function hidePetWindow() {
  windows.get('pet')?.hide();
  windows.get('compact-chat')?.hide();
}

function updateTrayMenu() {
  if (!tray) return;
  const petVisible = isPetVisible();
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: petVisible ? '隐藏灵宠' : '显示灵宠',
      click: () => {
        if (isPetVisible()) hidePetWindow();
        else showPetWindow();
        updateTrayMenu();
      },
    },
    { type: 'separator' },
    { label: '打开设置', click: () => showSettingsWindow() },
    { label: '打开聊天', click: () => showChatWindow() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]));
}

function ensureTopmostGuard() {
  if (topmostGuard) return;
  topmostGuard = setInterval(() => {
    for (const label of ['pet', 'compact-chat']) {
      const win = windows.get(label);
      if (win?.isVisible()) applyFloatingFullscreenBehavior(win);
    }
  }, 500);
}

function createPetWindow() {
  const display = screen.getPrimaryDisplay();
  const work = display.workArea;
  const win = createWindow('pet', {
    width: 220,
    height: 220,
    x: Math.round(work.x + work.width - 260),
    y: Math.round(work.y + work.height - 260),
    transparent: true,
    type: process.platform === 'darwin' ? 'panel' : undefined,
    frame: false,
    focusable: false,
    resizable: false,
    movable: false,
    skipTaskbar: process.platform !== 'darwin',
    hasShadow: false,
    alwaysOnTop: true,
  });
  applyFloatingFullscreenBehavior(win, { force: true });
  win.setIgnoreMouseEvents(false, { forward: true });
  const showPetInactive = () => {
    if (win.isDestroyed() || win.isVisible()) return;
    applyFloatingFullscreenBehavior(win, { force: true });
    win.showInactive();
    applyFloatingFullscreenBehavior(win, { force: true });
  };
  win.once('ready-to-show', showPetInactive);
  win.webContents.once('did-finish-load', () => {
    setTimeout(showPetInactive, 80);
  });
  win.on('show', updateTrayMenu);
  win.on('hide', updateTrayMenu);
  return win;
}

function showSettingsWindow() {
  windows.get('compact-chat')?.hide();
  broadcast('compact-chat:collapsed', {});
  const bounds = centerBounds(0.62, 0.7);
  const win = createWindow('settings', {
    ...bounds,
    title: '',
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : {}),
    resizable: true,
    frame: true,
    transparent: false,
    alwaysOnTop: false,
    backgroundColor: '#f7f3ed',
  });
  win.setBounds(bounds);
  win.show();
  win.focus();
}

function showChatWindow() {
  windows.get('compact-chat')?.hide();
  const bounds = centerBounds(0.8);
  const win = createWindow('chat', {
    ...bounds,
    title: '',
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : {}),
    resizable: true,
    frame: true,
    transparent: false,
    alwaysOnTop: false,
    backgroundColor: '#f7f3ed',
  });
  win.setBounds(bounds);
  win.show();
  win.focus();
}

function showCompactChatWindow({ x, y, w, h }, show = true) {
  const existing = windows.get('compact-chat');
  if (!show && existing && !existing.isDestroyed()) {
    existing.setPosition(Math.round(x), Math.round(y));
    applyFloatingFullscreenBehavior(existing);
    return;
  }
  const win = createWindow('compact-chat', {
    width: Math.round(w),
    height: Math.round(h),
    x: Math.round(x),
    y: Math.round(y),
    transparent: true,
    type: process.platform === 'darwin' ? 'panel' : undefined,
    frame: false,
    resizable: false,
    movable: false,
    skipTaskbar: process.platform !== 'darwin',
    hasShadow: false,
    alwaysOnTop: true,
  });
  win.setBounds({ x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) });
  applyFloatingFullscreenBehavior(win, { force: show });
  if (show) {
    win.showInactive();
    applyFloatingFullscreenBehavior(win, { force: true });
    win.moveTop();
  }
}

function getAssetsDir(state) {
  const dir = path.join(app.getPath('userData'), 'assets', state);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function ensureUserAsset(filePath) {
  const base = path.join(app.getPath('userData'), 'assets');
  const resolved = path.resolve(filePath);
  const resolvedBase = path.resolve(base);
  if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
    throw new Error('File path is not in allowed assets directory');
  }
}

function imageMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.bmp') return 'image/bmp';
  return 'image/png';
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js' || ext === '.mjs') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.ico') return 'image/x-icon';
  return 'application/octet-stream';
}

async function importPetImage({ srcPath, state }) {
  if (!['idle', 'rest', 'work', 'drinking', 'thinking', 'sleeping'].includes(state)) throw new Error(`Invalid state: ${state}`);
  const source = path.resolve(srcPath);
  const ext = path.extname(source).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'].includes(ext)) {
    throw new Error('请选择 PNG、JPG、JPEG、WEBP、GIF 或 BMP 图片');
  }
  const dir = getAssetsDir(state);
  const stem = path.basename(source, ext).replace(/[^a-zA-Z0-9._-]+/g, '-') || 'image';
  let dest = path.join(dir, `${stem}${ext}`);
  let counter = 1;
  while (fs.existsSync(dest)) {
    dest = path.join(dir, `${stem}_${counter}${ext}`);
    counter += 1;
  }
  await fsp.copyFile(source, dest);
  return dest;
}

async function listPetImages({ state }) {
  if (!['idle', 'rest', 'work', 'drinking', 'thinking', 'sleeping'].includes(state)) throw new Error(`Invalid state: ${state}`);
  const dir = getAssetsDir(state);
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'].includes(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

async function readPetImageDataUrl({ filePath }) {
  ensureUserAsset(filePath);
  const bytes = await fsp.readFile(filePath);
  return `data:${imageMime(filePath)};base64,${bytes.toString('base64')}`;
}

async function captureScreenRegion(args) {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.max(1, Math.round(Number(args.width) + Number(args.x))),
      height: Math.max(1, Math.round(Number(args.height) + Number(args.y))),
    },
  });
  const image = sources[0]?.thumbnail;
  if (!image || image.isEmpty()) throw new Error('无法获取屏幕截图');
  const crop = image.crop({
    x: Math.max(0, Math.round(Number(args.x))),
    y: Math.max(0, Math.round(Number(args.y))),
    width: Math.max(1, Math.round(Number(args.width))),
    height: Math.max(1, Math.round(Number(args.height))),
  });
  return crop.toPNG().toString('base64');
}

function normalizeApiKey(value) {
  return String(value ?? '').trim().replace(/^Bearer\s+/i, '').replace(/\s+/g, '');
}

function normalizeBaseUrl(value) {
  const baseUrl = String(value ?? '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//.test(baseUrl)) throw new Error('Base URL 必须以 http:// 或 https:// 开头。');
  return baseUrl;
}

function extractApiErrorMessage(text) {
  try {
    const data = JSON.parse(text);
    return data?.error?.message || data?.message || text;
  } catch {
    return text || null;
  }
}

function buildChatBody(provider, model, messages) {
  if (provider === 'anthropic') {
    const system = messages.find((message) => message.role === 'system')?.content ?? '';
    return {
      model,
      system,
      max_tokens: 2048,
      messages: messages
        .filter((message) => message.role !== 'system')
        .map((message) => {
          if (!message.imageDataUrl) return { role: message.role, content: message.content };
          const [header, data] = String(message.imageDataUrl).split(',');
          const mimeType = header?.match(/^data:([^;]+)/)?.[1] || 'image/png';
          return {
            role: message.role,
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeType, data: data || message.imageDataUrl } },
              { type: 'text', text: message.content || '请分析这张图片。' },
            ],
          };
        }),
    };
  }
  return {
    model,
    stream: false,
    messages: messages.map((message) => {
      if (!message.imageDataUrl) return { role: message.role, content: message.content };
      return {
        role: message.role,
        content: [
          { type: 'text', text: message.content || '请分析这张图片。' },
          { type: 'image_url', image_url: { url: message.imageDataUrl } },
        ],
      };
    }),
  };
}

function parseChatResponse(text, provider) {
  const data = JSON.parse(text);
  if (provider === 'anthropic') {
    return (data.content || []).map((item) => item.text || '').join('');
  }
  const content = data.choices?.[0]?.message?.content;
  return Array.isArray(content) ? content.map((item) => item.text || '').join('') : String(content || '');
}

async function chatCompletion({ request }) {
  const apiKey = normalizeApiKey(request.apiKey);
  if (!apiKey) throw new Error('API Key 为空。');
  const provider = String(request.provider || '').toLowerCase();
  const baseUrl = normalizeBaseUrl(request.baseUrl);
  const endpoint = provider === 'anthropic' ? `${baseUrl}/messages` : `${baseUrl}/chat/completions`;
  const headers = { 'content-type': 'application/json' };
  if (provider === 'anthropic') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    headers.authorization = `Bearer ${apiKey}`;
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(buildChatBody(provider, request.model, request.messages || [])),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${extractApiErrorMessage(text) || response.statusText}`);
  const content = parseChatResponse(text, provider);
  if (!content) throw new Error('模型返回内容为空。');
  return content;
}

async function testAiConnection({ request }) {
  const started = Date.now();
  try {
    await chatCompletion({
      request: {
        ...request,
        messages: [{ role: 'user', content: 'ping' }],
      },
    });
    return { success: true, message: '测试通过', latency: Date.now() - started };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error), latency: Date.now() - started };
  }
}

async function transcribeAudio({ request }) {
  const apiKey = normalizeApiKey(request.apiKey);
  if (!apiKey) throw new Error('API Key 为空。');
  const form = new FormData();
  const bytes = Buffer.from(String(request.audioBase64 || '').split(',').pop() || '', 'base64');
  form.append('model', request.model);
  if (request.language) form.append('language', String(request.language).split(/[-_]/)[0].toLowerCase());
  form.append('file', new Blob([bytes], { type: request.mimeType || 'audio/webm' }), request.fileName || 'recording.webm');
  const response = await fetch(`${normalizeBaseUrl(request.baseUrl)}/audio/transcriptions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${extractApiErrorMessage(text) || response.statusText}`);
  return JSON.parse(text).text?.trim() || '';
}

async function synthesizeSpeech({ request }) {
  const apiKey = normalizeApiKey(request.apiKey);
  if (!apiKey) throw new Error('API Key 为空。');
  const format = request.format || 'mp3';
  const response = await fetch(`${normalizeBaseUrl(request.baseUrl)}/audio/speech`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: request.model,
      input: request.input,
      voice: request.voice || 'alloy',
      response_format: format,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${extractApiErrorMessage(text) || response.statusText}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const mimeType = format === 'opus' ? 'audio/ogg' : format === 'wav' ? 'audio/wav' : 'audio/mpeg';
  return { dataUrl: `data:${mimeType};base64,${bytes.toString('base64')}`, mimeType };
}

function getCodexBinary() {
  if (process.env.CODEX_BIN) return process.env.CODEX_BIN;
  const bundled = '/Applications/Codex.app/Contents/Resources/codex';
  if (fs.existsSync(bundled)) return bundled;
  return 'codex';
}

function getCodexEnv() {
  const env = { ...process.env, FORCE_COLOR: '0' };
  env.https_proxy = env.https_proxy || env.HTTPS_PROXY || DEFAULT_CODEX_HTTP_PROXY;
  env.http_proxy = env.http_proxy || env.HTTP_PROXY || DEFAULT_CODEX_HTTP_PROXY;
  env.all_proxy = env.all_proxy || env.ALL_PROXY || DEFAULT_CODEX_SOCKS_PROXY;
  env.HTTPS_PROXY = env.HTTPS_PROXY || env.https_proxy;
  env.HTTP_PROXY = env.HTTP_PROXY || env.http_proxy;
  env.ALL_PROXY = env.ALL_PROXY || env.all_proxy;
  return env;
}

function getClaudeBinary() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  const homebrew = '/opt/homebrew/bin/claude';
  if (fs.existsSync(homebrew)) return homebrew;
  return 'claude';
}

function publishCodingState() {
  const { running, ...safeState } = codingState;
  const state = { ...safeState, provider: 'codex' };
  broadcast('coding:state', state);
  return state;
}

function publishClaudeCodingState() {
  const { running, ...safeState } = claudeCodingState;
  const state = { ...safeState, provider: 'claude' };
  broadcast('coding:state', state);
  return state;
}

function pushCodingMessage(role, content) {
  const text = String(content || '').trim();
  if (!text) return;
  codingState.messages.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content: text,
    createdAt: Date.now(),
  });
  if (codingState.messages.length > 80) codingState.messages.splice(0, codingState.messages.length - 80);
  publishCodingState();
}

function pushClaudeCodingMessage(role, content) {
  const text = String(content || '').trim();
  if (!text) return;
  claudeCodingState.messages.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content: text,
    createdAt: Date.now(),
  });
  if (claudeCodingState.messages.length > 80) claudeCodingState.messages.splice(0, claudeCodingState.messages.length - 80);
  publishClaudeCodingState();
}

function extractCodexTextFromValue(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((part) => extractCodexTextFromValue(part?.text ?? part?.content ?? part?.output_text ?? part))
      .filter(Boolean)
      .join('')
      .trim();
  }
  if (value && typeof value === 'object') {
    return extractCodexTextFromValue(
      value.text
      ?? value.content
      ?? value.output_text
      ?? value.summary_text
      ?? value.message
      ?? value.error
      ?? value.detail
      ?? value.reason
      ?? value.cause,
    );
  }
  return '';
}

function formatCodexNotice(method, params = {}) {
  const direct = extractCodexTextFromValue(params.message)
    || extractCodexTextFromValue(params.error)
    || extractCodexTextFromValue(params.detail)
    || extractCodexTextFromValue(params.reason)
    || extractCodexTextFromValue(params.cause);
  const code = extractCodexTextFromValue(params.code) || extractCodexTextFromValue(params.error?.code);
  const label = method === 'error' ? 'Codex error' : method;
  if (direct && code) return `${label} ${code}: ${direct}`;
  if (direct) return `${label}: ${direct}`;
  try {
    return `${label}: ${JSON.stringify(params)}`;
  } catch {
    return label;
  }
}

function extractCodexEventText(event) {
  if (!event || typeof event !== 'object') return '';
  if (event.type && /approval|permission|confirm|input/i.test(String(event.type))) {
    codingState.status = CODEX_STATUS.NEEDS_INPUT;
    return `需要处理：${event.type}`;
  }
  if (event.type && /error|failed/i.test(String(event.type))) return `Codex 出错：${JSON.stringify(event)}`;
  return '';
}

function extractCodexItemText(item) {
  if (!item || typeof item !== 'object') return '';
  return extractCodexTextFromValue(item.text)
    || extractCodexTextFromValue(item.content)
    || extractCodexTextFromValue(item.output_text)
    || extractCodexTextFromValue(item.summary)
    || extractCodexTextFromValue(item.summary_text);
}

function extractCodexStatusText(event) {
  if (!event || typeof event !== 'object') return '';
  if (event.type === 'error' && typeof event.message === 'string') {
    const message = event.message.trim();
    if (/Reconnecting|Falling back/i.test(message)) return '';
    return message;
  }
  if (event.type === 'turn.started') return '';
  return '';
}

function summarizeCodexToolItem(item) {
  if (!item || typeof item !== 'object') return '';
  const itemType = String(item.type || '');
  if (itemType === 'command_execution' || itemType === 'commandExecution') {
    const command = extractCodexTextFromValue(item.command)
      || extractCodexTextFromValue(item.parsed_cmd)
      || extractCodexTextFromValue(item.cmd)
      || extractCodexTextFromValue(item.arguments);
    const status = String(item.status || '').trim();
    if (command && status) return `命令 ${status}: ${command}`;
    if (command) return `执行命令: ${command}`;
  }
  if (itemType === 'function_call' || itemType === 'functionCall' || itemType === 'mcpToolCall') {
    const name = String(item.name || '').trim();
    const status = String(item.status || '').trim();
    if (name && status) return `工具 ${status}: ${name}`;
    if (name) return `调用工具: ${name}`;
  }
  return '';
}

function codexWrite(message) {
  const child = codexAppServer.child;
  if (!child || child.killed || !child.stdin.writable) throw new Error('Codex app-server 未连接。');
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

function codexNotify(method, params = {}) {
  codexWrite({ method, params });
}

function codexRequest(method, params = {}, timeoutMs = 30000) {
  const id = codexAppServer.nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      codexAppServer.pending.delete(id);
      reject(new Error(`Codex app-server 请求超时：${method}`));
    }, timeoutMs);
    codexAppServer.pending.set(id, { resolve, reject, timer, method });
    try {
      codexWrite({ id, method, params });
    } catch (error) {
      clearTimeout(timer);
      codexAppServer.pending.delete(id);
      reject(error);
    }
  });
}

function resetCodexAppServer(error) {
  for (const pending of codexAppServer.pending.values()) {
    clearTimeout(pending.timer);
    pending.reject(error || new Error('Codex app-server 已断开。'));
  }
  codexAppServer.pending.clear();
  codexAppServer.child = null;
  codexAppServer.ready = null;
  codexAppServer.loadedThreadId = '';
  codexAppServer.activeTurn = null;
}

function flushCodexAppServerAgentText(role = 'codex') {
  const turn = codexAppServer.activeTurn;
  if (!turn) return;
  const deltaTexts = Array.from(turn.deltaByItem.values()).join('');
  const text = [...turn.pendingAgentTexts, deltaTexts].join('\n\n').trim();
  turn.pendingAgentTexts = [];
  turn.deltaByItem.clear();
  if (!text || text === turn.lastAgentText) return;
  turn.lastAgentText = text;
  pushCodingMessage(role, text);
}

function handleCodexAppServerRequest(message) {
  const label = String(message.method || 'request');
  codingState.status = CODEX_STATUS.NEEDS_INPUT;
  pushCodingMessage('error', `Codex 需要用户处理：${label}`);
  if (message.id != null) {
    try {
      codexWrite({
        id: message.id,
        error: {
          code: -32001,
          message: 'DeskSprite 目前不能在小聊天框内处理这类 Codex 授权请求。',
        },
      });
    } catch {
      // The status message above is enough if the app-server already closed.
    }
  }
  publishCodingState();
}

function handleCodexAppServerNotification(message) {
  const { method, params = {} } = message;
  if (method === 'thread/started' && params.thread?.id) {
    codingState.threadId = params.thread.id;
    codexAppServer.loadedThreadId = params.thread.id;
    publishCodingState();
    return;
  }
  if (method === 'thread/status/changed') {
    if (params.status?.type === 'active' && codingState.running && codingState.status !== CODEX_STATUS.NEEDS_INPUT) {
      codingState.status = CODEX_STATUS.WORKING;
      publishCodingState();
    }
    return;
  }
  if (method === 'turn/started') {
    const turnId = params.turn?.id;
    codexAppServer.activeTurn = {
      id: turnId,
      deltaByItem: new Map(),
      pendingAgentTexts: [],
      lastAgentText: '',
      hasError: false,
    };
    codingState.running = { type: 'app-server-turn', turnId };
    codingState.status = CODEX_STATUS.WORKING;
    publishCodingState();
    return;
  }
  if (method === 'item/agentMessage/delta') {
    if (!codexAppServer.activeTurn) return;
    const itemId = String(params.itemId || 'agent');
    const previous = codexAppServer.activeTurn.deltaByItem.get(itemId) || '';
    codexAppServer.activeTurn.deltaByItem.set(itemId, previous + String(params.delta || ''));
    return;
  }
  if (method === 'item/completed' && params.item) {
    const itemType = String(params.item.type || '');
    if (itemType === 'agentMessage' || itemType === 'agent_message' || itemType === 'message') {
      const text = extractCodexItemText(params.item);
      if (text && codexAppServer.activeTurn) {
        const itemId = String(params.item.id || params.itemId || 'agent');
        const deltaText = codexAppServer.activeTurn.deltaByItem.get(itemId) || '';
        if (text !== deltaText.trim()) codexAppServer.activeTurn.pendingAgentTexts.push(text);
      }
      return;
    }
    if (itemType === 'reasoning') {
      const text = extractCodexItemText(params.item);
      if (text) pushCodingMessage('system', text);
      return;
    }
    const toolSummary = summarizeCodexToolItem(params.item);
    if (toolSummary) {
      flushCodexAppServerAgentText('system');
      pushCodingMessage('system', toolSummary);
    }
    return;
  }
  if (method === 'turn/completed') {
    flushCodexAppServerAgentText('codex');
    codingState.running = null;
    const failed = params.turn?.status === 'failed' || Boolean(codexAppServer.activeTurn?.hasError);
    codingState.status = failed ? CODEX_STATUS.NEEDS_INPUT : CODEX_STATUS.DONE;
    if (failed) {
      const message = extractCodexTextFromValue(params.turn?.error?.message) || 'Codex turn failed.';
      pushCodingMessage('error', message);
    } else {
      pushCodingMessage('system', 'Codex 执行完毕。');
    }
    codexAppServer.activeTurn = null;
    publishCodingState();
    return;
  }
  if (method === 'error' || method === 'warning' || method === 'guardianWarning') {
    const messageText = formatCodexNotice(method, params);
    const isTransient = /Reconnecting|Falling back|retrying sampling request/i.test(messageText);
    if (method === 'error' || method === 'guardianWarning') {
      if (isTransient) {
        codingState.status = CODEX_STATUS.WORKING;
      } else {
        if (codexAppServer.activeTurn) codexAppServer.activeTurn.hasError = true;
        codingState.running = null;
        codingState.status = CODEX_STATUS.NEEDS_INPUT;
      }
    }
    pushCodingMessage(method === 'error' && !isTransient ? 'error' : 'system', messageText);
    publishCodingState();
  }
}

function handleCodexAppServerMessage(message) {
  if (Object.prototype.hasOwnProperty.call(message, 'id')) {
    const pending = codexAppServer.pending.get(message.id);
    if (pending) {
      clearTimeout(pending.timer);
      codexAppServer.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message || JSON.stringify(message.error)));
      else pending.resolve(message.result);
      return;
    }
    if (message.method) handleCodexAppServerRequest(message);
    return;
  }
  if (message.method) handleCodexAppServerNotification(message);
}

function ensureCodexAppServer() {
  if (codexAppServer.child && codexAppServer.ready) return codexAppServer.ready;
  codexAppServer.ready = new Promise((resolve, reject) => {
    const child = spawn(getCodexBinary(), ['app-server', '--listen', 'stdio://'], {
      cwd: process.cwd(),
      env: getCodexEnv(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    codexAppServer.child = child;
    codexAppServer.buffer = '';
    child.stdout.on('data', (chunk) => {
      codexAppServer.buffer += chunk.toString();
      const lines = codexAppServer.buffer.split(/\r?\n/);
      codexAppServer.buffer = lines.pop() || '';
      for (const line of lines) {
        const raw = line.trim();
        if (!raw) continue;
        try {
          handleCodexAppServerMessage(JSON.parse(raw));
        } catch {
          pushCodingMessage('system', raw);
        }
      }
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => /Reconnecting|Falling back|retrying sampling request|error|failed|permission|approval|authorize|confirm|login/i.test(line));
      for (const line of lines) pushCodingMessage('system', line);
      if (/approval|permission|authorize|confirm|login/i.test(text)) {
        codingState.status = CODEX_STATUS.NEEDS_INPUT;
        publishCodingState();
      }
    });
    child.on('error', (error) => {
      resetCodexAppServer(error);
      reject(error);
    });
    child.on('close', (code) => {
      const error = new Error(`Codex app-server 已退出，状态码 ${code ?? 'unknown'}。`);
      resetCodexAppServer(error);
      if (codingState.running) {
        codingState.running = null;
        codingState.status = CODEX_STATUS.NEEDS_INPUT;
        pushCodingMessage('error', error.message);
        publishCodingState();
      }
    });
    Promise.resolve()
      .then(() => codexRequest('initialize', {
        clientInfo: { name: 'desksprite', title: 'DeskSprite', version: app.getVersion?.() || '0.1.0' },
        capabilities: { experimentalApi: true },
      }))
      .then(() => {
        codexNotify('initialized');
        resolve(child);
      })
      .catch((error) => {
        resetCodexAppServer(error);
        reject(error);
      });
  });
  return codexAppServer.ready;
}

async function ensureCodingThread() {
  await ensureCodexAppServer();
  if (codingState.threadId) {
    if (codexAppServer.loadedThreadId !== codingState.threadId) {
      const resumed = await codexRequest('thread/resume', {
        threadId: codingState.threadId,
        cwd: process.cwd(),
        approvalPolicy: 'on-request',
        sandbox: 'workspace-write',
      });
      if (resumed?.thread?.id) {
        codingState.threadId = resumed.thread.id;
        codexAppServer.loadedThreadId = resumed.thread.id;
        publishCodingState();
      }
    }
    return codingState.threadId;
  }
  const started = await codexRequest('thread/start', {
    cwd: process.cwd(),
    approvalPolicy: 'on-request',
    sandbox: 'workspace-write',
  });
  const threadId = started?.thread?.id;
  if (!threadId) throw new Error('Codex app-server 没有返回 thread id。');
  codingState.threadId = threadId;
  codexAppServer.loadedThreadId = threadId;
  publishCodingState();
  return threadId;
}

async function sendCodingMessage({ prompt }) {
  const text = String(prompt || '').trim();
  if (!text) throw new Error('输入为空。');
  if (codingState.running) {
    codingState.status = CODEX_STATUS.WORKING;
    pushCodingMessage('system', 'Codex 正在工作，请等这次任务结束后再发送。');
    return publishCodingState();
  }

  codingState.status = CODEX_STATUS.WORKING;
  codingState.running = { type: 'app-server-starting' };
  pushCodingMessage('user', text);
  pushCodingMessage('system', codingState.threadId ? '已发送到 Codex 常驻连接，等待回复。' : '正在启动 Codex 常驻连接。');
  publishCodingState();

  try {
    const threadId = await ensureCodingThread();
    const result = await codexRequest('turn/start', {
      threadId,
      input: [{ type: 'text', text, text_elements: [] }],
      cwd: process.cwd(),
      approvalPolicy: 'on-request',
    }, 60000);
    const turnId = result?.turn?.id;
    codingState.running = { type: 'app-server-turn', turnId };
    codexAppServer.activeTurn = {
      id: turnId,
      deltaByItem: new Map(),
      pendingAgentTexts: [],
      lastAgentText: '',
      hasError: false,
    };
    publishCodingState();
  } catch (error) {
    codingState.running = null;
    codingState.status = CODEX_STATUS.NEEDS_INPUT;
    pushCodingMessage('error', `Codex app-server 连接失败：${error.message}`);
    publishCodingState();
  }

  return publishCodingState();
}

function extractClaudePrintContent(content) {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (!part || typeof part !== 'object') return '';
      if (part.type === 'text') return String(part.text || '').trim();
      if (part.type === 'tool_use') return summarizeClaudeToolUses([part]);
      return '';
    })
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

function handleClaudePrintEvent(event) {
  if (!event || typeof event !== 'object') return;
  if (event.session_id || event.sessionId) {
    claudeCodingState.threadId = String(event.session_id || event.sessionId);
  }
  if (event.type === 'system' && event.subtype === 'init') {
    if (event.session_id) claudeCodingState.threadId = String(event.session_id);
    publishClaudeCodingState();
    return;
  }
  if (event.type === 'assistant') {
    const message = event.message || {};
    const content = extractClaudePrintContent(message.content ?? event.content);
    if (content) {
      const toolOnly = Array.isArray(message.content) && message.content.every((part) => part?.type === 'tool_use');
      pushClaudeCodingMessage(toolOnly ? 'system' : 'codex', content);
    }
    claudeCodingState.status = CODEX_STATUS.WORKING;
    publishClaudeCodingState();
    return;
  }
  if (event.type === 'result') {
    claudeCodingState.running = null;
    const isError = Boolean(event.is_error) || /error|failed/i.test(String(event.subtype || ''));
    if (isError) {
      claudeCodingState.status = CODEX_STATUS.NEEDS_INPUT;
      pushClaudeCodingMessage('error', event.result || event.error || 'Claude Code 执行失败。');
    } else {
      claudeCodingState.status = CODEX_STATUS.DONE;
      const lastMessage = claudeCodingState.messages[claudeCodingState.messages.length - 1];
      if (event.result && lastMessage?.content !== String(event.result).trim()) pushClaudeCodingMessage('codex', event.result);
      pushClaudeCodingMessage('system', 'Claude Code 执行完毕。');
    }
    publishClaudeCodingState();
    return;
  }
  if (/error|failed/i.test(String(event.type || ''))) {
    claudeCodingState.running = null;
    claudeCodingState.status = CODEX_STATUS.NEEDS_INPUT;
    pushClaudeCodingMessage('error', extractCodexTextFromValue(event) || JSON.stringify(event));
    publishClaudeCodingState();
  }
}

async function sendClaudeCodingMessage({ prompt }) {
  const text = String(prompt || '').trim();
  if (!text) throw new Error('输入为空。');
  if (claudeCodingState.running) {
    claudeCodingState.status = CODEX_STATUS.WORKING;
    pushClaudeCodingMessage('system', 'Claude Code 正在工作，请等这次任务结束后再发送。');
    return publishClaudeCodingState();
  }

  claudeCodingState.status = CODEX_STATUS.WORKING;
  const isFirstClaudeMessage = claudeCodingState.messages.length === 0;
  const sessionId = claudeCodingState.threadId || randomUUID();
  claudeCodingState.threadId = sessionId;
  pushClaudeCodingMessage('user', text);
  if (isFirstClaudeMessage) pushClaudeCodingMessage('system', '正在启动 Claude Code 新 session。');
  const child = spawn(getClaudeBinary(), [
    '-p',
    '--output-format',
    'stream-json',
    '--verbose',
    '--session-id',
    sessionId,
    '--permission-mode',
    'default',
    text,
  ], {
    cwd: process.cwd(),
    env: getCodexEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  claudeCodingState.running = { type: 'claude-print', pid: child.pid };
  let stdoutBuffer = '';
  child.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk.toString();
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() || '';
    for (const line of lines) {
      const raw = line.trim();
      if (!raw) continue;
      try {
        handleClaudePrintEvent(JSON.parse(raw));
      } catch {
        pushClaudeCodingMessage('codex', raw);
      }
    }
  });
  child.stderr.on('data', (chunk) => {
    const textChunk = chunk.toString();
    const lines = textChunk.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      if (/permission|approval|authorize|confirm|login|error|failed|reconnect|retry/i.test(line)) {
        pushClaudeCodingMessage(/error|failed/i.test(line) ? 'error' : 'system', line);
      }
    }
    if (/permission|approval|authorize|confirm|login/i.test(textChunk)) {
      claudeCodingState.status = CODEX_STATUS.NEEDS_INPUT;
      publishClaudeCodingState();
    }
  });
  child.on('error', (error) => {
    claudeCodingState.running = null;
    claudeCodingState.status = CODEX_STATUS.NEEDS_INPUT;
    pushClaudeCodingMessage('error', `Claude Code 启动失败：${error.message}`);
    publishClaudeCodingState();
  });
  child.on('close', (code) => {
    if (stdoutBuffer.trim()) {
      try {
        handleClaudePrintEvent(JSON.parse(stdoutBuffer.trim()));
      } catch {
        pushClaudeCodingMessage('codex', stdoutBuffer.trim());
      }
    }
    claudeCodingState.running = null;
    if (claudeCodingState.status === CODEX_STATUS.WORKING) {
      if (code === 0) {
        claudeCodingState.status = CODEX_STATUS.DONE;
        pushClaudeCodingMessage('system', 'Claude Code 执行完毕。');
      } else {
        claudeCodingState.status = CODEX_STATUS.NEEDS_INPUT;
        pushClaudeCodingMessage('error', `Claude Code 已退出，状态码 ${code ?? 'unknown'}。`);
      }
    }
    publishClaudeCodingState();
  });
  return publishClaudeCodingState();
}

async function listCodexSessionFiles(dir, out = []) {
  let entries = [];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await listCodexSessionFiles(fullPath, out);
    } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      out.push(fullPath);
    }
  }
  return out;
}

function extractCodexSessionContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => extractCodexSessionContent(part?.text ?? part?.content ?? part?.input_text ?? part?.output_text ?? part))
      .filter(Boolean)
      .join('')
      .trim();
  }
  if (content && typeof content === 'object') return extractCodexSessionContent(content.text ?? content.content ?? content.message);
  return '';
}

function codexSessionEventText(payload) {
  return extractCodexSessionContent(
    payload.message
    ?? payload.last_agent_message
    ?? payload.error
    ?? payload.detail
    ?? payload.reason
    ?? payload.cause
    ?? payload.content
    ?? payload.text
    ?? payload.output_text
    ?? payload.summary,
  );
}

function compactCodexSessionMessage(text, fallback) {
  const normalized = String(text || '').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!normalized) return fallback;
  return normalized.length > 2400 ? `${normalized.slice(0, 2400).trim()}...` : normalized;
}

function codexSessionTitle(session) {
  const cwdName = session.cwd ? path.basename(session.cwd) : 'Codex';
  return `${cwdName} · ${session.id.slice(0, 8)}`;
}

function isCodexProblemEvent(type, payload, raw) {
  const haystack = `${type || ''} ${payload?.type || ''} ${payload?.subtype || ''} ${raw || ''}`;
  return /requestapproval|request_user_input|permission|approval|guardian|denied|blocked|requires_action|needs_input/i.test(haystack)
    || /\berror\b|failed/i.test(haystack);
}

function isFinalCodexSessionOutput(payload) {
  const payloadType = String(payload.type || payload.kind || '');
  return /task_complete|turn_complete|turn_completed/i.test(payloadType)
    || Boolean(payload.last_agent_message);
}

function normalizeCodexProgressKey(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function pushCodexProgressMessage(progressMessages, message, createdAt) {
  const key = normalizeCodexProgressKey(message);
  if (!key) return;
  const existing = progressMessages.find((item) => item.key === key);
  if (existing) {
    existing.createdAt = Math.max(existing.createdAt, createdAt);
    return;
  }
  progressMessages.push({ key, content: message, createdAt });
}

function parseCodexSessionFile(filePath, text, mtimeMs) {
  const session = {
    id: path.basename(filePath, '.jsonl').split('-').slice(-5).join('-'),
    cwd: '',
    path: filePath,
    updatedAt: mtimeMs,
    eventAt: mtimeMs,
    ackKey: '',
    title: '',
    status: CODEX_STATUS.WORKING,
    message: '',
    progressMessages: [],
  };
  let lastUserAt = 0;
  let lastWorkAt = 0;
  let lastProgress = '';
  const progressMessages = [];
  let lastAssistantAt = 0;
  let lastAssistant = '';
  let lastProblemAt = 0;
  let lastProblem = '';
  const lines = text.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    const eventAt = Date.parse(event.timestamp || '') || mtimeMs;
    if (event.type === 'session_meta') {
      session.id = event.payload?.id || session.id;
      session.cwd = event.payload?.cwd || session.cwd;
      continue;
    }
    const payload = event.payload || {};
    if (event.type === 'turn_context') {
      session.cwd = payload.cwd || session.cwd;
      lastUserAt = Math.max(lastUserAt, eventAt);
      continue;
    }
    if (event.type === 'event_msg') {
      const payloadType = String(payload.type || payload.kind || '');
      if (/user_message|user_input|prompt/i.test(payloadType)) {
        lastUserAt = Math.max(lastUserAt, eventAt);
        continue;
      }
      if (/agent_message|assistant_message|final_answer|task_complete/i.test(payloadType)) {
        const message = compactCodexSessionMessage(codexSessionEventText(payload), '');
        if (message && isFinalCodexSessionOutput(payload)) {
          lastAssistantAt = eventAt;
          lastAssistant = message;
        } else if (message) {
          lastWorkAt = Math.max(lastWorkAt, eventAt);
          lastProgress = message;
          pushCodexProgressMessage(progressMessages, message, eventAt);
        } else {
          lastWorkAt = Math.max(lastWorkAt, eventAt);
        }
        continue;
      }
      if (/begin|started|running|exec_command|tool|function_call/i.test(payloadType)) {
        lastWorkAt = Math.max(lastWorkAt, eventAt);
      }
    }
    if (event.type === 'response_item') {
      if (payload.role === 'user') {
        lastUserAt = Math.max(lastUserAt, eventAt);
        continue;
      }
      if (payload.role === 'assistant' || payload.type === 'message') {
        const message = compactCodexSessionMessage(codexSessionEventText(payload), '');
        if (message && isFinalCodexSessionOutput(payload)) {
          lastAssistantAt = eventAt;
          lastAssistant = message;
        } else if (message) {
          lastWorkAt = Math.max(lastWorkAt, eventAt);
          lastProgress = message;
          pushCodexProgressMessage(progressMessages, message, eventAt);
        }
      }
      if (/function_call|tool|command|exec/i.test(String(payload.type || ''))) {
        lastWorkAt = Math.max(lastWorkAt, eventAt);
      }
      continue;
    }
    const raw = line.toLowerCase();
    if (isCodexProblemEvent(event.type, payload, raw)) {
      lastProblemAt = eventAt;
      lastProblem = compactCodexSessionMessage(codexSessionEventText(payload), '需要在 Codex 中处理');
    }
  }
  const title = codexSessionTitle(session);
  const prefix = `[${title}]`;
  session.progressMessages = progressMessages.slice(-8).map((message, index) => ({
    id: `inherit-progress-${session.id}-${Math.round(message.createdAt)}-${index}`,
    role: 'system',
    content: `${prefix} ${message.content}`,
    createdAt: message.createdAt,
  }));
  const latestActivityAt = Math.max(lastUserAt, lastWorkAt, lastAssistantAt, lastProblemAt, mtimeMs);
  if (lastProblemAt && lastProblemAt >= lastAssistantAt && lastProblemAt >= lastUserAt && lastProblemAt >= lastWorkAt) {
    session.status = CODEX_STATUS.NEEDS_INPUT;
    session.message = `${prefix} ${lastProblem}`;
    session.eventAt = lastProblemAt;
  } else if (lastAssistantAt && lastAssistantAt >= lastUserAt && lastAssistantAt >= lastWorkAt) {
    session.status = CODEX_STATUS.DONE;
    session.message = `${prefix} ${lastAssistant}`;
    session.eventAt = lastAssistantAt;
  } else {
    session.status = CODEX_STATUS.WORKING;
    session.message = `${prefix} ${lastProgress || 'Codex 正在工作中'}`;
    session.eventAt = latestActivityAt;
  }
  session.updatedAt = latestActivityAt;
  session.title = title;
  session.ackKey = `${session.id}:${session.status}:${Math.round(session.eventAt)}`;
  return session;
}

async function getInheritedCodingState() {
  const root = path.join(app.getPath('home'), '.codex', 'sessions');
  const nowMs = Date.now();
  const files = await listCodexSessionFiles(root);
  const candidates = [];
  for (const filePath of files) {
    let stat;
    try {
      stat = await fsp.stat(filePath);
    } catch {
      continue;
    }
    if (nowMs - stat.mtimeMs > CODEX_INHERIT_LOOKBACK_MS) continue;
    candidates.push({ filePath, mtimeMs: stat.mtimeMs });
  }
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const sessions = [];
  for (const item of candidates.slice(0, 12)) {
    try {
      const file = await fsp.open(item.filePath, 'r');
      const size = Math.min(240_000, (await file.stat()).size);
      const buffer = Buffer.alloc(size);
      await file.read(buffer, 0, size, Math.max(0, (await file.stat()).size - size));
      await file.close();
      sessions.push(parseCodexSessionFile(item.filePath, buffer.toString('utf8'), item.mtimeMs));
    } catch {
      // Ignore unreadable sessions.
    }
  }
  const unacknowledged = sessions.filter((session) => (
    session.status === CODEX_STATUS.WORKING
    || inheritedCodingAcknowledged.get(session.id) !== session.ackKey
  ));
  const actionable = unacknowledged.filter((session) => session.status !== CODEX_STATUS.WORKING);
  const activeWorking = unacknowledged.filter((session) => (
    session.status === CODEX_STATUS.WORKING
    && nowMs - session.updatedAt <= CODEX_INHERIT_ACTIVE_MS
  ));
  const problemSessions = actionable.filter((session) => session.status === CODEX_STATUS.NEEDS_INPUT);
  const doneSessions = actionable.filter((session) => session.status === CODEX_STATUS.DONE);
  const status = problemSessions.length > 0
    ? CODEX_STATUS.NEEDS_INPUT
    : activeWorking.length > 0
      ? CODEX_STATUS.WORKING
      : doneSessions.length > 0
        ? CODEX_STATUS.DONE
        : CODEX_STATUS.IDLE;
  const selected = status === CODEX_STATUS.NEEDS_INPUT
    ? problemSessions
    : status === CODEX_STATUS.WORKING
      ? activeWorking
      : status === CODEX_STATUS.DONE
        ? doneSessions
        : [];
  const messages = selected.slice(0, 5).map((session) => ({
    id: `inherit-${session.id}-${Math.round(session.updatedAt)}`,
    role: session.status === CODEX_STATUS.NEEDS_INPUT ? 'error' : session.status === CODEX_STATUS.DONE ? 'codex' : 'system',
    content: session.message,
    createdAt: session.updatedAt,
  }));
  if (messages.length === 0) {
    messages.push({
      id: 'inherit-empty',
      role: 'system',
      content: status === CODEX_STATUS.IDLE ? '没有新的 Codex 通知。' : '没有检测到最近活跃的 Codex session。',
      createdAt: Date.now(),
    });
  } else if (status === CODEX_STATUS.WORKING) {
    messages.unshift({
      id: 'inherit-working',
      role: 'system',
      content: 'Codex 正在工作中。',
      createdAt: Date.now(),
    });
  }
  return {
    provider: 'codex',
    status,
    messages,
    sessions: selected.slice(0, 12).map((session) => ({
      id: session.id,
      ackKey: session.ackKey,
      title: session.title,
      status: session.status,
      message: session.message,
      progressMessages: session.status === CODEX_STATUS.WORKING ? session.progressMessages : [],
      updatedAt: session.updatedAt,
      cwd: session.cwd,
      path: session.path,
    })),
  };
}

async function ackInheritedCodingSessions({ ackKeys } = {}) {
  if (Array.isArray(ackKeys)) {
    for (const item of ackKeys) {
      if (!item || typeof item !== 'object') continue;
      const id = String(item.id || '');
      const ackKey = String(item.ackKey || '');
      if (id && ackKey) inheritedCodingAcknowledged.set(id, ackKey);
    }
  } else {
    const state = await getInheritedCodingState();
    for (const session of state.sessions || []) {
      if (session.status !== CODEX_STATUS.WORKING && session.id && session.ackKey) {
        inheritedCodingAcknowledged.set(session.id, session.ackKey);
      }
    }
  }
  return getInheritedCodingState();
}

const inheritedClaudeAcknowledged = new Map();

function claudeSessionTitle(session) {
  const cwdName = session.cwd ? path.basename(session.cwd) : path.basename(path.dirname(session.path || '')) || 'Claude Code';
  return `${cwdName} · ${session.id.slice(0, 8)}`;
}

function extractClaudeTextParts(content) {
  if (!Array.isArray(content)) return [];
  return content
    .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text.trim())
    .filter(Boolean);
}

function extractClaudeToolUses(content) {
  if (!Array.isArray(content)) return [];
  return content.filter((part) => part && part.type === 'tool_use');
}

function claudeToolQuestion(toolUse) {
  const input = toolUse?.input || {};
  return compactCodexSessionMessage(
    input.question
      || input.prompt
      || input.message
      || input.description
      || extractCodexSessionContent(input.questions)
      || '',
    '',
  );
}

function summarizeClaudeToolUses(toolUses) {
  const names = toolUses
    .map((tool) => String(tool?.name || '').trim())
    .filter(Boolean);
  if (names.length === 0) return '';
  return `Claude Code 正在使用 ${Array.from(new Set(names)).slice(0, 3).join('、')}`;
}

function parseClaudeSessionFile(filePath, text, mtimeMs) {
  const session = {
    id: path.basename(filePath, '.jsonl'),
    cwd: '',
    path: filePath,
    updatedAt: mtimeMs,
    eventAt: mtimeMs,
    ackKey: '',
    title: '',
    status: CODEX_STATUS.WORKING,
    message: '',
    progressMessages: [],
  };
  let lastUserAt = 0;
  let lastWorkAt = 0;
  let lastProgress = '';
  const progressMessages = [];
  let lastAssistantAt = 0;
  let lastAssistant = '';
  let lastProblemAt = 0;
  let lastProblem = '';
  const lines = text.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    const eventAt = Date.parse(event.timestamp || '') || mtimeMs;
    session.id = event.sessionId || session.id;
    session.cwd = event.cwd || session.cwd;

    if (event.type === 'user') {
      const content = event.message?.content;
      if (Array.isArray(content) && content.some((part) => part?.type === 'tool_result')) {
        lastWorkAt = Math.max(lastWorkAt, eventAt);
      } else {
        lastUserAt = Math.max(lastUserAt, eventAt);
      }
      continue;
    }

    if (event.type !== 'assistant') continue;

    const message = event.message || {};
    const content = message.content;
    const textParts = extractClaudeTextParts(content);
    const textMessage = compactCodexSessionMessage(textParts.join('\n\n'), '');
    const toolUses = extractClaudeToolUses(content);
    const askTool = toolUses.find((tool) => String(tool?.name || '').toLowerCase() === 'askuserquestion');
    if (askTool) {
      lastProblemAt = eventAt;
      lastProblem = claudeToolQuestion(askTool) || 'Claude Code 需要你回复或处理';
      continue;
    }

    if (message.stop_reason === 'end_turn') {
      lastAssistantAt = eventAt;
      lastAssistant = textMessage || 'Claude Code 执行完毕。';
      continue;
    }

    if (textMessage) {
      lastWorkAt = Math.max(lastWorkAt, eventAt);
      lastProgress = textMessage;
      pushCodexProgressMessage(progressMessages, textMessage, eventAt);
    } else if (toolUses.length > 0) {
      const toolSummary = summarizeClaudeToolUses(toolUses);
      lastWorkAt = Math.max(lastWorkAt, eventAt);
      lastProgress = toolSummary || lastProgress;
      if (toolSummary) pushCodexProgressMessage(progressMessages, toolSummary, eventAt);
    } else {
      lastWorkAt = Math.max(lastWorkAt, eventAt);
    }
  }

  const title = claudeSessionTitle(session);
  const prefix = `[${title}]`;
  session.progressMessages = progressMessages.slice(-8).map((message, index) => ({
    id: `claude-progress-${session.id}-${Math.round(message.createdAt)}-${index}`,
    role: 'system',
    content: `${prefix} ${message.content}`,
    createdAt: message.createdAt,
  }));
  const latestActivityAt = Math.max(lastUserAt, lastWorkAt, lastAssistantAt, lastProblemAt, mtimeMs);
  if (lastProblemAt && lastProblemAt >= lastAssistantAt && lastProblemAt >= lastUserAt && lastProblemAt >= lastWorkAt) {
    session.status = CODEX_STATUS.NEEDS_INPUT;
    session.message = `${prefix} ${lastProblem}`;
    session.eventAt = lastProblemAt;
  } else if (lastAssistantAt && lastAssistantAt >= lastUserAt && lastAssistantAt >= lastWorkAt) {
    session.status = CODEX_STATUS.DONE;
    session.message = `${prefix} ${lastAssistant}`;
    session.eventAt = lastAssistantAt;
  } else {
    session.status = CODEX_STATUS.WORKING;
    session.message = `${prefix} ${lastProgress || 'Claude Code 正在工作中'}`;
    session.eventAt = latestActivityAt;
  }
  session.updatedAt = latestActivityAt;
  session.title = title;
  session.ackKey = `${session.id}:${session.status}:${Math.round(session.eventAt)}`;
  return session;
}

async function getInheritedClaudeCodingState() {
  const root = path.join(app.getPath('home'), '.claude', 'projects');
  const nowMs = Date.now();
  const files = await listCodexSessionFiles(root);
  const candidates = [];
  for (const filePath of files) {
    let stat;
    try {
      stat = await fsp.stat(filePath);
    } catch {
      continue;
    }
    if (nowMs - stat.mtimeMs > CODEX_INHERIT_LOOKBACK_MS) continue;
    candidates.push({ filePath, mtimeMs: stat.mtimeMs });
  }
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const sessions = [];
  for (const item of candidates.slice(0, 12)) {
    try {
      const file = await fsp.open(item.filePath, 'r');
      const stat = await file.stat();
      const size = Math.min(240_000, stat.size);
      const buffer = Buffer.alloc(size);
      await file.read(buffer, 0, size, Math.max(0, stat.size - size));
      await file.close();
      sessions.push(parseClaudeSessionFile(item.filePath, buffer.toString('utf8'), item.mtimeMs));
    } catch {
      // Ignore unreadable sessions.
    }
  }
  const unacknowledged = sessions.filter((session) => (
    session.status === CODEX_STATUS.WORKING
    || inheritedClaudeAcknowledged.get(session.id) !== session.ackKey
  ));
  const actionable = unacknowledged.filter((session) => session.status !== CODEX_STATUS.WORKING);
  const activeWorking = unacknowledged.filter((session) => (
    session.status === CODEX_STATUS.WORKING
    && nowMs - session.updatedAt <= CODEX_INHERIT_ACTIVE_MS
  ));
  const problemSessions = actionable.filter((session) => session.status === CODEX_STATUS.NEEDS_INPUT);
  const doneSessions = actionable.filter((session) => session.status === CODEX_STATUS.DONE);
  const status = problemSessions.length > 0
    ? CODEX_STATUS.NEEDS_INPUT
    : activeWorking.length > 0
      ? CODEX_STATUS.WORKING
      : doneSessions.length > 0
        ? CODEX_STATUS.DONE
        : CODEX_STATUS.IDLE;
  const selected = status === CODEX_STATUS.NEEDS_INPUT
    ? problemSessions
    : status === CODEX_STATUS.WORKING
      ? activeWorking
      : status === CODEX_STATUS.DONE
        ? doneSessions
        : [];
  const messages = selected.slice(0, 5).map((session) => ({
    id: `claude-inherit-${session.id}-${Math.round(session.updatedAt)}`,
    role: session.status === CODEX_STATUS.NEEDS_INPUT ? 'error' : session.status === CODEX_STATUS.DONE ? 'codex' : 'system',
    content: session.message,
    createdAt: session.updatedAt,
  }));
  if (messages.length === 0) {
    messages.push({
      id: 'claude-inherit-empty',
      role: 'system',
      content: status === CODEX_STATUS.IDLE ? '没有新的 Claude Code 通知。' : '没有检测到最近活跃的 Claude Code session。',
      createdAt: Date.now(),
    });
  } else if (status === CODEX_STATUS.WORKING) {
    messages.unshift({
      id: 'claude-inherit-working',
      role: 'system',
      content: 'Claude Code 正在工作中。',
      createdAt: Date.now(),
    });
  }
  return {
    provider: 'claude',
    status,
    messages,
    sessions: selected.slice(0, 12).map((session) => ({
      id: session.id,
      ackKey: session.ackKey,
      title: session.title,
      status: session.status,
      message: session.message,
      progressMessages: session.status === CODEX_STATUS.WORKING ? session.progressMessages : [],
      updatedAt: session.updatedAt,
      cwd: session.cwd,
      path: session.path,
    })),
  };
}

async function ackInheritedClaudeCodingSessions({ ackKeys } = {}) {
  if (Array.isArray(ackKeys)) {
    for (const item of ackKeys) {
      if (!item || typeof item !== 'object') continue;
      const id = String(item.id || '');
      const ackKey = String(item.ackKey || '');
      if (id && ackKey) inheritedClaudeAcknowledged.set(id, ackKey);
    }
  } else {
    const state = await getInheritedClaudeCodingState();
    for (const session of state.sessions || []) {
      if (session.status !== CODEX_STATUS.WORKING && session.id && session.ackKey) {
        inheritedClaudeAcknowledged.set(session.id, session.ackKey);
      }
    }
  }
  return getInheritedClaudeCodingState();
}

const keyStore = new Map();

const handlers = {
  show_settings_cmd: () => showSettingsWindow(),
  show_chat_window: () => showChatWindow(),
  show_compact_chat_window: (args) => showCompactChatWindow(args, true),
  position_compact_chat_window: (args) => showCompactChatWindow(args, false),
  hide_compact_chat_window: () => windows.get('compact-chat')?.hide(),
  is_compact_chat_visible: () => {
    const win = windows.get('compact-chat');
    return Boolean(win && !win.isDestroyed() && win.isVisible());
  },
  focus_compact_chat_window: () => {
    const win = windows.get('compact-chat');
    if (win && !win.isDestroyed()) {
      applyFloatingFullscreenBehavior(win, { force: true });
      win.show();
      win.moveTop();
      win.focus();
    }
  },
  focus_compact_chat_input: () => broadcast('compact-chat:focus-input', {}),
  show_pet_window: () => showPetWindow(),
  hide_pet_window: () => hidePetWindow(),
  quit_app: () => app.quit(),
  pin_pet_above_fullscreen_cmd: () => applyFloatingFullscreenBehavior(windows.get('pet'), { force: true }),
  unpin_pet_from_fullscreen_cmd: () => windows.get('pet')?.setAlwaysOnTop(false),
  start_topmost_guard: () => {
    ensureTopmostGuard();
  },
  stop_topmost_guard: () => {
    if (topmostGuard) clearInterval(topmostGuard);
    topmostGuard = null;
  },
  import_pet_image: importPetImage,
  list_pet_images: listPetImages,
  delete_pet_image: async ({ filePath }) => {
    ensureUserAsset(filePath);
    await fsp.unlink(filePath);
  },
  read_pet_image_data_url: readPetImageDataUrl,
  resize_compact_chat_window: ({ height }) => {
    const win = windows.get('compact-chat');
    if (!win || win.isDestroyed()) return;
    const [width, currentHeight] = win.getSize();
    const nextHeight = Math.max(1, Math.round(Number(height) || currentHeight));
    if (Math.abs(currentHeight - nextHeight) <= 1) return;
    win.setSize(width, nextHeight);
    applyFloatingFullscreenBehavior(win);
  },
  capture_screen_region: captureScreenRegion,
  open_external_url: ({ url }) => shell.openExternal(url),
  chat_completion: chatCompletion,
  test_ai_connection: testAiConnection,
  transcribe_audio: transcribeAudio,
  synthesize_speech: synthesizeSpeech,
  can_start_speech_recognition: () => true,
  check_distraction: checkDistraction,
  coding_get_state: () => publishCodingState(),
  coding_get_claude_state: () => publishClaudeCodingState(),
  coding_get_inherited_state: getInheritedCodingState,
  coding_ack_inherited_sessions: ackInheritedCodingSessions,
  coding_get_claude_inherited_state: getInheritedClaudeCodingState,
  coding_ack_claude_inherited_sessions: ackInheritedClaudeCodingSessions,
  coding_send_message: (args) => (args?.provider === 'claude' ? sendClaudeCodingMessage(args) : sendCodingMessage(args)),
  coding_clear: () => {
    codingState.messages = [];
    if (!codingState.running) codingState.status = CODEX_STATUS.DONE;
    return publishCodingState();
  },
  coding_clear_claude: () => {
    claudeCodingState.messages = [];
    claudeCodingState.threadId = '';
    if (!claudeCodingState.running) claudeCodingState.status = CODEX_STATUS.DONE;
    return publishClaudeCodingState();
  },
  set_app_icon: ({ path: iconPath }) => setAppIcon(iconPath),
  save_api_key: ({ keyringRef, key }) => {
    keyStore.set(keyringRef, key);
  },
  get_api_key: ({ keyringRef }) => keyStore.get(keyringRef) || '',
  delete_api_key: ({ keyringRef }) => {
    keyStore.delete(keyringRef);
  },
};

ipcMain.handle('desksprite:invoke', async (_event, command, args) => {
  const handler = handlers[command];
  if (!handler) throw new Error(`Unknown command: ${command}`);
  return handler(args || {});
});

ipcMain.handle('desksprite:emit', (_event, channel, payload) => {
  broadcast(channel, payload);
});

ipcMain.handle('desksprite:window', (event, action, value) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return null;
  if (action === 'outerPosition') {
    const [x, y] = win.getPosition();
    return { x, y };
  }
  if (action === 'outerSize') {
    const [width, height] = win.getSize();
    return { width, height };
  }
  if (action === 'setPosition') {
    win.setPosition(Math.round(value.x), Math.round(value.y));
    return null;
  }
  if (action === 'setSize') {
    win.setSize(Math.round(value.width), Math.round(value.height));
    return null;
  }
  return null;
});

ipcMain.handle('desksprite:current-monitor', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const bounds = win?.getBounds() || screen.getPrimaryDisplay().bounds;
  const display = screen.getDisplayMatching(bounds);
  return {
    scaleFactor: 1,
    workArea: {
      position: { x: display.workArea.x, y: display.workArea.y },
      size: { width: display.workArea.width, height: display.workArea.height },
    },
  };
});

ipcMain.handle('desksprite:open-dialog', async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win || undefined, {
    properties: options.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
    filters: options.filters || [],
  });
  if (result.canceled) return null;
  return options.multiple ? result.filePaths : result.filePaths[0] || null;
});

function registerProtocols() {
  protocol.handle('desksprite-app', async (request) => {
    const url = new URL(request.url);
    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filePath = path.join(app.getAppPath(), 'dist', pathname.replace(/^\/+/, ''));
    return new Response(await fsp.readFile(filePath), {
      headers: { 'content-type': contentType(filePath) },
    });
  });
  protocol.handle('desksprite-file', async (request) => {
    const filePath = decodeURIComponent(new URL(request.url).pathname.replace(/^\/+/, ''));
    return new Response(await fsp.readFile(filePath), {
      headers: { 'content-type': contentType(filePath) },
    });
  });
}

app.whenReady().then(() => {
  registerProtocols();
  setAppIcon('assets/idle/png/idle.png');
  createPetWindow();
  ensureTopmostGuard();
  globalShortcut.register('CommandOrControl+Shift+Space', () => broadcast('shortcut:chat-focus', {}));
  app.on('activate', () => {
    if (!windows.get('pet')) createPetWindow();
  });
});

app.on('window-all-closed', () => {
  // Keep the menu-bar style utility process alive after auxiliary windows close.
});

app.on('before-quit', () => {
  if (topmostGuard) clearInterval(topmostGuard);
  globalShortcut.unregisterAll();
});
