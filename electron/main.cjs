const {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeTheme,
  nativeImage,
  protocol,
  powerMonitor,
  safeStorage,
  screen,
  shell,
  systemPreferences,
  Tray,
} = require('electron');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { randomUUID } = require('node:crypto');
const { execFile, spawn } = require('node:child_process');
const {
  compactMessage: compactCodingStatusMessage,
  describeCodexNotice,
  describeCodexRequest,
  describeCodexSessionProblemEvent,
  describeNoOutput,
  extractTextFromValue: extractCodexTextFromValue,
  isBlockingProblemText,
  isTransientProgressText,
  resolveSessionStatus,
} = require('./codingStatus.cjs');
const { createDeferredWindowShowController, createPetVisibilityController } = require('./windowLifecycle.cjs');
const {
  hasSeenWelcomePermissionPrompt,
  markWelcomePermissionPromptSeen,
  readImageDataUrl,
} = require('./welcomePermissionPrompt.cjs');
const { createSecureKeyStore } = require('./secureKeyStore.cjs');
const { autoUpdater } = require('electron-updater');

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
const debugCompactChatEnabled =
  process.env.DESKSPRITE_DEBUG_COMPACT_CHAT === '1' ||
  process.argv.includes('--debug-compact-chat');
const debugTimelineEnabled =
  process.env.DESKSPRITE_DEBUG_TIMELINE === '1' ||
  process.argv.includes('--debug-timeline');
const windows = new Map();
const windowShowController = createDeferredWindowShowController();
const petVisibilityController = createPetVisibilityController();
const updaterState = {
  initialized: false,
  checking: false,
  downloaded: false,
  installPromptOpen: false,
  lastError: '',
  lastCheckAt: 0,
};
let topmostGuard = null;
let topmostSuppressed = false;
let compactChatHiddenUntil = 0;
let petContextMenuOpen = false;
let currentAppIconPath = path.join(app.getAppPath(), 'public', 'assets', 'idle', 'png', 'idle.png');
let secureKeyStore = null;
const scheduleKnowledgeCache = new Map();
const scheduleKnowledgeInFlight = new Map();
let tray = null;
let currentAppIcon = null;
const floatingConfiguredWindows = new WeakSet();
const IGNORED_DISTRACTION_APPS = ['DeskCat', 'PawPal', 'Electron'];
const CODEX_STATUS = {
  IDLE: 'idle',
  NEEDS_INPUT: 'needs-input',
  WORKING: 'working',
  DONE: 'done',
};
const BUILTIN_CHAT_API_KEY_FALLBACK = 'sk-PByFO1hQJwL32oh0xy3TyAov6bDwJdc91phAdmDDjkU3K6KO';
const BUILTIN_VOICE_API_KEY_FALLBACK = 'sk-RUPf8NG93A0bg6Phr3GvHaEXj1z2vFKb2eLIMvgjuaGCLMS7';
const SCHEDULE_PERMISSION_PROMPT_STATE_FILE = 'schedule-permission-prompts-v1.json';
const SCHEDULE_KNOWLEDGE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CODEX_HTTP_PROXY = 'http://127.0.0.1:6478';
const DEFAULT_CODEX_SOCKS_PROXY = 'socks5://127.0.0.1:6478';
const CURRENT_CODEX_THREAD_ID =
  process.env.DESKCAT_CODEX_THREAD_ID ||
  process.env.DESKSPRITE_CODEX_THREAD_ID ||
  process.env.CODEX_THREAD_ID ||
  '';
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
const deskcatStartedAt = Date.now();
let claudeCodingSessionStarted = false;
const CODEX_INHERIT_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const CODEX_INHERIT_ACTIVE_MS = 90 * 1000;
const CODING_NO_OUTPUT_TIMEOUT_MS = 5 * 60 * 1000;
const PERMISSION_PROMPT_WIDTH = 376;
const PERMISSION_PROMPT_HEIGHT = 232;
const WELCOME_PROMPT_WIDTH = 520;
const WELCOME_PROMPT_HEIGHT = 560;
const PERMISSION_SPACE_ANCHOR_SIZE = 1;
const inheritedCodingAcknowledged = new Map();
const inheritedCodingSeenActive = new Set();
const permissionPromptResolvers = new Map();
const codexAppServer = {
  child: null,
  buffer: '',
  nextId: 1,
  pending: new Map(),
  ready: null,
  loadedThreadId: '',
  activeTurn: null,
};

function isChineseLocale() {
  return /^zh\b/i.test(app.getLocale?.() || '');
}

function chooseLocaleText(zh, en) {
  return isChineseLocale() ? zh : en;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

app.setName('DeskCat');
if (process.platform === 'darwin') app.setActivationPolicy('regular');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'deskcat-app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
  {
    scheme: 'deskcat-file',
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
    additionalArguments: [`--deskcat-label=${label}`],
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
  };
}

function rendererUrl(label) {
  if (isDev) return `${devUrl}/#${label}`;
  return `deskcat-app://localhost/index.html#${label}`;
}

function send(win, channel, payload) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send(`deskcat:event:${channel}`, payload);
}

function broadcast(channel, payload) {
  for (const win of windows.values()) send(win, channel, payload);
}

function updateStatusPayload(extra = {}) {
  return {
    checking: updaterState.checking,
    downloaded: updaterState.downloaded,
    lastError: updaterState.lastError,
    lastCheckAt: updaterState.lastCheckAt,
    version: app.getVersion(),
    ...extra,
  };
}

function broadcastUpdateStatus(status, extra = {}) {
  broadcast('app:update-status', updateStatusPayload({ status, ...extra }));
}

function setupAutoUpdater() {
  if (updaterState.initialized) return;
  updaterState.initialized = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    updaterState.checking = true;
    updaterState.lastError = '';
    broadcastUpdateStatus('checking');
  });

  autoUpdater.on('update-available', (info) => {
    broadcastUpdateStatus('available', {
      updateVersion: info?.version || '',
      releaseName: info?.releaseName || '',
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    updaterState.checking = false;
    broadcastUpdateStatus('not-available', { updateVersion: info?.version || '' });
  });

  autoUpdater.on('download-progress', (progress) => {
    broadcastUpdateStatus('downloading', {
      percent: Math.round(Number(progress?.percent || 0)),
      transferred: progress?.transferred || 0,
      total: progress?.total || 0,
    });
  });

  autoUpdater.on('update-downloaded', async (info) => {
    updaterState.checking = false;
    updaterState.downloaded = true;
    broadcastUpdateStatus('downloaded', { updateVersion: info?.version || '' });
    await promptInstallDownloadedUpdate(info);
  });

  autoUpdater.on('error', (error) => {
    updaterState.checking = false;
    updaterState.lastError = error instanceof Error ? error.message : String(error || '');
    broadcastUpdateStatus('error');
  });
}

async function promptInstallDownloadedUpdate(info = {}) {
  if (updaterState.installPromptOpen) return;
  updaterState.installPromptOpen = true;
  try {
    const target = windows.get('settings') || windows.get('chat') || windows.get('pet');
    const options = {
      type: 'info',
      buttons: [chooseLocaleText('重启安装', 'Restart and Install'), chooseLocaleText('稍后', 'Later')],
      defaultId: 0,
      cancelId: 1,
      title: chooseLocaleText('DeskCat 更新已下载', 'DeskCat Update Downloaded'),
      message: chooseLocaleText(
        `DeskCat ${info?.version || ''} 已下载完成。`,
        `DeskCat ${info?.version || ''} has been downloaded.`,
      ),
      detail: chooseLocaleText(
        '重启后会自动安装新版本。',
        'The new version will be installed after restart.',
      ),
    };
    const result = target && !target.isDestroyed()
      ? await dialog.showMessageBox(target, options)
      : await dialog.showMessageBox(options);
    if (result.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  } finally {
    updaterState.installPromptOpen = false;
  }
}

async function checkForAppUpdates({ manual = false } = {}) {
  if (isDev || !app.isPackaged) {
    const skipped = updateStatusPayload({ status: 'skipped', reason: 'development' });
    if (manual) return skipped;
    return null;
  }
  setupAutoUpdater();
  if (updaterState.checking && !manual) return updateStatusPayload({ status: 'checking' });
  updaterState.lastCheckAt = Date.now();
  try {
    const result = await autoUpdater.checkForUpdatesAndNotify();
    return updateStatusPayload({
      status: result?.updateInfo ? 'checked' : 'not-available',
      updateVersion: result?.updateInfo?.version || '',
    });
  } catch (error) {
    updaterState.checking = false;
    updaterState.lastError = error instanceof Error ? error.message : String(error || '');
    broadcastUpdateStatus('error');
    if (manual) throw error;
    return updateStatusPayload({ status: 'error' });
  }
}

function compactChatWindowSnapshot(win) {
  if (!win || win.isDestroyed()) return { exists: false };
  return {
    exists: true,
    visible: win.isVisible(),
    focused: win.isFocused(),
    alwaysOnTop: win.isAlwaysOnTop(),
    bounds: win.getBounds(),
  };
}

function debugCompactChat(message, details = {}) {
  const isImeEvent = message.includes('ime') || message.includes('focus input') || message.includes('renderer');
  if (!debugCompactChatEnabled && !isImeEvent) return;
  console.info('[compact-chat:debug]', message, {
    ...details,
    platform: process.platform,
    at: Date.now(),
  });
}

function applyFloatingFullscreenBehavior(win, options = {}) {
  if (!win || win.isDestroyed()) return;
  const force = Boolean(options.force);
  const isCompactChat = win === windows.get('compact-chat');
  const isPet = win === windows.get('pet');
  if (isCompactChat) {
    debugCompactChat('apply floating requested', { force, snapshot: compactChatWindowSnapshot(win) });
  }
  if (topmostSuppressed) {
    win.setAlwaysOnTop(false);
    if (isCompactChat) debugCompactChat('apply floating suppressed', { snapshot: compactChatWindowSnapshot(win) });
    return;
  }
  if (process.platform === 'darwin') {
    if (!force && floatingConfiguredWindows.has(win) && win.isAlwaysOnTop()) return;
    if (app.dock) app.dock.show();
    win.setSkipTaskbar(false);
    win.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    });
    win.setFullScreenable(false);
    if (isCompactChat) {
      win.setAlwaysOnTop(true, 'floating', 0);
    } else {
      const relativeLevel = isPet && petContextMenuOpen ? 2 : 1;
      win.setAlwaysOnTop(true, 'screen-saver', relativeLevel);
    }
    floatingConfiguredWindows.add(win);
    if (force) win.moveTop();
    if (isCompactChat) debugCompactChat('apply floating darwin done', { force, snapshot: compactChatWindowSnapshot(win) });
  } else {
    if (!force && !isCompactChat && floatingConfiguredWindows.has(win) && win.isAlwaysOnTop()) return;
    const level = isCompactChat ? 'screen-saver' : 'normal';
    win.setAlwaysOnTop(true, level);
    win.setSkipTaskbar(true);
    floatingConfiguredWindows.add(win);
    if (isCompactChat) debugCompactChat('apply floating non-darwin done', { level, force, snapshot: compactChatWindowSnapshot(win) });
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

function centerBoundsForSize(targetWidth, targetHeight) {
  const display = screen.getPrimaryDisplay();
  const work = display.workArea;
  const width = Math.min(targetWidth, Math.round(work.width * 0.92));
  const height = Math.min(targetHeight, Math.round(work.height * 0.86));
  return {
    width,
    height,
    x: Math.round(work.x + (work.width - width) / 2),
    y: Math.round(work.y + (work.height - height) / 2),
  };
}

function opaqueWindowBackgroundColor() {
  return nativeTheme.shouldUseDarkColors ? '#1f1f1f' : '#f4f5f7';
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function revealPermissionDialogSpace() {
  if (process.platform !== 'darwin') return null;
  const work = screen.getPrimaryDisplay().workArea;
  const existing = windows.get('permission-space-anchor');
  const win = existing && !existing.isDestroyed()
    ? existing
    : new BrowserWindow({
      x: work.x + 1,
      y: work.y + 1,
      width: PERMISSION_SPACE_ANCHOR_SIZE,
      height: PERMISSION_SPACE_ANCHOR_SIZE,
      show: false,
      frame: false,
      transparent: true,
      opacity: 0,
      backgroundColor: '#00000000',
      resizable: false,
      movable: false,
      fullscreenable: false,
      skipTaskbar: true,
      focusable: true,
      webPreferences: preload('permission-space-anchor'),
    });
  if (!windows.has('permission-space-anchor')) {
    windows.set('permission-space-anchor', win);
    win.loadURL('data:text/html,<html><body></body></html>').catch(() => {});
    win.on('closed', () => windows.delete('permission-space-anchor'));
  }
  win.setVisibleOnAllWorkspaces(false);
  if (!win.isVisible()) win.show();
  app.focus({ steal: true });
  win.focus();
  win.moveTop();
  await delay(220);
  app.focus({ steal: true });
  win.focus();
  await delay(80);
  return win;
}

async function withPermissionDialogSpaceFocus(operation) {
  const anchor = await revealPermissionDialogSpace();
  try {
    return await operation(anchor);
  } finally {
    if (anchor && !anchor.isDestroyed()) {
      setTimeout(() => {
        if (!anchor.isDestroyed()) anchor.close();
      }, 1200);
    }
  }
}

function showWindowAfterInitialPaint(win, { focus = false } = {}) {
  windowShowController.requestShow(win, { focus });
}

function markRendererReady(win) {
  windowShowController.markReady(win);
}

function resolveAppIconPath(iconPath) {
  if (!iconPath || typeof iconPath !== 'string') return currentAppIconPath;
  if (iconPath.startsWith('assets/')) {
    return path.join(app.getAppPath(), 'public', iconPath);
  }
  if (path.isAbsolute(iconPath)) return iconPath;
  const publicPath = path.join(app.getAppPath(), 'public', iconPath.replace(/^\/+/, ''));
  if (fs.existsSync(publicPath)) return publicPath;
  return path.resolve(app.getAppPath(), iconPath);
}

function resolveBundledAppIconPath() {
  const candidates = [
    path.join(app.getAppPath(), 'dist', 'favicon.svg'),
    path.join(app.getAppPath(), 'public', 'favicon.svg'),
    path.join(app.getAppPath(), 'src-tauri', 'icons', 'icon.png'),
    currentAppIconPath,
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || currentAppIconPath;
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
      tray.setToolTip('DeskCat');
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

function browserUrlScript(appName) {
  switch (appName) {
    case 'Safari':
      return 'tell application "Safari" to return URL of front document';
    case 'Google Chrome':
      return 'tell application "Google Chrome" to return URL of active tab of front window';
    case 'Chromium':
      return 'tell application "Chromium" to return URL of active tab of front window';
    case 'Brave Browser':
      return 'tell application "Brave Browser" to return URL of active tab of front window';
    case 'Microsoft Edge':
      return 'tell application "Microsoft Edge" to return URL of active tab of front window';
    case 'Vivaldi':
      return 'tell application "Vivaldi" to return URL of active tab of front window';
    case 'Arc':
      return 'tell application "Arc" to return URL of active tab of front window';
    default:
      return '';
  }
}

function musicStatusScript(appName) {
  if (appName !== 'Music' && appName !== 'Spotify') return '';
  return `
tell application "${appName}"
  if player state is playing then
    set trackName to (name of current track)
    set trackArtist to (artist of current track)
    return "music|${appName}|" & trackName & " - " & trackArtist
  end if
end tell
return ""
`;
}

function backgroundProcessScript() {
  return `
set oldDelimiters to AppleScript's text item delimiters
set AppleScript's text item delimiters to linefeed
tell application "System Events"
  set processNames to name of every application process
end tell
set processText to processNames as text
set AppleScript's text item delimiters to oldDelimiters
return processText
`;
}

function petPresenceContextScript() {
  return `
set frontApp to ""
set frontWindow to ""
set isFullscreen to false
set runningApps to ""

tell application "System Events"
  set frontAppProcess to first application process whose frontmost is true
  set frontApp to name of frontAppProcess
  try
    set frontWindow to name of front window of frontAppProcess
  end try
  try
    set isFullscreen to value of attribute "AXFullScreen" of front window of frontAppProcess
  end try
  set runningApps to name of every application process whose background only is false
end tell

return frontApp & linefeed & frontWindow & linefeed & isFullscreen & linefeed & (runningApps as text)
`;
}

function readActiveWindow() {
  if (process.platform !== 'darwin') {
    return Promise.resolve({ supported: false, appName: '', windowTitle: '', error: 'unsupported' });
  }
  return new Promise((resolve) => {
    execFile('/usr/bin/osascript', ['-e', activeWindowScript()], { timeout: 2500 }, (error, stdout, stderr) => {
      if (error) {
        timelineDebugLog({ stage: 'osascript:error', error: stderr || error.message || String(error) });
        resolve({
          supported: true,
          appName: '',
          windowTitle: '',
          error: stderr || error.message || String(error),
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

function parseTimelineMarkerLine(line) {
  const [type = '', name = '', detail = ''] = String(line || '').split('|');
  return type && name ? { type, name, detail } : null;
}

function readBrowserUrl(appName) {
  const script = browserUrlScript(appName);
  if (!script) return Promise.resolve('');
  return new Promise((resolve) => {
    execFile('/usr/bin/osascript', ['-e', script], { timeout: 1800 }, (error, stdout) => {
      if (error) {
        resolve('');
        return;
      }
      resolve(String(stdout || '').trim());
    });
  });
}

function readNowPlaying(appName) {
  const script = musicStatusScript(appName);
  if (!script) return Promise.resolve({ marker: null, status: 'unsupported' });
  return new Promise((resolve) => {
    execFile('/usr/bin/osascript', ['-e', script], { timeout: 1800 }, (error, stdout) => {
      if (error) {
        timelineDebugLog({ stage: 'music:error', appName, error: error.message || String(error) });
        resolve({ marker: null, status: 'error' });
        return;
      }
      const marker = parseTimelineMarkerLine(String(stdout || '').trim());
      resolve({ marker, status: marker ? 'playing' : 'paused' });
    });
  });
}

function isNeteaseMusicApp(appName) {
  const lower = String(appName || '').toLowerCase();
  return lower.includes('netease') || lower.includes('网易云');
}

function neteaseStoragePath(...parts) {
  const home = app?.getPath?.('home') || process.env.HOME || '';
  return path.join(home, 'Library', 'Containers', 'com.netease.163music', 'Data', ...parts);
}

function parseNeteaseCacheResourceId(name) {
  const match = String(name || '').match(/^(\d+)-_-_/);
  return match?.[1] || '';
}

async function readNeteaseRecentCacheTracks(dir, maxCount = 16) {
  try {
    const names = await fsp.readdir(dir);
    const items = [];
    await Promise.all(names.map(async (name) => {
      const resourceId = parseNeteaseCacheResourceId(name);
      if (!resourceId || !/\.(info|idx!|uc!)$/.test(name)) return;
      try {
        const stat = await fsp.stat(path.join(dir, name));
        if (stat.isFile()) items.push({ resourceId, mtimeMs: stat.mtimeMs });
      } catch {
        // Ignore individual cache files that disappear while being sampled.
      }
    }));
    const byId = new Map();
    for (const item of items) {
      const existing = byId.get(item.resourceId);
      if (!existing || item.mtimeMs > existing.mtimeMs) byId.set(item.resourceId, item);
    }
    return Array.from(byId.values())
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, maxCount);
  } catch {
    return [];
  }
}

function parseNeteaseTrack(jsonText, fallbackId) {
  try {
    const track = JSON.parse(jsonText || '{}');
    const title = String(track.name || '').trim();
    const artists = Array.isArray(track.artists)
      ? track.artists.map((artist) => artist?.name).filter(Boolean).join(', ')
      : '';
    const detail = title && artists ? `${title} - ${artists}` : title;
    const durationMs = Number(track.duration) || Number(track.dt) || 0;
    return {
      detail: detail || (fallbackId ? `track ${fallbackId}` : 'playing'),
      durationMs,
    };
  } catch {
    return {
      detail: fallbackId ? `track ${fallbackId}` : 'playing',
      durationMs: 0,
    };
  }
}

function readNeteaseLatestTrack() {
  const dbPath = neteaseStoragePath('Documents', 'storage', 'sqlite_storage.sqlite3');
  const query = `
select pc.resourceId, pc.updateTime, pc.playDuration, coalesce(dt.jsonStr, ht.jsonStr, '')
from playingCount pc
left join dbTrack dt on dt.id = pc.resourceId
left join historyTracks ht on ht.id = pc.resourceId
order by pc.updateTime desc
limit 1;
`;
  return new Promise((resolve) => {
    execFile('/usr/bin/sqlite3', ['-separator', '\x1f', dbPath, query], { timeout: 1800 }, (error, stdout) => {
      if (error) {
        resolve(null);
        return;
      }
      const [resourceId = '', updateTimeRaw = '0', playDurationRaw = '0', jsonText = ''] = String(stdout || '').trim().split('\x1f');
      const updateTime = Number(updateTimeRaw) || 0;
      const parsedTrack = parseNeteaseTrack(jsonText, resourceId);
      const playDurationMs = Math.max(0, Number(playDurationRaw) || 0) * 1000;
      resolve({
        resourceId,
        updateTime,
        detail: parsedTrack.detail,
        durationMs: parsedTrack.durationMs || playDurationMs,
      });
    });
  });
}

function readNeteaseTracksByIds(ids) {
  const cleanIds = Array.from(new Set((ids || []).map((id) => String(id || '').trim()).filter((id) => /^\d+$/.test(id))));
  if (cleanIds.length === 0) return Promise.resolve([]);
  const dbPath = neteaseStoragePath('Documents', 'storage', 'sqlite_storage.sqlite3');
  const idList = cleanIds.map((id) => `'${id}'`).join(',');
  const query = `
select ids.id, coalesce(pc.updateTime, 0), coalesce(pc.playDuration, 0), coalesce(dt.jsonStr, ht.jsonStr, '')
from (
  ${cleanIds.map((id) => `select '${id}' as id`).join(' union all ')}
) ids
left join playingCount pc on pc.resourceId = ids.id
left join dbTrack dt on dt.id = ids.id
left join historyTracks ht on ht.id = ids.id
where ids.id in (${idList});
`;
  return new Promise((resolve) => {
    execFile('/usr/bin/sqlite3', ['-separator', '\x1f', dbPath, query], { timeout: 1800 }, (error, stdout) => {
      if (error) {
        resolve([]);
        return;
      }
      const rows = String(stdout || '').trim().split('\n').filter(Boolean).map((line) => {
        const [resourceId = '', updateTimeRaw = '0', playDurationRaw = '0', jsonText = ''] = line.split('\x1f');
        const parsedTrack = parseNeteaseTrack(jsonText, resourceId);
        const playDurationMs = Math.max(0, Number(playDurationRaw) || 0) * 1000;
        return {
          resourceId,
          updateTime: Number(updateTimeRaw) || 0,
          detail: parsedTrack.detail,
          durationMs: parsedTrack.durationMs || playDurationMs,
        };
      });
      resolve(rows);
    });
  });
}

async function readNeteaseNowPlaying(appName, minSegmentMs = 60_000) {
  const freshnessMs = Math.max(60_000, Number(minSegmentMs) || 60_000);
  const cacheDir = neteaseStoragePath('Caches', 'online_play_cache');
  const [latestTrack, cacheCandidates] = await Promise.all([
    readNeteaseLatestTrack(),
    readNeteaseRecentCacheTracks(cacheDir),
  ]);
  const cacheTrackRows = await readNeteaseTracksByIds(cacheCandidates.map((item) => item.resourceId));
  const trackById = new Map(cacheTrackRows.map((track) => [track.resourceId, track]));
  const newestCacheMtimeMs = cacheCandidates[0]?.mtimeMs || 0;
  const recentCacheIds = cacheCandidates
    .filter((item) => newestCacheMtimeMs - item.mtimeMs <= 8_000)
    .map((item) => item.resourceId);
  const cacheTrack = recentCacheIds
    .map((id) => trackById.get(id))
    .filter(Boolean)
    .sort((a, b) => (b.updateTime || 0) - (a.updateTime || 0))[0]
    || trackById.get(cacheCandidates[0]?.resourceId || '');
  const cacheTrackMtimeMs = cacheCandidates.find((item) => item.resourceId === cacheTrack?.resourceId)?.mtimeMs || 0;
  const track = cacheTrack && (!latestTrack || cacheTrackMtimeMs >= (latestTrack.updateTime || 0) || (cacheTrack.updateTime || 0) >= (latestTrack.updateTime || 0))
    ? cacheTrack
    : latestTrack;
  const activityFromSameTrackMs = Math.max(track?.updateTime || 0, track?.resourceId === cacheTrack?.resourceId ? cacheTrackMtimeMs : 0);
  const latestActivityMs = Math.max(activityFromSameTrackMs, track?.updateTime || 0);
  const ageMs = latestActivityMs > 0 ? Date.now() - latestActivityMs : Number.POSITIVE_INFINITY;
  const trackWindowMs = track?.durationMs
    ? Math.min(Math.max(track.durationMs + 30_000, freshnessMs), 20 * 60_000)
    : freshnessMs;
  if (latestActivityMs > 0 && ageMs <= trackWindowMs) {
    return {
      marker: { type: 'music', name: appName || 'NeteaseMusic', detail: track?.detail || 'playing' },
      status: `playing:${Math.round(ageMs / 1000)}s`,
    };
  }
  return {
    marker: null,
    status: latestActivityMs > 0 ? `paused:${Math.round(ageMs / 1000)}s` : 'paused:unknown',
  };
}

function readRunningProcessNames() {
  if (process.platform !== 'darwin') {
    return Promise.resolve([]);
  }
  return new Promise((resolve) => {
    execFile('/usr/bin/osascript', ['-e', backgroundProcessScript()], { timeout: 1800 }, (error, stdout, stderr) => {
      if (error) {
        const detail = stderr || error.message || String(error);
        timelineDebugLog({ stage: 'background:error', error: detail });
        resolve([]);
        return;
      }
      resolve(String(stdout || '').split('\n').map((line) => line.trim()).filter(Boolean));
    });
  });
}

function readShellProcessMarkers() {
  if (process.platform !== 'darwin') return Promise.resolve([]);
  return new Promise((resolve) => {
    execFile('/bin/ps', ['-axo', 'pid=', '-o', 'command='], { timeout: 1800 }, (error, stdout) => {
      if (error) {
        timelineDebugLog({ stage: 'terminal-process:error', error: error.message || String(error) });
        resolve([]);
        return;
      }
      const ownPid = String(process.pid);
      const lines = String(stdout || '').split('\n').map((line) => line.trim()).filter(Boolean);
      const commands = [];
      for (const line of lines) {
        const match = line.match(/^(\d+)\s+(.+)$/);
        if (!match || match[1] === ownPid) continue;
        const command = match[2];
        const lower = command.toLowerCase();
        if (!isTrackableTerminalCommand(lower)) continue;
        const normalized = normalizeTerminalCommand(command);
        if (!normalized) continue;
        if (!commands.includes(normalized)) commands.push(normalized);
      }
      const compacted = compactTerminalCommands(commands).slice(0, 8);
      resolve(compacted.map((detail) => ({ type: 'terminal', name: 'Terminal', detail })));
    });
  });
}

function isTrackableTerminalCommand(lower) {
  if (/(osascript|\/bin\/ps|electron\/main\.cjs|powerd\.bundle|containermanagerd|launchd|xpcproxy|cfprefsd|runningboardd|distnoted|nsurlsessiond|trustd|accountsd|bird|cloudd)/.test(lower)) {
    return false;
  }
  if (/\/applications\/codex\.app\/contents\//.test(lower)) return false;
  if (/\bcodex\s+app-server\b/.test(lower)) return false;
  if (/(codex helper|--type=gpu-process|--type=utility|--type=renderer|networkservice)/.test(lower)) return false;
  return /\b(?:pnpm|npm|yarn|bun|cargo|uvicorn|pytest|python|node|tsx|ts-node|next|claude|claude-code|codex)\b/.test(lower)
    || /electron:dev|@anthropic-ai\/claude-code|codex\s+exec/.test(lower);
}

function normalizeTerminalCommand(command) {
  const clean = String(command || '').replace(/\s+/g, ' ').trim();
  const lower = clean.toLowerCase();
  if (!clean) return '';
  if (/\bpnpm\s+electron:dev\b/.test(lower)) return 'pnpm electron:dev';
  if (/electron\/cli\.js\s+\./.test(lower)) return '';
  if (/@anthropic-ai\/claude-code|\/claude(?:\s|$)|\bclaude-code\b|\bclaude\b/.test(lower)) {
    const promptMatch = clean.match(/(?:claude-code|claude)(?:\s+(.+))?$/i);
    return promptMatch?.[1] ? `claude ${promptMatch[1]}`.slice(0, 160) : 'claude';
  }
  if (/\bcodex\s+exec\b/.test(lower)) {
    const match = clean.match(/\bcodex\s+exec\b.*$/i);
    return (match?.[0] || 'codex exec').slice(0, 160);
  }
  if (/\bpnpm\s+dev\b/.test(lower)) return 'pnpm dev';
  if (/\bnpm\s+run\s+dev\b/.test(lower)) return 'npm run dev';
  if (/\byarn\s+dev\b/.test(lower)) return 'yarn dev';
  if (/\bbun\s+dev\b/.test(lower)) return 'bun dev';
  if (/(concurrently|wait-on|vite\/bin\/vite\.js|\bvite\b)/.test(lower)) return '';
  const normalized = clean.replace(/^.*?((?:pnpm|npm|yarn|bun|cargo|uvicorn|pytest|python|node|tsx|ts-node|next|codex)(?:\s+|$))/, '$1').trim();
  return (normalized || clean).slice(0, 160);
}

function compactTerminalCommands(commands) {
  const unique = Array.from(new Set(commands.filter(Boolean)));
  const hasElectronDev = unique.some((command) => command === 'pnpm electron:dev');
  return unique.filter((command) => {
    const lower = command.toLowerCase();
    if (hasElectronDev && /^(pnpm dev|npm run dev|yarn dev|bun dev)$/.test(lower)) return false;
    if (hasElectronDev && /electron\/cli\.js\s+\./.test(lower)) return false;
    if (/(concurrently|wait-on|vite\/bin\/vite\.js|\bvite\b)/.test(lower)) return false;
    return true;
  });
}

async function readTimelineBackgroundMarkers({ musicAppKeywords, minSegmentMs } = {}) {
  const processes = await readRunningProcessNames();

  const markers = [];
  const shellMarkers = await readShellProcessMarkers();
  for (const marker of shellMarkers) {
    if (!markers.some((existing) => existing.type === marker.type && existing.detail === marker.detail)) {
      markers.push(marker);
    }
  }

  const configuredMusicApps = normalizeRuleList(musicAppKeywords);
  const scriptableMusicApps = ['Music', 'Spotify'];
  const processNames = new Set(processes.map((name) => name.toLowerCase()));
  const configuredRunningMusicApps = configuredMusicApps.length > 0
    ? processes.filter((name) => configuredMusicApps.some((keyword) => name.toLowerCase().includes(keyword)))
    : [];
  const musicCandidates = Array.from(new Set([
    ...scriptableMusicApps.filter((name) => (
    configuredMusicApps.length === 0 || configuredMusicApps.some((keyword) => name.toLowerCase().includes(keyword))
    )),
    ...configuredRunningMusicApps,
  ]));
  const musicApps = musicCandidates.filter((name) => processNames.has(name.toLowerCase()));
  const musicResults = await Promise.all(musicApps.map(async (name) => {
    const result = isNeteaseMusicApp(name)
      ? await readNeteaseNowPlaying(name, minSegmentMs)
      : await readNowPlaying(name);
    return { name, ...result };
  }));
  markers.push(...musicResults.map((result) => result.marker).filter(Boolean));

  timelineDebugLog({
    stage: 'background:music',
    message: musicApps.length > 0
      ? musicResults.map((result) => `${result.name}:${result.status}${result.marker?.detail ? `:${result.marker.detail}` : ''}`).join(' | ')
      : 'none',
  });

  timelineDebugLog({
    stage: 'background:markers',
    message: markers.length > 0
      ? markers.map((marker) => `${marker.type}:${marker.name}:${marker.detail}`).join(' | ')
      : 'none',
  });

  return markers;
}

async function readTimelineBackgroundOnly({ musicAppKeywords, minSegmentMs } = {}) {
  if (process.platform !== 'darwin') return { supported: false, background: [], error: 'unsupported', checkedAt: Date.now() };
  const background = await readTimelineBackgroundMarkers({ musicAppKeywords, minSegmentMs });
  return { supported: true, background, error: null, checkedAt: Date.now() };
}

function readSystemActivityState({ idleThresholdSeconds } = {}) {
  if (!powerMonitor) return { supported: false, idleSeconds: 0, state: 'unknown', inactive: false };
  const thresholdSeconds = Math.max(1, Math.min(24 * 60 * 60, Number(idleThresholdSeconds) || 60));
  const idleSeconds = powerMonitor.getSystemIdleTime();
  const state = powerMonitor.getSystemIdleState(thresholdSeconds);
  return {
    supported: true,
    idleSeconds,
    state,
    inactive: state !== 'active' || idleSeconds >= thresholdSeconds,
    idleThresholdSeconds: thresholdSeconds,
  };
}

async function readTimelineActiveWindow({ musicAppKeywords, minSegmentMs } = {}) {
  if (process.platform !== 'darwin') {
    return { supported: false, appName: '', windowTitle: '', url: '', background: [], error: 'unsupported' };
  }
  const active = await readActiveWindow();
  if (!active.supported || active.error || (!active.appName && !active.windowTitle)) {
    return { ...active, url: '', background: [], error: active.error || 'empty active window', checkedAt: Date.now() };
  }

  const [url, background] = await Promise.all([
    readBrowserUrl(active.appName),
    readTimelineBackgroundMarkers({ musicAppKeywords, minSegmentMs }),
  ]);
  return {
    supported: true,
    appName: active.appName,
    windowTitle: active.windowTitle,
    url,
    background,
    error: null,
    checkedAt: Date.now(),
  };
}

async function ensureAccessibilityPermission() {
  if (process.platform !== 'darwin') return { supported: false, trusted: false };
  const trusted = await withPermissionDialogSpaceFocus(async () => systemPreferences.isTrustedAccessibilityClient(true));
  return { supported: true, trusted };
}

function checkAccessibilityPermission() {
  if (process.platform !== 'darwin') return { supported: false, trusted: false };
  const trusted = systemPreferences.isTrustedAccessibilityClient(false);
  return { supported: true, trusted };
}

function timelineDebugLog(payload = {}) {
  if (!debugTimelineEnabled) return false;
  const nowLabel = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const stage = payload.stage || 'log';
  const message = payload.message || '';
  const appName = payload.appName ? ` app=${JSON.stringify(payload.appName)}` : '';
  const title = payload.windowTitle ? ` title=${JSON.stringify(payload.windowTitle)}` : '';
  const url = payload.url ? ` url=${JSON.stringify(payload.url)}` : '';
  const key = payload.key ? ` key=${JSON.stringify(payload.key)}` : '';
  const duration = typeof payload.durationMs === 'number' ? ` duration=${Math.round(payload.durationMs / 1000)}s` : '';
  const min = typeof payload.minSegmentMs === 'number' ? ` min=${Math.round(payload.minSegmentMs / 1000)}s` : '';
  const errorText = payload.error
    ? String(payload.error).split('\n').filter((line) => line.includes('syntax error') || line.includes('execution error') || line.includes('Command failed')).slice(-2).join(' ') || String(payload.error).slice(0, 220)
    : '';
  const error = errorText ? ` error=${JSON.stringify(errorText)}` : '';
  console.log(`[timeline ${nowLabel}] ${stage}${message ? ` ${message}` : ''}${appName}${title}${url}${key}${duration}${min}${error}`);
  return true;
}

function listContainsAny(text, keywords) {
  const lower = String(text || '').toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

const DEFAULT_GAME_KEYWORDS = [
  'steam', 'epic games', 'battle.net', 'riot client', 'league of legends',
  'dota', 'minecraft', 'roblox', 'unity', 'unreal', 'godot', 'blizzard',
  'world of warcraft', 'genshin', 'honkai', 'valorant', 'counter-strike',
  'final fantasy', 'baldur', 'civilization', 'factorio',
];

function classifyPetPresenceContext({ appName, windowTitle, runningApps, fullscreen, gameKeywords }) {
  const normalizedGameKeywords = [
    ...DEFAULT_GAME_KEYWORDS,
    ...normalizeRuleList(gameKeywords),
  ];
  const screenShareApps = [
    'zoom', 'zoom.us', 'microsoft teams', 'teams', '腾讯会议', 'tencent meeting',
    '飞书', 'feishu', 'lark', '钉钉', 'dingtalk', 'google chrome', 'chrome',
    'slack', 'discord', 'obs', 'obs studio', 'quicktime player',
  ];
  const screenShareKeywords = [
    'screen sharing', 'sharing screen', 'screen share', 'share screen',
    '正在共享', '共享屏幕', '屏幕共享', 'presenting', '正在演示', '演示中',
  ];
  const activeText = `${appName} ${windowTitle}`;
  const isFullscreenGame = Boolean(fullscreen && listContainsAny(activeText, normalizedGameKeywords));
  const screenShareAppRunning = listContainsAny(runningApps, screenShareApps);
  const screenShareByTitle = listContainsAny(activeText, screenShareKeywords);
  return {
    isFullscreenGame,
    isScreenSharing: screenShareByTitle || screenShareAppRunning && listContainsAny(activeText, screenShareKeywords),
  };
}

function readPetPresenceContext({ settings } = {}) {
  if (process.platform !== 'darwin') {
    return Promise.resolve({ supported: false, isFullscreenGame: false, isScreenSharing: false });
  }
  return new Promise((resolve) => {
    execFile('/usr/bin/osascript', ['-e', petPresenceContextScript()], { timeout: 2500 }, (error, stdout) => {
      if (error) {
        resolve({ supported: true, isFullscreenGame: false, isScreenSharing: false, error: error.message || String(error) });
        return;
      }
      const [appName = '', windowTitle = '', fullscreenRaw = '', runningAppsRaw = ''] = String(stdout || '').trimEnd().split('\n');
      const fullscreen = fullscreenRaw.trim().toLowerCase() === 'true';
      const context = classifyPetPresenceContext({
        appName: appName.trim(),
        windowTitle: windowTitle.trim(),
        runningApps: runningAppsRaw.trim(),
        fullscreen,
        gameKeywords: settings?.gameAppKeywords,
      });
      resolve({
        supported: true,
        appName: appName.trim(),
        windowTitle: windowTitle.trim(),
        fullscreen,
        ...context,
      });
    });
  });
}

function normalizeRuleList(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim().toLowerCase()).filter(Boolean) : [];
}

function normalizeMatchText(value) {
  const raw = String(value || '').toLowerCase();
  const aliases = [];
  if (/(^|[./])zhihu\.com|zhihu/.test(raw)) aliases.push('知乎');
  if (/(^|[./])bilibili\.com|b23\.tv|bilibili/.test(raw)) aliases.push('哔哩哔哩', 'b站');
  if (/(^|[./])xiaohongshu\.com|xiaohongshu/.test(raw)) aliases.push('小红书');
  if (/(^|[./])weibo\.com|weibo/.test(raw)) aliases.push('微博');
  if (/(^|[./])douyin\.com|douyin/.test(raw)) aliases.push('抖音');
  if (/(^|[./])youtube\.com|youtu\.be|youtube/.test(raw)) aliases.push('油管');
  try {
    return `${raw} ${decodeURIComponent(raw)} ${aliases.join(' ')}`;
  } catch {
    return `${raw} ${aliases.join(' ')}`;
  }
}

function classifyDistraction(active, settings) {
  const appNameLower = normalizeMatchText(active.appName);
  const titleLower = normalizeMatchText(active.windowTitle);
  const urlLower = normalizeMatchText(active.url);
  if (!appNameLower && !titleLower && !urlLower) return null;
  if (IGNORED_DISTRACTION_APPS.some((ignored) => ignored.toLowerCase() === appNameLower)) return null;
  const blockedApp = normalizeRuleList(settings?.distractionBlockedApps)
    .find((rule) => appNameLower.includes(rule));
  if (blockedApp) return `app:${blockedApp}`;
  const blockedKeyword = normalizeRuleList(settings?.distractionBlockedKeywords)
    .find((rule) => titleLower.includes(rule) || appNameLower.includes(rule) || urlLower.includes(rule));
  return blockedKeyword ? `keyword:${blockedKeyword}` : null;
}

async function checkDistraction({ settings }) {
  const active = await readTimelineActiveWindow({ musicAppKeywords: settings?.musicAppKeywords });
  if (!active.supported || active.error) {
    return { ...active, matchedRule: null, checkedAt: Date.now() };
  }
  const matchedRule = classifyDistraction(active, settings || {});
  timelineDebugLog({
    stage: 'distraction:check',
    message: matchedRule || 'none',
    appName: active.appName,
    windowTitle: active.windowTitle,
    url: active.url,
  });
  return {
    ...active,
    matchedRule,
    checkedAt: Date.now(),
  };
}

function isPetVisible() {
  const win = windows.get('pet');
  return Boolean(win && !win.isDestroyed() && win.isVisible());
}

function showPetWindow() {
  const win = windows.get('pet') || createPetWindow();
  petVisibilityController.requestShow(win, {
    requestLayout: (target) => send(target, 'pet:request-initial-layout', {}),
    applyTopmost: (target) => applyFloatingFullscreenBehavior(target, { force: true }),
  });
}

function hidePetWindow() {
  petVisibilityController.hide(windows.get('pet'));
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
    if (topmostSuppressed) return;
    const labels = petContextMenuOpen ? ['compact-chat', 'pet'] : ['pet', 'compact-chat'];
    for (const label of labels) {
      const win = windows.get(label);
      if (win?.isVisible()) applyFloatingFullscreenBehavior(win);
    }
  }, 500);
}

function createPetWindow() {
  petVisibilityController.reset();
  const display = screen.getPrimaryDisplay();
  const work = display.workArea;
  const initialWidth = 220;
  const initialHeight = 300;
  const initialMargin = 40;
  const initialX = Math.max(work.x + 16, work.x + work.width - initialWidth - initialMargin);
  const initialY = Math.max(work.y + 16, work.y + work.height - initialHeight - initialMargin);
  const win = createWindow('pet', {
    width: initialWidth,
    height: initialHeight,
    x: Math.round(initialX),
    y: Math.round(initialY),
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
  win.once('closed', () => petVisibilityController.reset());
  win.webContents.once('did-finish-load', () => {
    setTimeout(() => send(win, 'pet:request-initial-layout', {}), 40);
  });
  win.on('show', updateTrayMenu);
  win.on('hide', updateTrayMenu);
  return win;
}

function showSettingsWindow(section) {
  windows.get('compact-chat')?.hide();
  broadcast('compact-chat:collapsed', {});
  const bounds = centerBoundsForSize(980, 760);
  const win = createWindow('settings', {
    ...bounds,
    title: '',
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : {}),
    resizable: true,
    frame: true,
    transparent: false,
    alwaysOnTop: false,
    backgroundColor: opaqueWindowBackgroundColor(),
  });
  win.setBounds(bounds);
  showWindowAfterInitialPaint(win, { focus: true });
  if (section) {
    setTimeout(() => broadcast('settings:navigate', { section }), 80);
  }
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
    backgroundColor: opaqueWindowBackgroundColor(),
  });
  win.setBounds(bounds);
  showWindowAfterInitialPaint(win, { focus: true });
}

function showCompactChatWindow({ x, y, w, h, force = false }, show = true) {
  if (!force && Date.now() < compactChatHiddenUntil) {
    debugCompactChat('compact chat update ignored after hide', { show, hiddenUntil: compactChatHiddenUntil });
    return false;
  }
  if (force) compactChatHiddenUntil = 0;
  const existing = windows.get('compact-chat');
  if (!show && existing && !existing.isDestroyed()) {
    debugCompactChat('position compact chat', {
      x: Math.round(x),
      y: Math.round(y),
      snapshot: compactChatWindowSnapshot(existing),
    });
    existing.setPosition(Math.round(x), Math.round(y));
    existing.setIgnoreMouseEvents(false);
    applyFloatingFullscreenBehavior(existing);
    debugCompactChat('position compact chat applied', { snapshot: compactChatWindowSnapshot(existing) });
    return true;
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
  debugCompactChat('create compact chat', {
    bounds: { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) },
    show,
    snapshot: compactChatWindowSnapshot(win),
  });
  win.setIgnoreMouseEvents(false);
  win.setBounds({ x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) });
  applyFloatingFullscreenBehavior(win, { force: show });
  if (show) {
    win.showInactive();
    debugCompactChat('show compact chat inactive', { snapshot: compactChatWindowSnapshot(win) });
    applyFloatingFullscreenBehavior(win, { force: true });
    win.moveTop();
  }
  return true;
}

function focusCompactChatWindowForInput(reason = 'input-start') {
  const win = windows.get('compact-chat');
  if (!win || win.isDestroyed()) {
    debugCompactChat('focus input skipped', { reason, skipped: 'missing-window' });
    return;
  }
  debugCompactChat('focus input requested', { reason, snapshot: compactChatWindowSnapshot(win) });
  applyFloatingFullscreenBehavior(win, { force: true });
  if (!win.isVisible()) win.show();
  if (!win.isFocused()) {
    win.moveTop();
    win.focus();
    debugCompactChat('focus input applied', { reason, snapshot: compactChatWindowSnapshot(win) });
  } else {
    debugCompactChat('focus input skipped duplicate focus', { reason, snapshot: compactChatWindowSnapshot(win) });
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
  if (ext === '.svg') return 'image/svg+xml';
  return 'image/png';
}

const CHAT_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']);
const CHAT_DOCUMENT_EXTENSIONS = new Set(['.pdf', '.docx']);
const CHAT_DOCUMENT_TEXT_LIMIT = 60_000;

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

function getBuiltinApiKey(kind = 'chat') {
  const specific = kind === 'voice'
    ? process.env.DESKCAT_BUILTIN_VOICE_API_KEY
    : process.env.DESKCAT_BUILTIN_CHAT_API_KEY;
  const fallback = kind === 'voice' ? BUILTIN_VOICE_API_KEY_FALLBACK : BUILTIN_CHAT_API_KEY_FALLBACK;
  return normalizeApiKey(specific || process.env.DESKCAT_BUILTIN_API_KEY || fallback);
}

function getBuiltinBaseUrl() {
  return normalizeBaseUrl(process.env.DESKCAT_BUILTIN_BASE_URL || 'https://api.openai-proxy.org/v1');
}

function getBuiltinServiceStatus() {
  return {
    chatConfigured: Boolean(getBuiltinApiKey('chat')),
    voiceConfigured: Boolean(getBuiltinApiKey('voice')),
  };
}

async function builtinChatCompletion({ request }) {
  const apiKey = getBuiltinApiKey('chat');
  if (!apiKey) throw new Error('内置模型服务未配置，请切换到个人 API。');
  return chatCompletion({
    request: {
      ...request,
      provider: 'custom',
      baseUrl: getBuiltinBaseUrl(),
      model: 'gpt-4o-mini',
      apiKey,
    },
  });
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

function readSystemKnowledgeDeviceInfo() {
  const displays = screen.getAllDisplays().map((display) => ({
    id: display.id,
    bounds: display.bounds,
    workArea: display.workArea,
    scaleFactor: display.scaleFactor,
    rotation: display.rotation,
    touchSupport: display.touchSupport,
  }));
  const primaryDisplay = screen.getPrimaryDisplay();
  return {
    appName: app.getName(),
    appVersion: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    osType: os.type(),
    osRelease: os.release(),
    osVersion: os.version?.() || '',
    hostname: os.hostname(),
    cpuModel: os.cpus()?.[0]?.model || '',
    cpuCount: os.cpus()?.length || 0,
    totalMemoryBytes: os.totalmem(),
    freeMemoryBytes: os.freemem(),
    uptimeSeconds: Math.round(os.uptime()),
    locale: app.getLocale(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    displays,
    primaryDisplay: {
      id: primaryDisplay.id,
      bounds: primaryDisplay.bounds,
      workArea: primaryDisplay.workArea,
      scaleFactor: primaryDisplay.scaleFactor,
    },
  };
}

function runAppleScript(script, timeout = 2500) {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'darwin') {
      reject(new Error('AppleScript is only available on macOS.'));
      return;
    }
    execFile('/usr/bin/osascript', ['-e', script], { timeout }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message || String(error)));
        return;
      }
      resolve(stdout || '');
    });
  });
}

function appleScriptTargets(appName, bundleId) {
  return [
    `application id "${bundleId}"`,
    `application "${appName}"`,
  ];
}

function appProcessExistsScript(appName, bundleId) {
  return `
tell application "System Events"
  repeat with appProcess in application processes
    try
      if bundle identifier of appProcess is "${bundleId}" then return "1"
    end try
    try
      if name of appProcess is "${appName}" then return "1"
    end try
  end repeat
end tell
return "0"
`;
}

async function isMacAppRunning(appName, bundleId) {
  if (process.platform !== 'darwin') return false;
  try {
    const result = await runAppleScript(appProcessExistsScript(appName, bundleId), 1200);
    return String(result).trim() === '1';
  } catch {
    return false;
  }
}

async function quitMacAppIfWeLaunched(appName, bundleId, wasRunning) {
  if (process.platform !== 'darwin' || wasRunning) return;
  try {
    const running = await isMacAppRunning(appName, bundleId);
    if (!running) return;
    await runAppleScript(`tell application id "${bundleId}" to quit`, 1500);
  } catch {
    // Best effort cleanup only. Never fail schedule reads because a helper app refused to quit.
  }
}

async function runFirstSuccessfulAppAppleScript(appName, bundleId, scriptFactory, timeout = 5000) {
  const wasRunning = await isMacAppRunning(appName, bundleId);
  try {
    return await runFirstSuccessfulAppleScript(appleScriptTargets(appName, bundleId).map((target) => scriptFactory(target)), timeout);
  } finally {
    await quitMacAppIfWeLaunched(appName, bundleId, wasRunning);
  }
}

function calendarKnowledgeScript(target) {
  return `
set output to ""
set nowDate to current date
set endDate to nowDate + (7 * days)
tell ${target}
  repeat with calendarItem in calendars
    try
      set calendarName to name of calendarItem
      set matchedEvents to every event of calendarItem whose start date is greater than or equal to nowDate and start date is less than or equal to endDate
      repeat with eventItem in matchedEvents
        set eventTitle to summary of eventItem
        set eventStart to start date of eventItem
        set eventEnd to end date of eventItem
        set eventLocation to ""
        try
          set eventLocation to location of eventItem
          if eventLocation is missing value then set eventLocation to ""
        end try
        set output to output & "calendar" & tab & calendarName & tab & eventTitle & tab & (eventStart as string) & tab & (eventEnd as string) & tab & eventLocation & linefeed
      end repeat
    end try
  end repeat
end tell
return output
`;
}

function remindersKnowledgeScript(target) {
  return `
set output to ""
set nowDate to current date
set endDate to nowDate + (14 * days)
tell ${target}
  repeat with listItem in lists
    try
      set listName to name of listItem
      repeat with reminderItem in reminders of listItem
        set reminderCompleted to true
        try
          set reminderCompleted to completed of reminderItem
        end try
        if reminderCompleted is false then
          set reminderTitle to name of reminderItem
          set dueText to ""
          try
            set reminderDue to due date of reminderItem
            if reminderDue is not missing value then
              if reminderDue is less than or equal to endDate then set dueText to reminderDue as string
            end if
          end try
          try
            if dueText is "" then
              set reminderDue to remind me date of reminderItem
              if reminderDue is not missing value then
                if reminderDue is less than or equal to endDate then set dueText to reminderDue as string
              end if
            end if
          end try
          if dueText is "" then set dueText to "undated"
          set output to output & "reminder" & tab & listName & tab & reminderTitle & tab & dueText & linefeed
        end if
      end repeat
    end try
  end repeat
end tell
return output
`;
}

function formatWeatherKnowledgeFromOpenMeteo(data, source) {
  const current = data?.current || {};
  const units = data?.current_units || {};
  return {
    status: 'available',
    source,
    summary: [
      `source ${source}`,
      `${current.temperature_2m ?? 'unknown'}${units.temperature_2m || 'C'}`,
      `feels like ${current.apparent_temperature ?? 'unknown'}${units.apparent_temperature || 'C'}`,
      `humidity ${current.relative_humidity_2m ?? 'unknown'}${units.relative_humidity_2m || '%'}`,
      `wind ${current.wind_speed_10m ?? 'unknown'}${units.wind_speed_10m || 'km/h'}`,
      `precipitation ${current.precipitation ?? 0}${units.precipitation || 'mm'}`,
    ].join(', '),
  };
}

async function readSystemKnowledgeWeatherInfo(args = {}) {
  try {
    let latitude = Number(args.latitude);
    let longitude = Number(args.longitude);
    let source = args.source === 'browser-location' ? 'browser-location' : 'ip-location';
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      const ipResponse = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(2500) });
      if (!ipResponse.ok) throw new Error(ipResponse.statusText);
      const ipData = await ipResponse.json();
      latitude = Number(ipData.latitude);
      longitude = Number(ipData.longitude);
      source = 'ip-location';
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error('location unavailable');
    }
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(Number(latitude.toFixed(4))));
    url.searchParams.set('longitude', String(Number(longitude.toFixed(4))));
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,snowfall,weather_code,wind_speed_10m');
    url.searchParams.set('timezone', 'auto');
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error(response.statusText);
    return formatWeatherKnowledgeFromOpenMeteo(await response.json(), source);
  } catch (error) {
    return {
      status: 'unavailable',
      summary: `unavailable because the weather service request failed (${error instanceof Error ? error.message : String(error)}). Ask the user for a city or try again later.`,
    };
  }
}

async function readSystemKnowledgeScheduleInfo(args = {}) {
  if (process.platform !== 'darwin') {
    return { calendar: [], reminders: [], error: 'Calendar and Reminders integration is only available on macOS.' };
  }
  const wantsCalendar = args.calendar !== false;
  const wantsReminders = args.reminders === true;
  const cacheKey = `calendar:${wantsCalendar ? '1' : '0'};reminders:${wantsReminders ? '1' : '0'}`;
  const cached = scheduleKnowledgeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    timelineDebugLog({
      stage: 'system-knowledge:schedule',
      message: `cache=hit ${cacheKey}`,
    });
    return cached.value;
  }
  const inFlight = scheduleKnowledgeInFlight.get(cacheKey);
  if (inFlight) {
    timelineDebugLog({
      stage: 'system-knowledge:schedule',
      message: `cache=join ${cacheKey}`,
    });
    return inFlight;
  }
  const readPromise = readSystemKnowledgeScheduleInfoFresh({ wantsCalendar, wantsReminders }).then((result) => {
    if (!result.calendarError && !result.remindersError) {
      scheduleKnowledgeCache.set(cacheKey, {
        expiresAt: Date.now() + SCHEDULE_KNOWLEDGE_CACHE_TTL_MS,
        value: result,
      });
    }
    return result;
  }).finally(() => {
    scheduleKnowledgeInFlight.delete(cacheKey);
  });
  scheduleKnowledgeInFlight.set(cacheKey, readPromise);
  return readPromise;
}

async function readSystemKnowledgeScheduleInfoFresh({ wantsCalendar, wantsReminders }) {
  const calendarResult = wantsCalendar
    ? settlePromise(runFirstSuccessfulAppAppleScript('Calendar', 'com.apple.iCal', calendarKnowledgeScript, 12000))
    : { status: 'fulfilled', value: '' };
  const remindersResult = wantsReminders
    ? settlePromise(runFirstSuccessfulAppAppleScript('Reminders', 'com.apple.reminders', remindersKnowledgeScript))
    : { status: 'fulfilled', value: '' };
  const [settledCalendarResult, settledRemindersResult] = await Promise.all([calendarResult, remindersResult]);
  const calendarError = wantsCalendar && settledCalendarResult.status === 'rejected'
    ? humanizeAppleScriptAccessError(settledCalendarResult.reason?.message || settledCalendarResult.reason)
    : '';
  const remindersError = wantsReminders && settledRemindersResult.status === 'rejected'
    ? humanizeAppleScriptAccessError(settledRemindersResult.reason?.message || settledRemindersResult.reason)
    : '';
  timelineDebugLog({
    stage: 'system-knowledge:schedule',
    message: [
      'cache=miss',
      wantsCalendar ? `calendar=${settledCalendarResult.status}` : 'calendar=skipped',
      wantsReminders ? `reminders=${settledRemindersResult.status}` : 'reminders=skipped',
      calendarError ? `calendarError=${calendarError}` : '',
      remindersError ? `remindersError=${remindersError}` : '',
    ].filter(Boolean).join(' '),
  });
  return {
    calendar: wantsCalendar && settledCalendarResult.status === 'fulfilled' ? parseTabRows(settledCalendarResult.value, 'calendar') : [],
    reminders: wantsReminders && settledRemindersResult.status === 'fulfilled' ? parseTabRows(settledRemindersResult.value, 'reminder') : [],
    calendarStatus: !wantsCalendar || settledCalendarResult.status === 'fulfilled' ? 'ok' : 'error',
    remindersStatus: !wantsReminders || settledRemindersResult.status === 'fulfilled' ? 'ok' : 'error',
    calendarError,
    remindersError,
    error: [
      calendarError ? `Calendar: ${calendarError}` : '',
      remindersError ? `Reminders: ${remindersError}` : '',
    ].filter(Boolean).join('; '),
  };
}

async function runFirstSuccessfulAppleScript(scripts, timeout = 5000) {
  const errors = [];
  for (const script of scripts) {
    try {
      return await runAppleScript(script, timeout);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(errors.map(humanizeAppleScriptAccessError).join(' | '));
}

async function settlePromise(promise) {
  try {
    return { status: 'fulfilled', value: await promise };
  } catch (reason) {
    return { status: 'rejected', reason };
  }
}

async function requestSystemKnowledgePermissions(args = {}) {
  if (process.platform !== 'darwin') {
    return {
      ok: false,
      calendar: { ok: false, message: 'Only available on macOS.' },
      reminders: { ok: false, message: 'Only available on macOS.' },
    };
  }
  const wantsCalendar = args.calendar !== false;
  const wantsReminders = args.reminders === true;
  const promptKey = schedulePermissionPromptKey({ calendar: wantsCalendar, reminders: wantsReminders });
  const permissionTitle = wantsCalendar && wantsReminders
    ? chooseLocaleText('需要日历和提醒事项权限', 'Calendar and Reminders needed')
    : wantsReminders
      ? chooseLocaleText('需要提醒事项权限', 'Reminders needed')
      : chooseLocaleText('需要日历权限', 'Calendar needed');
  const permissionMessage = wantsCalendar && wantsReminders
    ? chooseLocaleText('用于回答日程、会议、待办和提醒问题。', 'Used to answer schedule, meeting, to-do, and reminder questions.')
    : wantsReminders
      ? chooseLocaleText('用于回答待办和提醒问题。', 'Used to answer to-do and reminder questions.')
      : chooseLocaleText('用于回答日程和会议问题。', 'Used to answer schedule and meeting questions.');
  return await withPermissionDialogSpaceFocus(async (permissionParent) => {
    const messageBoxOptions = {
      type: 'info',
      buttons: [
        chooseLocaleText('继续', 'Continue'),
        chooseLocaleText('取消', 'Cancel'),
      ],
      defaultId: 0,
      cancelId: 1,
      title: permissionTitle,
      message: permissionMessage,
      detail: chooseLocaleText(
        '只在相关提问中读取必要信息；默认本地存储，云端备份均作加密处理。',
        'Only needed data is read for related questions. Local by default; cloud backups are encrypted.',
      ),
    };
    if (!hasSeenSchedulePermissionPrompt(promptKey)) {
      const consent = permissionParent && !permissionParent.isDestroyed()
        ? await dialog.showMessageBox(permissionParent, messageBoxOptions)
        : await dialog.showMessageBox(messageBoxOptions);
      markSchedulePermissionPromptSeen(promptKey);
      if (consent.response !== 0) {
        return {
          ok: false,
          calendar: { ok: !wantsCalendar, message: wantsCalendar ? 'User cancelled permission request.' : 'Not requested.' },
          reminders: { ok: !wantsReminders, message: wantsReminders ? 'User cancelled permission request.' : 'Not requested.' },
        };
      }
    }
    const calendarResult = wantsCalendar
      ? await settlePromise(runFirstSuccessfulAppAppleScript('Calendar', 'com.apple.iCal', (target) => `tell ${target} to return count of calendars`))
      : { status: 'fulfilled', value: '' };
    const remindersResult = wantsReminders
      ? await settlePromise(runFirstSuccessfulAppAppleScript('Reminders', 'com.apple.reminders', (target) => `tell ${target} to return count of lists`))
      : { status: 'fulfilled', value: '' };
    const calendar = wantsCalendar ? permissionResultFromSettled(calendarResult) : { ok: true, message: 'Not requested.' };
    const reminders = wantsReminders ? permissionResultFromSettled(remindersResult) : { ok: true, message: 'Not requested.' };
    if (wantsCalendar && calendar.ok) markSchedulePermissionPromptSeen('calendar');
    if (wantsReminders && reminders.ok) markSchedulePermissionPromptSeen('reminders');
    if (wantsCalendar && wantsReminders && calendar.ok && reminders.ok) markSchedulePermissionPromptSeen('calendar+reminders');
    if ((wantsCalendar && !calendar.ok) || (wantsReminders && !reminders.ok)) {
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Automation').catch(() => {});
    }
    return {
      ok: calendar.ok && reminders.ok,
      calendar,
      reminders,
    };
  });
}

function schedulePermissionPromptStatePath() {
  return path.join(app.getPath('userData'), SCHEDULE_PERMISSION_PROMPT_STATE_FILE);
}

function readSchedulePermissionPromptState() {
  try {
    return JSON.parse(fs.readFileSync(schedulePermissionPromptStatePath(), 'utf8'));
  } catch {
    return {};
  }
}

function writeSchedulePermissionPromptState(state) {
  try {
    fs.writeFileSync(schedulePermissionPromptStatePath(), JSON.stringify(state, null, 2));
  } catch {
    // If persistence fails, permissions still work; the explanatory prompt may reappear.
  }
}

function schedulePermissionPromptKey({ calendar, reminders }) {
  if (calendar && reminders) return 'calendar+reminders';
  if (reminders) return 'reminders';
  return 'calendar';
}

function hasSeenSchedulePermissionPrompt(key) {
  return Boolean(readSchedulePermissionPromptState()[key]?.seen);
}

function markSchedulePermissionPromptSeen(key) {
  const state = readSchedulePermissionPromptState();
  state[key] = { seen: true, seenAt: new Date().toISOString() };
  writeSchedulePermissionPromptState(state);
}

function showPermissionPromptOverlay(args = {}, event) {
  return new Promise((resolve) => {
    const parent = event?.sender ? BrowserWindow.fromWebContents(event.sender) : windows.get('pet');
    const parentBounds = parent && !parent.isDestroyed() ? parent.getBounds() : screen.getPrimaryDisplay().bounds;
    const display = screen.getDisplayMatching(parentBounds);
    const work = display.bounds;
    const id = randomUUID();
    const promptX = Math.round(work.x + (work.width - PERMISSION_PROMPT_WIDTH) / 2);
    const promptY = Math.round(work.y + (work.height - PERMISSION_PROMPT_HEIGHT) / 2);
    const win = new BrowserWindow({
      x: promptX,
      y: promptY,
      width: PERMISSION_PROMPT_WIDTH,
      height: PERMISSION_PROMPT_HEIGHT,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      movable: false,
      fullscreenable: false,
      skipTaskbar: process.platform !== 'darwin',
      alwaysOnTop: true,
      focusable: true,
      type: process.platform === 'darwin' ? 'panel' : undefined,
      hasShadow: false,
      webPreferences: preload('permission-prompt'),
    });
    if (process.platform === 'darwin') {
      win.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: true,
      });
      win.setAlwaysOnTop(true, 'screen-saver', 3);
    }
    const finish = (accepted) => {
      if (!permissionPromptResolvers.has(id)) return;
      permissionPromptResolvers.delete(id);
      if (!win.isDestroyed()) win.close();
      resolve(Boolean(accepted));
    };
    permissionPromptResolvers.set(id, finish);
    win.once('closed', () => finish(false));
    const revealPrompt = () => {
      if (win.isDestroyed()) return;
      if (process.platform === 'darwin') {
        win.setVisibleOnAllWorkspaces(true, {
          visibleOnFullScreen: true,
          skipTransformProcessType: true,
        });
        win.setAlwaysOnTop(true, 'screen-saver', 3);
        app.focus({ steal: true });
      }
      if (!win.isVisible()) win.show();
      win.focus();
      win.moveTop();
    };
    win.once('ready-to-show', () => {
      applyFloatingFullscreenBehavior(win, { force: true });
      revealPrompt();
      setTimeout(revealPrompt, 120);
      setTimeout(revealPrompt, 360);
    });

    const requestedIconPath = resolveAppIconPath(args.iconPath);
    const iconPath = fs.existsSync(requestedIconPath) ? requestedIconPath : currentAppIconPath;
    const iconSrc = fs.existsSync(iconPath) ? readImageDataUrl(iconPath, imageMime) : '';
    const title = escapeHtml(args.title);
    const feature = escapeHtml(args.feature);
    const privacy = escapeHtml(args.privacy);
    const confirmLabel = escapeHtml(args.confirmLabel || 'Continue');
    const cancelLabel = escapeHtml(args.cancelLabel || 'Cancel');
    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
html,body{width:100%;height:100%;margin:0;background:transparent;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif;color:CanvasText;overflow:hidden}
body{display:flex;align-items:center;justify-content:center;padding:8px;box-sizing:border-box;background:transparent}
.card{box-sizing:border-box;width:min(336px,calc(100vw - 24px));max-height:calc(100vh - 24px);display:flex;flex-direction:column;overflow:hidden;border-radius:15px;border:1px solid rgba(120,120,120,.32);background:color-mix(in srgb, Canvas 96%, transparent);box-shadow:0 12px 34px rgba(0,0,0,.20),0 1px 0 rgba(255,255,255,.42) inset;backdrop-filter:blur(16px);padding:12px;text-align:center}
.content{overflow:auto;min-height:0;padding:2px 2px 10px}
img{width:48px;height:48px;object-fit:contain;display:block;margin:0 auto 8px;border-radius:12px}
.title{font-size:13px;font-weight:700;line-height:1.32;margin-bottom:6px}
.feature{font-size:11px;font-weight:500;line-height:1.4;margin:0 auto 6px;max-width:288px}
.privacy{font-size:10px;font-weight:500;line-height:1.38;opacity:.72;margin:0 auto;max-width:288px}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;flex-shrink:0;padding-top:2px}
button{height:30px;border:0;border-radius:9px;font-size:11px;font-weight:500;color:CanvasText}
.cancel{background:rgba(120,120,120,.20)}
.ok{background:#2f8fff;color:white;font-weight:650;box-shadow:0 6px 16px rgba(47,143,255,.24)}
</style>
</head>
<body>
  <div class="card" role="dialog" aria-modal="true" aria-labelledby="title">
    <div class="content">
      ${iconSrc ? `<img src="${escapeHtml(iconSrc)}" alt="DeskCat">` : ''}
      <div class="title" id="title">${title}</div>
      <div class="feature">${feature}</div>
      <div class="privacy">${privacy}</div>
    </div>
    <div class="actions">
      <button class="cancel" id="cancel" type="button">${cancelLabel}</button>
      <button class="ok" id="ok" type="button">${confirmLabel}</button>
    </div>
  </div>
<script>
const promptId = ${JSON.stringify(id)};
function done(accepted){ window.deskCat.invoke('permission_prompt_result', { id: promptId, accepted }); }
document.getElementById('cancel').addEventListener('click', () => done(false));
document.getElementById('ok').addEventListener('click', () => done(true));
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') done(false);
  if (event.key === 'Enter') done(true);
});
document.getElementById('ok').focus();
</script>
</body>
</html>`;
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  });
}

function showWelcomePermissionPrompt(event) {
  return new Promise((resolve) => {
    if (hasSeenWelcomePermissionPrompt(app.getPath('userData'))) {
      resolve(true);
      return;
    }
    const parent = event?.sender ? BrowserWindow.fromWebContents(event.sender) : windows.get('pet');
    const parentBounds = parent && !parent.isDestroyed() ? parent.getBounds() : screen.getPrimaryDisplay().bounds;
    const display = screen.getDisplayMatching(parentBounds);
    const work = display.bounds;
    const id = randomUUID();
    const promptX = Math.round(work.x + (work.width - WELCOME_PROMPT_WIDTH) / 2);
    const promptY = Math.round(work.y + (work.height - WELCOME_PROMPT_HEIGHT) / 2);
    const win = new BrowserWindow({
      x: promptX,
      y: promptY,
      width: WELCOME_PROMPT_WIDTH,
      height: WELCOME_PROMPT_HEIGHT,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      movable: false,
      fullscreenable: false,
      skipTaskbar: process.platform !== 'darwin',
      alwaysOnTop: true,
      focusable: true,
      type: process.platform === 'darwin' ? 'panel' : undefined,
      hasShadow: false,
      webPreferences: preload('permission-prompt'),
    });
    if (process.platform === 'darwin') {
      win.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: true,
      });
      win.setAlwaysOnTop(true, 'screen-saver', 3);
    }
    const finish = (accepted) => {
      if (!permissionPromptResolvers.has(id)) return;
      permissionPromptResolvers.delete(id);
      try {
        markWelcomePermissionPromptSeen(app.getPath('userData'));
      } catch {
        // Losing this marker only means the explanatory prompt may show again.
      }
      if (!win.isDestroyed()) win.close();
      resolve(Boolean(accepted));
    };
    permissionPromptResolvers.set(id, finish);
    win.once('closed', () => finish(true));
    const revealPrompt = () => {
      if (win.isDestroyed()) return;
      if (process.platform === 'darwin') {
        win.setVisibleOnAllWorkspaces(true, {
          visibleOnFullScreen: true,
          skipTransformProcessType: true,
        });
        win.setAlwaysOnTop(true, 'screen-saver', 3);
        app.focus({ steal: true });
      }
      if (!win.isVisible()) win.show();
      win.focus();
      win.moveTop();
    };
    win.once('ready-to-show', () => {
      applyFloatingFullscreenBehavior(win, { force: true });
      revealPrompt();
      setTimeout(revealPrompt, 120);
      setTimeout(revealPrompt, 360);
    });

    const iconSrc = fs.existsSync(currentAppIconPath) ? readImageDataUrl(currentAppIconPath, imageMime) : '';
    const zh = isChineseLocale();
    const eyebrow = zh ? '欢迎使用 DeskCat' : 'Welcome to DeskCat';
    const title = zh ? '咪已成功登陆你的电脑' : 'Mimi has successfully moved into your computer';
    const intro = zh
      ? '为了让 DeskCat 正常陪伴你工作，它会在需要时请求以下系统权限：'
      : 'To help DeskCat work properly, it may request the following system permissions when needed:';
    const sections = zh ? [
      {
        label: '辅助功能权限',
        text: '用于读取当前前台应用、窗口标题、全屏状态和系统闲置状态，以记录个人日志、识别专注模式中的分心应用，并让灵宠在桌面和全屏场景中更稳定地显示。',
      },
      {
        label: 'System Events 自动化权限',
        text: '用于通过 macOS System Events 读取前台窗口信息、运行中的应用列表和窗口状态，这是个人日志与专注识别所需的系统接口。',
      },
      {
        label: '其他权限',
        text: '位置、日历、提醒事项、麦克风、屏幕录制等权限，只会在你使用天气、日程/待办、语音输入、截图等相关功能时再请求。',
      },
    ] : [
      {
        label: 'Accessibility',
        text: 'Used to read the current foreground app, window title, fullscreen state, and system idle state. This powers personal logging, Focus distraction detection, and stable DeskCat display across desktop and fullscreen spaces.',
      },
      {
        label: 'System Events Automation',
        text: 'Used through macOS System Events to read foreground window information, running app names, and window state. This is the system interface DeskCat uses for personal logging and Focus detection.',
      },
      {
        label: 'Other permissions',
        text: 'Location, Calendar, Reminders, Microphone, and Screen Recording permissions are requested only when you use related features such as weather, schedule/to-do answers, voice input, or screenshots.',
      },
    ];
    const privacy = zh
      ? '以上权限仅用于读取必要信息，不涉及修改、控制或执行无关操作。详细使用数据默认存储在本机；如果开启云端备份，备份内容会经过加密处理，请放心使用。'
      : 'These permissions are used only to read necessary information. DeskCat does not modify system settings, control other apps, or perform unrelated actions. Detailed usage data is stored locally by default; if cloud backup is enabled, backup data is encrypted.';
    const okLabel = zh ? '好的' : 'OK';
    const sectionHtml = sections.map((section) => `
      <section>
        <h2>${escapeHtml(section.label)}</h2>
        <p>${escapeHtml(section.text)}</p>
      </section>
    `).join('');
    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
html,body{width:100%;height:100%;margin:0;background:transparent;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif;color:#1f2328;overflow:hidden}
body{display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;background:transparent}
.card{box-sizing:border-box;width:min(488px,calc(100vw - 24px));max-height:calc(100vh - 24px);display:flex;flex-direction:column;overflow:hidden;border-radius:22px;border:1px solid rgba(130,135,145,.34);background:rgba(250,251,252,.96);box-shadow:0 22px 70px rgba(15,23,42,.22),0 1px 0 rgba(255,255,255,.86) inset;backdrop-filter:blur(22px);padding:22px 24px 20px}
.content{overflow:auto;min-height:0;padding-right:2px}
img{width:62px;height:62px;object-fit:contain;display:block;margin:0 auto 13px;border-radius:16px;filter:drop-shadow(0 8px 18px rgba(15,23,42,.16))}
.eyebrow{text-align:center;font-size:13px;font-weight:680;line-height:1.35;color:#59616c;margin:0 0 4px}
.title{text-align:center;font-size:21px;font-weight:760;line-height:1.24;letter-spacing:0;margin:0 0 13px}
.intro{border-top:1px solid rgba(31,35,40,.075);padding-top:12px;margin-bottom:12px}
section{border-top:1px solid rgba(31,35,40,.075);padding:12px 0 0;margin:0 0 12px}
h2{font-size:13px;font-weight:720;line-height:1.35;margin:0 0 4px;color:#24292f}
p{font-size:12px;font-weight:500;line-height:1.62;margin:0;color:#59616c}
.privacy{margin-top:2px;border-radius:14px;background:rgba(47,143,255,.075);padding:12px 13px;color:#315f89}
.actions{flex-shrink:0;padding-top:16px}
button{width:100%;height:38px;border:0;border-radius:12px;background:#2f8fff;color:white;font-size:13px;font-weight:700;box-shadow:0 9px 20px rgba(47,143,255,.24)}
button:focus{outline:3px solid rgba(47,143,255,.26);outline-offset:2px}
@media (prefers-color-scheme:dark){
  html,body{color:#f2f4f8}
  .card{border-color:rgba(255,255,255,.12);background:rgba(31,33,37,.94);box-shadow:0 22px 70px rgba(0,0,0,.38),0 1px 0 rgba(255,255,255,.10) inset}
  .eyebrow,p{color:rgba(242,244,248,.66)}
  section{border-top-color:rgba(255,255,255,.08)}
  h2{color:rgba(255,255,255,.88)}
  .privacy{background:rgba(94,177,255,.13);color:rgba(206,232,255,.86)}
}
</style>
</head>
<body>
  <div class="card" role="dialog" aria-modal="true" aria-labelledby="title">
    <div class="content">
      ${iconSrc ? `<img src="${escapeHtml(iconSrc)}" alt="DeskCat">` : ''}
      <div class="eyebrow">${escapeHtml(eyebrow)}</div>
      <h1 class="title" id="title">${escapeHtml(title)}</h1>
      <p class="intro">${escapeHtml(intro)}</p>
      ${sectionHtml}
      <p class="privacy">${escapeHtml(privacy)}</p>
    </div>
    <div class="actions">
      <button id="ok" type="button">${escapeHtml(okLabel)}</button>
    </div>
  </div>
<script>
const promptId = ${JSON.stringify(id)};
function done(){ window.deskCat.invoke('permission_prompt_result', { id: promptId, accepted: true }); }
document.getElementById('ok').addEventListener('click', done);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' || event.key === 'Enter') done();
});
document.getElementById('ok').focus();
</script>
</body>
</html>`;
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  });
}

function resolvePermissionPromptResult({ id, accepted }) {
  const finish = permissionPromptResolvers.get(String(id || ''));
  if (!finish) return false;
  finish(Boolean(accepted));
  return true;
}

function permissionResultFromSettled(result) {
  if (result.status === 'fulfilled') {
    return { ok: true, message: 'OK' };
  }
  return { ok: false, message: humanizeAppleScriptAccessError(result.reason?.message || result.reason) };
}

function humanizeAppleScriptAccessError(message) {
  const text = String(message || '');
  if (/not authorized|not allowed|拒绝|不被允许|没有权限|(-1743)|(-600)/i.test(text)) {
    return 'permission denied. Enable access in macOS System Settings > Privacy & Security > Automation/Calendars/Reminders for DeskCat or Electron.';
  }
  if (/(-1728)|不能获得|Can.t get/i.test(text)) {
    return 'macOS could not resolve the Calendar/Reminders automation target in this runtime. Try the packaged DeskCat app and run authorization again.';
  }
  return text.replace(/\s+/g, ' ').slice(0, 240);
}

function parseTabRows(text, type) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('\t'))
    .filter((parts) => parts[0] === type)
    .slice(0, 12)
    .map((parts) => {
      if (type === 'calendar') {
        return {
          calendar: parts[1] || '',
          title: parts[2] || '',
          startsAt: parts[3] || '',
          endsAt: parts[4] || '',
          location: parts[5] || '',
        };
      }
      return {
        list: parts[1] || '',
        title: parts[2] || '',
        dueAt: parts[3] || '',
      };
    });
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

async function builtinTranscribeAudio({ request }) {
  const apiKey = getBuiltinApiKey('voice');
  if (!apiKey) throw new Error('内置语音服务未配置，请切换到系统或个人语音服务。');
  return transcribeAudio({
    request: {
      ...request,
      baseUrl: getBuiltinBaseUrl(),
      model: 'gpt-4o-mini-transcribe',
      apiKey,
    },
  });
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

async function builtinSynthesizeSpeech({ request }) {
  const apiKey = getBuiltinApiKey('voice');
  if (!apiKey) throw new Error('内置语音服务未配置，请切换到系统或个人语音服务。');
  return synthesizeSpeech({
    request: {
      ...request,
      baseUrl: getBuiltinBaseUrl(),
      model: 'tts-1',
      apiKey,
    },
  });
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

function checkExecutable(binary, args = ['--version']) {
  return new Promise((resolve, reject) => {
    execFile(binary, args, { timeout: 4000, env: getCodexEnv() }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(String(stdout || stderr || '').trim());
    });
  });
}

async function checkCodingProviderConfig({ provider }) {
  const target = provider === 'claude' ? 'claude' : 'codex';
  const binary = target === 'claude' ? getClaudeBinary() : getCodexBinary();
  try {
    const version = await checkExecutable(binary);
    return {
      ok: true,
      provider: target,
      binary,
      message: version || `${target === 'claude' ? 'Claude Code' : 'Codex'} 可用`,
    };
  } catch (error) {
    const label = target === 'claude' ? 'Claude code' : 'Codex';
    const detail = error && error.code === 'ENOENT'
      ? `未找到 ${binary}。`
      : (error && error.message) || String(error);
    return {
      ok: false,
      provider: target,
      binary,
      message: `无法连接到本机${label}配置：${detail}`,
    };
  }
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

function markCodingOutput(provider) {
  const now = Date.now();
  const state = provider === 'claude' ? claudeCodingState : codingState;
  if (state.running) state.running.lastOutputAt = now;
  if (provider === 'codex' && codexAppServer.activeTurn) codexAppServer.activeTurn.lastOutputAt = now;
}

function setCodingProblem(provider, message, options = {}) {
  const state = provider === 'claude' ? claudeCodingState : codingState;
  const publish = provider === 'claude' ? publishClaudeCodingState : publishCodingState;
  const push = provider === 'claude' ? pushClaudeCodingMessage : pushCodingMessage;
  const text = compactCodingStatusMessage(message, provider === 'claude' ? 'Claude Code 需要处理。' : 'Codex 需要处理。');
  state.status = CODEX_STATUS.NEEDS_INPUT;
  if (options.clearRunning) state.running = null;
  if (provider === 'codex' && codexAppServer.activeTurn) {
    codexAppServer.activeTurn.hasError = true;
    codexAppServer.activeTurn.hasBlockingIssue = true;
    codexAppServer.activeTurn.lastIssue = text;
  }
  push('error', text);
  publish();
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

setInterval(() => {
  const now = Date.now();
  const checks = [
    { provider: 'codex', label: 'Codex', state: codingState },
    { provider: 'claude', label: 'Claude Code', state: claudeCodingState },
  ];
  for (const item of checks) {
    if (!item.state.running || item.state.status !== CODEX_STATUS.WORKING) continue;
    const lastOutputAt = item.state.running.lastOutputAt || item.state.running.startedAt || 0;
    if (!lastOutputAt || now - lastOutputAt < CODING_NO_OUTPUT_TIMEOUT_MS) continue;
    setCodingProblem(item.provider, describeNoOutput(item.label, now - lastOutputAt));
  }
}, 30_000).unref?.();

function formatCodexNotice(method, params = {}) {
  const specific = describeCodexNotice(method, params);
  if (specific) return specific;
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
  return describeCodexNotice(event.type || '', event);
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
  if (codexAppServer.activeTurn) {
    codexAppServer.activeTurn.hasBlockingIssue = true;
    codexAppServer.activeTurn.lastIssue = describeCodexRequest(label, message.params || {});
  }
  pushCodingMessage('error', describeCodexRequest(label, message.params || {}));
  if (message.id != null) {
    try {
      codexWrite({
        id: message.id,
        error: {
          code: -32001,
          message: 'DeskCat 目前不能在小聊天框内处理这类 Codex 授权请求。',
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
      hasBlockingIssue: false,
      lastIssue: '',
      lastOutputAt: Date.now(),
    };
    codingState.running = { type: 'app-server-turn', turnId, startedAt: Date.now(), lastOutputAt: Date.now() };
    codingState.status = CODEX_STATUS.WORKING;
    publishCodingState();
    return;
  }
  if (method === 'item/agentMessage/delta') {
    if (!codexAppServer.activeTurn) return;
    markCodingOutput('codex');
    if (codexAppServer.activeTurn.hasBlockingIssue) {
      codexAppServer.activeTurn.hasBlockingIssue = false;
      codexAppServer.activeTurn.lastIssue = '';
      codingState.status = CODEX_STATUS.WORKING;
      publishCodingState();
    }
    const itemId = String(params.itemId || 'agent');
    const previous = codexAppServer.activeTurn.deltaByItem.get(itemId) || '';
    codexAppServer.activeTurn.deltaByItem.set(itemId, previous + String(params.delta || ''));
    return;
  }
  if (method === 'item/completed' && params.item) {
    markCodingOutput('codex');
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
    const turnText = [
      params.turn?.status,
      extractCodexTextFromValue(params.turn?.error?.message),
      extractCodexTextFromValue(params.turn?.message),
      codexAppServer.activeTurn?.lastIssue,
    ].filter(Boolean).join(' ');
    const failed = params.turn?.status === 'failed'
      || params.turn?.status === 'interrupted'
      || Boolean(codexAppServer.activeTurn?.hasError)
      || Boolean(codexAppServer.activeTurn?.hasBlockingIssue)
      || isBlockingProblemText(turnText);
    codingState.status = failed ? CODEX_STATUS.NEEDS_INPUT : CODEX_STATUS.DONE;
    if (failed) {
      const message = describeCodexNotice('turn/completed failed', {
        ...params.turn,
        error: params.turn?.error,
        message: extractCodexTextFromValue(params.turn?.error?.message) || extractCodexTextFromValue(params.turn?.message) || turnText,
        detail: codexAppServer.activeTurn?.lastIssue,
      }) || extractCodexTextFromValue(params.turn?.error?.message) || 'Codex turn failed.';
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
    const isBlocking = isBlockingProblemText(messageText);
    const isTransient = isTransientProgressText(messageText);
    if (method === 'error' || method === 'guardianWarning' || isBlocking) {
      if (isTransient) {
        codingState.status = CODEX_STATUS.WORKING;
      } else {
        if (codexAppServer.activeTurn) {
          codexAppServer.activeTurn.hasError = true;
          codexAppServer.activeTurn.hasBlockingIssue = true;
          codexAppServer.activeTurn.lastIssue = messageText;
        }
        codingState.running = null;
        codingState.status = CODEX_STATUS.NEEDS_INPUT;
      }
    }
    pushCodingMessage(isBlocking || (method === 'error' && !isTransient) ? 'error' : 'system', messageText);
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
        .filter((line) => /Reconnecting|Falling back|retrying sampling request|error|failed|permission|approv|approval|authorize|confirm|login|capacity|rate limit|quota|interrupted|cancel/i.test(line));
      for (const line of lines) {
        if (isBlockingProblemText(line)) setCodingProblem('codex', line);
        else pushCodingMessage('system', line);
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
        clientInfo: { name: 'deskcat', title: 'DeskCat', version: app.getVersion?.() || '0.1.0' },
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
    if (codingState.status !== CODEX_STATUS.NEEDS_INPUT) codingState.status = CODEX_STATUS.WORKING;
    pushCodingMessage('system', 'Codex 正在工作，请等这次任务结束后再发送。');
    return publishCodingState();
  }

  codingState.status = CODEX_STATUS.WORKING;
  codingState.running = { type: 'app-server-starting', startedAt: Date.now(), lastOutputAt: Date.now() };
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
    codingState.running = { type: 'app-server-turn', turnId, startedAt: Date.now(), lastOutputAt: Date.now() };
    codexAppServer.activeTurn = {
      id: turnId,
      deltaByItem: new Map(),
      pendingAgentTexts: [],
      lastAgentText: '',
      hasError: false,
      hasBlockingIssue: false,
      lastIssue: '',
      lastOutputAt: Date.now(),
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
    markCodingOutput('claude');
    const message = event.message || {};
    const content = extractClaudePrintContent(message.content ?? event.content);
    if (content) {
      const toolOnly = Array.isArray(message.content) && message.content.every((part) => part?.type === 'tool_use');
      pushClaudeCodingMessage(toolOnly ? 'system' : 'codex', content);
    }
    if (claudeCodingState.status !== CODEX_STATUS.NEEDS_INPUT) claudeCodingState.status = CODEX_STATUS.WORKING;
    publishClaudeCodingState();
    return;
  }
  if (event.type === 'result') {
    claudeCodingState.running = null;
    const resultText = [event.result, event.error, event.subtype].filter(Boolean).join(' ');
    const isError = Boolean(event.is_error) || /error|failed|interrupted|cancel/i.test(String(event.subtype || '')) || isBlockingProblemText(resultText);
    if (isError) {
      claudeCodingState.status = CODEX_STATUS.NEEDS_INPUT;
      pushClaudeCodingMessage('error', event.result || event.error || resultText || 'Claude Code 执行失败。');
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
    if (claudeCodingState.status !== CODEX_STATUS.NEEDS_INPUT) claudeCodingState.status = CODEX_STATUS.WORKING;
    pushClaudeCodingMessage('system', 'Claude Code 正在工作，请等这次任务结束后再发送。');
    return publishClaudeCodingState();
  }

  claudeCodingState.status = CODEX_STATUS.WORKING;
  const isFirstClaudeMessage = !claudeCodingSessionStarted;
  const sessionId = claudeCodingState.threadId || randomUUID();
  claudeCodingState.threadId = sessionId;
  claudeCodingSessionStarted = true;
  pushClaudeCodingMessage('user', text);
  if (isFirstClaudeMessage) pushClaudeCodingMessage('system', '正在启动 Claude Code 新 session。');
  const sessionArgs = isFirstClaudeMessage
    ? ['--session-id', sessionId]
    : ['--resume', sessionId];
  const child = spawn(getClaudeBinary(), [
    '-p',
    '--output-format',
    'stream-json',
    '--verbose',
    ...sessionArgs,
    '--permission-mode',
    'default',
    text,
  ], {
    cwd: process.cwd(),
    env: getCodexEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  claudeCodingState.running = { type: 'claude-print', pid: child.pid, startedAt: Date.now(), lastOutputAt: Date.now() };
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
        markCodingOutput('claude');
        pushClaudeCodingMessage('codex', raw);
      }
    }
  });
  child.stderr.on('data', (chunk) => {
    const textChunk = chunk.toString();
    const lines = textChunk.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      if (/permission|approv|approval|authorize|confirm|login|error|failed|reconnect|retry|capacity|rate limit|quota|interrupted|cancel/i.test(line)) {
        if (isBlockingProblemText(line)) setCodingProblem('claude', line);
        else pushClaudeCodingMessage(/error|failed/i.test(line) ? 'error' : 'system', line);
      }
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
  return compactCodingStatusMessage(text, fallback, 2400);
}

function codexSessionTitle(session) {
  const cwdName = session.cwd ? path.basename(session.cwd) : 'Codex';
  return `${cwdName} · ${session.id.slice(0, 8)}`;
}

function codexSessionProblemText(payload) {
  return compactCodexSessionMessage(codexSessionEventText(payload), '');
}

function isCodexTurnAbortedEvent(type = '', payload = {}) {
  const eventType = String(type || '').toLowerCase();
  const payloadType = String(payload.type || payload.kind || payload.subtype || '').toLowerCase();
  const text = codexSessionEventText(payload).toLowerCase();
  return eventType === 'turn_aborted'
    || payloadType === 'turn_aborted'
    || text.includes('<turn_aborted>')
    || text.includes('the user interrupted the previous turn on purpose');
}

function isCodexTurnCompleteEvent(type = '', payload = {}) {
  const eventType = String(type || '').toLowerCase();
  const payloadType = String(payload.type || payload.kind || payload.subtype || '').toLowerCase();
  return /task_complete|turn_complete|turn_completed/.test(eventType)
    || /task_complete|turn_complete|turn_completed/.test(payloadType);
}

function hasExplicitFailureField(payload = {}) {
  const status = String(payload.status || payload.outcome || payload.result || '').toLowerCase();
  const code = String(payload.code || payload.error?.code || '').toLowerCase();
  return Boolean(
    payload.error
    || payload.is_error
    || payload.failed
    || status === 'failed'
    || status === 'error'
    || status === 'interrupted'
    || status === 'cancelled'
    || status === 'canceled'
    || status === 'blocked'
    || /failed|error|interrupted|cancelled|canceled|blocked|denied|rate_limit|capacity/.test(code),
  );
}

function parseCodexToolArguments(payload = {}) {
  const args = payload.arguments ?? payload.args ?? payload.params;
  if (!args) return {};
  if (typeof args === 'object') return args;
  if (typeof args !== 'string') return {};
  try {
    const parsed = JSON.parse(args);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function codexFunctionCallApprovalPayload(payload = {}) {
  const payloadType = String(payload.type || payload.kind || payload.subtype || '').toLowerCase();
  if (!/function_call|tool_call|custom_tool_call/.test(payloadType)) return null;
  const args = parseCodexToolArguments(payload);
  const sandboxPermission = String(args.sandbox_permissions || args.sandboxPermissions || '').toLowerCase();
  const approvalPolicy = String(args.approval_policy || args.approvalPolicy || '').toLowerCase();
  const requiresApproval = args.requiresApproval === true
    || args.requestApproval === true
    || args.needsApproval === true
    || args.requireApproval === true
    || sandboxPermission === 'require_escalated'
    || /requires?_approval|request_approval|require_escalated|escalat/.test(approvalPolicy);
  if (!requiresApproval) return null;
  const command = args.cmd || args.command || args.parsed_cmd || args.argv || '';
  return {
    type: 'request_approval',
    tool: payload.name || payload.method || payload.tool || payloadType,
    command,
    question: args.justification || args.question || args.prompt || args.reason || '需要在 Codex 中批准命令执行。',
    reason: args.sandbox_permissions || args.sandboxPermissions || args.approval_policy || args.approvalPolicy || '',
    options: args.options || args.choices || ['批准', '拒绝'],
  };
}

function isActionableCodexEventType(type = '', payload = {}) {
  const eventType = String(type || '').toLowerCase();
  const payloadType = String(payload.type || payload.kind || payload.subtype || '').toLowerCase();
  if (/session_meta|turn_context|token_count/.test(eventType) || /token_count/.test(payloadType)) return false;
  if (/response_item/.test(eventType)) {
    return Boolean(codexFunctionCallApprovalPayload(payload))
      || hasExplicitFailureField(payload)
      || /error|failed|interrupted|cancelled|canceled|blocked|request_approval|requestapproval|needs_approval|requires_approval|request_user_input|needs_input|requires_action|guardian/.test(payloadType);
  }
  if (/event_msg/.test(eventType)) {
    if (/agent_message|assistant_message|final_answer|task_complete|turn_complete|turn_completed|user_message|user_input|prompt|begin|started|running|exec_command|function_call|tool_call|patch_apply_begin|patch_apply_end|web_search_begin|web_search_end/.test(payloadType)) {
      return hasExplicitFailureField(payload);
    }
    return hasExplicitFailureField(payload) || /error|failed|failure|interrupted|cancelled|canceled|blocked|denied|forbidden|guardian|request_approval|requestapproval|needs_approval|requires_approval|approval_request|request_user_input|needs_input|requires_action|permission/.test(payloadType);
  }
  return /error|failed|failure|interrupted|cancelled|canceled|blocked|denied|forbidden|guardian|approval|permission/.test(eventType)
    || hasExplicitFailureField(payload);
}

function describeCodexSessionActionableProblem(type, payload) {
  if (!isActionableCodexEventType(type, payload)) return '';
  const problemPayload = /response_item/i.test(String(type || ''))
    ? (codexFunctionCallApprovalPayload(payload) || payload)
    : payload;
  const message = describeCodexSessionProblemEvent(type, problemPayload, codexSessionProblemText(problemPayload));
  if (message) return message;
  return compactCodexSessionMessage(codexSessionEventText(problemPayload), '需要在 Codex 中处理');
}

function isCodexProblemEvent(type, payload) {
  return Boolean(describeCodexSessionActionableProblem(type, payload));
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
    if (isCodexTurnAbortedEvent(event.type, payload)) {
      lastAssistantAt = eventAt;
      lastAssistant = 'Codex 已停止。';
      continue;
    }
    if (isCodexTurnCompleteEvent(event.type, payload)) {
      lastAssistantAt = eventAt;
      lastAssistant = compactCodexSessionMessage(codexSessionEventText(payload), 'Codex 执行完毕。');
      continue;
    }
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
        if (message) {
          lastAssistantAt = eventAt;
          lastAssistant = message;
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
      if (isCodexTurnAbortedEvent(event.type, payload)) {
        lastAssistantAt = eventAt;
        lastAssistant = 'Codex 已停止。';
        continue;
      }
      if (payload.role === 'user') {
        lastUserAt = Math.max(lastUserAt, eventAt);
        continue;
      }
      const actionableProblem = describeCodexSessionActionableProblem(event.type, payload);
      if (actionableProblem) {
        lastProblemAt = eventAt;
        lastProblem = actionableProblem;
        continue;
      }
      if (payload.role === 'assistant' || payload.type === 'message') {
        const message = compactCodexSessionMessage(codexSessionEventText(payload), '');
        if (message) {
          lastAssistantAt = eventAt;
          lastAssistant = message;
        }
      }
      if (/function_call|tool|command|exec/i.test(String(payload.type || ''))) {
        lastWorkAt = Math.max(lastWorkAt, eventAt);
      }
      continue;
    }
    if (isCodexProblemEvent(event.type, payload)) {
      lastProblemAt = eventAt;
      lastProblem = describeCodexSessionActionableProblem(event.type, payload);
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
  const resolvedStatus = resolveSessionStatus({ lastUserAt, lastWorkAt, lastAssistantAt, lastProblemAt });
  if (resolvedStatus === CODEX_STATUS.NEEDS_INPUT) {
    session.status = CODEX_STATUS.NEEDS_INPUT;
    session.message = `${prefix} ${lastProblem}`;
    session.eventAt = lastProblemAt;
  } else if (resolvedStatus === CODEX_STATUS.DONE) {
    session.status = CODEX_STATUS.DONE;
    session.message = `${prefix} ${lastAssistant}`;
    session.eventAt = lastAssistantAt;
  } else {
    const stalledMs = Date.now() - latestActivityAt;
    if (stalledMs >= CODING_NO_OUTPUT_TIMEOUT_MS) {
      session.status = CODEX_STATUS.NEEDS_INPUT;
      session.message = `${prefix} ${describeNoOutput('Codex', stalledMs)}`;
      session.eventAt = latestActivityAt;
    } else {
      session.status = CODEX_STATUS.WORKING;
      session.message = `${prefix} ${lastProgress || 'Codex 正在工作中'}`;
      session.eventAt = latestActivityAt;
    }
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
  for (const session of sessions) {
    if (session.status !== CODEX_STATUS.DONE || session.updatedAt >= deskcatStartedAt) {
      inheritedCodingSeenActive.add(session.id);
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
  const visibleSessions = sessions.filter((session) => (
    session.status !== CODEX_STATUS.DONE
    || inheritedCodingSeenActive.has(session.id)
  ));
  return {
    provider: 'codex',
    status,
    messages,
    allSessions: visibleSessions.slice(0, 12).map((session) => ({
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
const inheritedClaudeSeenActive = new Set();

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

    if (message.stop_reason === 'end_turn' || (textMessage && toolUses.length === 0)) {
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
  const resolvedStatus = resolveSessionStatus({ lastUserAt, lastWorkAt, lastAssistantAt, lastProblemAt });
  if (resolvedStatus === CODEX_STATUS.NEEDS_INPUT) {
    session.status = CODEX_STATUS.NEEDS_INPUT;
    session.message = `${prefix} ${lastProblem}`;
    session.eventAt = lastProblemAt;
  } else if (resolvedStatus === CODEX_STATUS.DONE) {
    session.status = CODEX_STATUS.DONE;
    session.message = `${prefix} ${lastAssistant}`;
    session.eventAt = lastAssistantAt;
  } else {
    const stalledMs = Date.now() - latestActivityAt;
    if (stalledMs >= CODING_NO_OUTPUT_TIMEOUT_MS) {
      session.status = CODEX_STATUS.NEEDS_INPUT;
      session.message = `${prefix} ${describeNoOutput('Claude Code', stalledMs)}`;
      session.eventAt = latestActivityAt;
    } else {
      session.status = CODEX_STATUS.WORKING;
      session.message = `${prefix} ${lastProgress || 'Claude Code 正在工作中'}`;
      session.eventAt = latestActivityAt;
    }
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
  for (const session of sessions) {
    if (session.status !== CODEX_STATUS.DONE || session.updatedAt >= deskcatStartedAt) {
      inheritedClaudeSeenActive.add(session.id);
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
  const visibleSessions = sessions.filter((session) => (
    session.status !== CODEX_STATUS.DONE
    || inheritedClaudeSeenActive.has(session.id)
  ));
  return {
    provider: 'claude',
    status,
    messages,
    allSessions: visibleSessions.slice(0, 12).map((session) => ({
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

const handlers = {
  show_settings_cmd: ({ section }) => showSettingsWindow(section),
  show_chat_window: () => showChatWindow(),
  show_compact_chat_window: (args) => showCompactChatWindow(args, true),
  position_compact_chat_window: (args) => showCompactChatWindow(args, false),
  hide_compact_chat_window: ({ suppressReopenMs = 0, reason = '' } = {}) => {
    const suppressMs = Math.max(0, Math.min(5000, Number(suppressReopenMs) || 0));
    debugCompactChat('hide compact chat', {
      reason,
      suppressReopenMs: suppressMs,
      snapshot: compactChatWindowSnapshot(windows.get('compact-chat')),
    });
    if (suppressMs > 0) compactChatHiddenUntil = Date.now() + suppressMs;
    windows.get('compact-chat')?.hide();
    return true;
  },
  is_compact_chat_visible: () => {
    const win = windows.get('compact-chat');
    return Boolean(win && !win.isDestroyed() && win.isVisible());
  },
  focus_compact_chat_window: () => {
    focusCompactChatWindowForInput('invoke:focus_compact_chat_window');
  },
  focus_compact_chat_input: () => broadcast('compact-chat:focus-input', {}),
  show_pet_window: () => showPetWindow(),
  hide_pet_window: () => hidePetWindow(),
  read_pet_presence_context: readPetPresenceContext,
  quit_app: () => app.quit(),
  pin_pet_above_fullscreen_cmd: () => applyFloatingFullscreenBehavior(windows.get('pet'), { force: true }),
  unpin_pet_from_fullscreen_cmd: () => windows.get('pet')?.setAlwaysOnTop(false),
  set_topmost_suppressed: ({ suppressed }) => {
    topmostSuppressed = Boolean(suppressed);
    if (topmostSuppressed) {
      for (const label of ['pet', 'compact-chat']) {
        const win = windows.get(label);
        if (win && !win.isDestroyed()) win.setAlwaysOnTop(false);
      }
    }
    return topmostSuppressed;
  },
  set_pet_context_menu_open: ({ open }) => {
    petContextMenuOpen = Boolean(open);
    const pet = windows.get('pet');
    if (pet && !pet.isDestroyed()) {
      applyFloatingFullscreenBehavior(pet, { force: true });
      if (petContextMenuOpen) pet.moveTop();
    }
    if (!petContextMenuOpen) {
      const compact = windows.get('compact-chat');
      if (compact && !compact.isDestroyed() && compact.isVisible()) {
        applyFloatingFullscreenBehavior(compact, { force: true });
      }
    }
    debugCompactChat(petContextMenuOpen ? 'pet context menu raised' : 'pet context menu closed', {
      petSnapshot: compactChatWindowSnapshot(pet),
      compactSnapshot: compactChatWindowSnapshot(windows.get('compact-chat')),
    });
    return petContextMenuOpen;
  },
  start_topmost_guard: () => {
    ensureTopmostGuard();
  },
  stop_topmost_guard: () => {
    if (topmostGuard) clearInterval(topmostGuard);
    topmostGuard = null;
  },
  import_pet_image: importPetImage,
  list_pet_images: listPetImages,
  pick_chat_image: (_args, event) => pickChatAttachment(event),
  pick_chat_attachment: (_args, event) => pickChatAttachment(event),
  renderer_window_ready: (_args, event) => {
    markRendererReady(BrowserWindow.fromWebContents(event.sender));
  },
  delete_pet_image: async ({ filePath }) => {
    ensureUserAsset(filePath);
    await fsp.unlink(filePath);
  },
  read_pet_image_data_url: readPetImageDataUrl,
  pet_window_layout_ready: (_args, event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || windows.get('pet');
    petVisibilityController.markLayoutReady(win, {
      applyTopmost: (target) => applyFloatingFullscreenBehavior(target, { force: true }),
    });
  },
  resize_compact_chat_window: ({ height }) => {
    if (Date.now() < compactChatHiddenUntil) return;
    const win = windows.get('compact-chat');
    if (!win || win.isDestroyed() || !win.isVisible()) return;
    const [width, currentHeight] = win.getSize();
    const nextHeight = Math.max(1, Math.round(Number(height) || currentHeight));
    if (Math.abs(currentHeight - nextHeight) <= 1) return;
    debugCompactChat('resize compact chat', { currentHeight, nextHeight, snapshot: compactChatWindowSnapshot(win) });
    win.setSize(width, nextHeight);
    applyFloatingFullscreenBehavior(win);
  },
  capture_screen_region: captureScreenRegion,
  open_external_url: ({ url }) => shell.openExternal(url),
  chat_completion: chatCompletion,
  builtin_chat_completion: builtinChatCompletion,
  get_builtin_service_status: getBuiltinServiceStatus,
  test_ai_connection: testAiConnection,
  read_system_knowledge_device_info: readSystemKnowledgeDeviceInfo,
  read_system_knowledge_weather_info: readSystemKnowledgeWeatherInfo,
  read_system_knowledge_schedule_info: readSystemKnowledgeScheduleInfo,
  request_system_knowledge_permissions: requestSystemKnowledgePermissions,
  show_permission_prompt_overlay: (args, event) => showPermissionPromptOverlay(args, event),
  get_welcome_permission_prompt_seen: () => hasSeenWelcomePermissionPrompt(app.getPath('userData')),
  mark_welcome_permission_prompt_seen: () => {
    try {
      markWelcomePermissionPromptSeen(app.getPath('userData'));
      return true;
    } catch {
      return false;
    }
  },
  show_welcome_permission_prompt: (_args, event) => showWelcomePermissionPrompt(event),
  permission_prompt_result: resolvePermissionPromptResult,
  transcribe_audio: transcribeAudio,
  builtin_transcribe_audio: builtinTranscribeAudio,
  synthesize_speech: synthesizeSpeech,
  builtin_synthesize_speech: builtinSynthesizeSpeech,
  can_start_speech_recognition: () => true,
  check_distraction: checkDistraction,
  ensure_accessibility_permission: ensureAccessibilityPermission,
  check_accessibility_permission: checkAccessibilityPermission,
  check_for_updates: () => checkForAppUpdates({ manual: true }),
  install_downloaded_update: () => {
    if (!updaterState.downloaded) return false;
    autoUpdater.quitAndInstall(false, true);
    return true;
  },
  timeline_debug_log: timelineDebugLog,
  read_timeline_active_window: readTimelineActiveWindow,
  read_timeline_background_markers: readTimelineBackgroundOnly,
  read_system_activity_state: readSystemActivityState,
  get_launch_at_login: () => app.getLoginItemSettings().openAtLogin,
  set_launch_at_login: ({ enabled }) => {
    app.setLoginItemSettings({ openAtLogin: Boolean(enabled), openAsHidden: false });
    return app.getLoginItemSettings().openAtLogin;
  },
  coding_get_state: () => publishCodingState(),
  coding_get_claude_state: () => publishClaudeCodingState(),
  coding_get_inherited_state: getInheritedCodingState,
  coding_ack_inherited_sessions: ackInheritedCodingSessions,
  coding_get_claude_inherited_state: getInheritedClaudeCodingState,
  coding_ack_claude_inherited_sessions: ackInheritedClaudeCodingSessions,
  coding_check_provider_config: checkCodingProviderConfig,
  coding_send_message: (args) => (args?.provider === 'claude' ? sendClaudeCodingMessage(args) : sendCodingMessage(args)),
  coding_clear: () => {
    codingState.messages = [];
    if (!codingState.running) codingState.status = CODEX_STATUS.DONE;
    return publishCodingState();
  },
  coding_clear_claude: () => {
    claudeCodingState.messages = [];
    claudeCodingState.threadId = '';
    claudeCodingSessionStarted = false;
    if (!claudeCodingState.running) claudeCodingState.status = CODEX_STATUS.DONE;
    return publishClaudeCodingState();
  },
  set_app_icon: ({ path: iconPath }) => setAppIcon(iconPath),
  move_pet_and_compact_chat: ({ pet, compact }, event) => {
    const petWin = BrowserWindow.fromWebContents(event.sender) || windows.get('pet');
    const compactWin = windows.get('compact-chat');
    if (petWin && !petWin.isDestroyed() && pet && Number.isFinite(Number(pet.x)) && Number.isFinite(Number(pet.y))) {
      petWin.setPosition(Math.round(Number(pet.x)), Math.round(Number(pet.y)));
    }
    if (
      Date.now() >= compactChatHiddenUntil &&
      compactWin &&
      !compactWin.isDestroyed() &&
      compactWin.isVisible() &&
      compact &&
      Number.isFinite(Number(compact.x)) &&
      Number.isFinite(Number(compact.y))
    ) {
      compactWin.setPosition(Math.round(Number(compact.x)), Math.round(Number(compact.y)));
      compactWin.setIgnoreMouseEvents(false);
    }
    return null;
  },
  save_api_key: ({ keyringRef, key }) => {
    if (!secureKeyStore) secureKeyStore = createSecureKeyStore({ userDataPath: app.getPath('userData'), safeStorage });
    secureKeyStore.save(keyringRef, key);
  },
  get_api_key: ({ keyringRef }) => {
    if (!secureKeyStore) secureKeyStore = createSecureKeyStore({ userDataPath: app.getPath('userData'), safeStorage });
    return secureKeyStore.get(keyringRef) || '';
  },
  delete_api_key: ({ keyringRef }) => {
    if (!secureKeyStore) secureKeyStore = createSecureKeyStore({ userDataPath: app.getPath('userData'), safeStorage });
    secureKeyStore.remove(keyringRef);
  },
};

ipcMain.handle('deskcat:invoke', async (_event, command, args) => {
  const handler = handlers[command];
  if (!handler) throw new Error(`Unknown command: ${command}`);
  return handler(args || {}, _event);
});

ipcMain.handle('deskcat:emit', (_event, channel, payload) => {
  broadcast(channel, payload);
});

ipcMain.handle('deskcat:window', (event, action, value) => {
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
  if (action === 'setBounds') {
    win.setBounds({
      x: Math.round(value.x),
      y: Math.round(value.y),
      width: Math.round(value.width),
      height: Math.round(value.height),
    });
    return null;
  }
  return null;
});

ipcMain.handle('deskcat:current-monitor', (event) => {
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

ipcMain.handle('deskcat:open-dialog', async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const parent = options.detached ? undefined : (win || undefined);
  const result = await dialog.showOpenDialog(parent, {
    properties: options.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
    filters: options.filters || [],
  });
  if (result.canceled) return null;
  return options.multiple ? result.filePaths : result.filePaths[0] || null;
});

async function pickChatAttachment(event) {
  const parent = event?.sender ? BrowserWindow.fromWebContents(event.sender) : windows.get('pet');
  if (parent && !parent.isDestroyed()) {
    applyFloatingFullscreenBehavior(parent, { force: true });
  }
  const result = await dialog.showOpenDialog(parent && !parent.isDestroyed() ? parent : undefined, {
    properties: ['openFile'],
    filters: [
      { name: 'Images and Documents', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'pdf', 'docx'] },
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] },
      { name: 'Documents', extensions: ['pdf', 'docx'] },
    ],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  const ext = path.extname(filePath).toLowerCase();
  if (!CHAT_IMAGE_EXTENSIONS.has(ext) && !CHAT_DOCUMENT_EXTENSIONS.has(ext)) {
    throw new Error('请选择 PNG、JPG、JPEG、WEBP、GIF、BMP、PDF 或 DOCX 文件');
  }
  const bytes = await fsp.readFile(filePath);
  if (CHAT_DOCUMENT_EXTENSIONS.has(ext)) {
    const extracted = ext === '.pdf'
      ? await extractPdfText(bytes)
      : await extractDocxText(filePath);
    const normalized = normalizeDocumentText(extracted);
    if (!normalized) throw new Error('未能从文档中提取文本，请换一个可复制文字的 PDF 或 DOCX。');
    const truncated = normalized.length > CHAT_DOCUMENT_TEXT_LIMIT;
    return {
      path: filePath,
      name: path.basename(filePath),
      kind: 'document',
      text: truncated ? normalized.slice(0, CHAT_DOCUMENT_TEXT_LIMIT) : normalized,
      truncated,
    };
  }
  return {
    path: filePath,
    name: path.basename(filePath),
    kind: 'image',
    dataUrl: `data:${imageMime(filePath)};base64,${bytes.toString('base64')}`,
  };
}

async function extractPdfText(bytes) {
  const { PDFParse } = require('pdf-parse');
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return result.text || '';
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function extractDocxText(filePath) {
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value || '';
}

function normalizeDocumentText(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

ipcMain.handle('deskcat:pick-chat-image', async (event) => pickChatAttachment(event));
ipcMain.handle('deskcat:pick-chat-attachment', async (event) => pickChatAttachment(event));

function registerProtocols() {
  protocol.handle('deskcat-app', async (request) => {
    const url = new URL(request.url);
    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filePath = path.join(app.getAppPath(), 'dist', pathname.replace(/^\/+/, ''));
    return new Response(await fsp.readFile(filePath), {
      headers: { 'content-type': contentType(filePath) },
    });
  });
  protocol.handle('deskcat-file', async (request) => {
    const filePath = decodeURIComponent(new URL(request.url).pathname.replace(/^\/+/, ''));
    return new Response(await fsp.readFile(filePath), {
      headers: { 'content-type': contentType(filePath) },
    });
  });
}

app.whenReady().then(() => {
  registerProtocols();
  secureKeyStore = createSecureKeyStore({ userDataPath: app.getPath('userData'), safeStorage });
  app.setLoginItemSettings({ openAtLogin: true, openAsHidden: false });
  setAppIcon('assets/idle/png/idle.png');
  createPetWindow();
  ensureTopmostGuard();
  setTimeout(() => {
    checkForAppUpdates().catch((error) => {
      updaterState.lastError = error instanceof Error ? error.message : String(error || '');
      broadcastUpdateStatus('error');
    });
  }, 5000);
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
