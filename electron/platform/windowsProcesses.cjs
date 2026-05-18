const { execFile } = require('node:child_process');

function windowsProcessListScript() {
  return `
$ErrorActionPreference = 'Stop'
Get-CimInstance Win32_Process |
  Select-Object ProcessId,Name,CommandLine |
  ConvertTo-Json -Compress -Depth 2
`;
}

function normalizeProcessName(value) {
  return String(value || '').trim().replace(/\.exe$/i, '');
}

function parseWindowsProcessJson(stdout) {
  const text = String(stdout || '').trim();
  if (!text) return [];
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows
    .map((row) => ({
      pid: Number(row.ProcessId ?? row.processId) || 0,
      name: normalizeProcessName(row.Name ?? row.name),
      commandLine: String(row.CommandLine ?? row.commandLine ?? '').trim(),
    }))
    .filter((row) => row.pid || row.name || row.commandLine);
}

function readWindowsProcesses({ execFileFn = execFile, timeout = 2500, log = () => {} } = {}) {
  return new Promise((resolve) => {
    execFileFn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', windowsProcessListScript()],
      { timeout, maxBuffer: 1024 * 1024 * 4 },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr || error.message || String(error);
          log({ stage: 'windows-processes:error', error: detail });
          resolve([]);
          return;
        }
        resolve(parseWindowsProcessJson(stdout));
      },
    );
  });
}

function isOwnProcess(row, ownPid) {
  return ownPid && Number(row.pid) === Number(ownPid);
}

function isDeskCatHelperProcess(lower) {
  return /electron\\main\.cjs|electron\/main\.cjs|--type=(gpu-process|utility|renderer)|networkservice/.test(lower)
    || /deskcat-process-list|getciminstance win32_process|convertto-json/.test(lower)
    || /windowsprocesses\.cjs|readwindowsprocesses|createwindowsbackgroundmarkers/.test(lower)
    || /node_repl|jsonservermain|node-ipc|openconsole|conpty/.test(lower);
}

function isTrackableWindowsCommand(row, ownPid = process.pid) {
  if (!row || isOwnProcess(row, ownPid)) return false;
  const name = normalizeProcessName(row.name).toLowerCase();
  const command = String(row.commandLine || '').toLowerCase();
  const haystack = `${name} ${command}`;
  if (!haystack.trim()) return false;
  if (isDeskCatHelperProcess(haystack)) return false;
  return /\b(?:pnpm|npm|yarn|bun|cargo|uvicorn|pytest|python|node|tsx|ts-node|next|claude|claude-code|codex)\b/.test(haystack)
    || /electron:dev|@anthropic-ai[\\/]claude-code|codex\s+exec/.test(haystack)
    || /^(windowsterminal|powershell|pwsh|cmd)$/.test(name);
}

function normalizeWindowsCommand(row) {
  const name = normalizeProcessName(row?.name);
  const command = String(row?.commandLine || '').replace(/\s+/g, ' ').trim();
  const lower = `${name} ${command}`.toLowerCase();
  if (/\bpnpm\s+electron:dev\b/.test(lower)) return 'pnpm electron:dev';
  if (/\bpnpm\s+dev\b/.test(lower)) return 'pnpm dev';
  if (/\bnpm\s+run\s+dev\b/.test(lower)) return 'npm run dev';
  if (/\byarn\s+dev\b/.test(lower)) return 'yarn dev';
  if (/\bbun\s+dev\b/.test(lower)) return 'bun dev';
  if (/@anthropic-ai[\\/]claude-code|\bclaude-code\b|\bclaude\b/.test(lower)) {
    const match = command.match(/\b(?:claude-code|claude)\b(?:\s+(.+))?/i);
    return match?.[1] ? `claude ${match[1]}`.slice(0, 160) : 'claude';
  }
  if (/\bcodex\s+exec\b/.test(lower)) {
    const match = command.match(/\bcodex\s+exec\b.*$/i);
    return (match?.[0] || 'codex exec').slice(0, 160);
  }
  if (/\bcodex\b/.test(lower)) return 'codex';
  if (/\bcargo\b/.test(lower)) return command.match(/\bcargo\b.*$/i)?.[0].slice(0, 160) || 'cargo';
  if (/\bpytest\b/.test(lower)) return command.match(/\bpytest\b.*$/i)?.[0].slice(0, 160) || 'pytest';
  if (/\bpython\b/.test(lower)) return command.match(/\bpython\b.*$/i)?.[0].slice(0, 160) || 'python';
  if (/\bnode\b/.test(lower)) return command.match(/\bnode\b.*$/i)?.[0].slice(0, 160) || 'node';
  if (/^(windowsterminal|powershell|pwsh|cmd)$/i.test(name)) return name;
  return (command || name).slice(0, 160);
}

function compactMarkers(markers) {
  const seen = new Set();
  const result = [];
  for (const marker of markers) {
    const key = `${marker.type}\0${marker.name}\0${marker.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(marker);
  }
  return result;
}

function windowsMusicProcessNames() {
  return new Set([
    'spotify',
    'cloudmusic',
    'music.ui',
    'applemusic',
    'qqmusic',
    'neteasecloudmusic',
  ]);
}

function createWindowsBackgroundMarkers(processes, { musicAppKeywords = [], ownPid = process.pid } = {}) {
  const rows = Array.isArray(processes) ? processes : [];
  const terminalMarkers = rows
    .filter((row) => isTrackableWindowsCommand(row, ownPid))
    .map((row) => ({
      type: 'terminal',
      name: normalizeProcessName(row.name) || 'Terminal',
      detail: normalizeWindowsCommand(row),
    }))
    .filter((marker) => marker.detail);

  const configuredMusic = (musicAppKeywords || [])
    .map((keyword) => String(keyword || '').trim().toLowerCase())
    .filter(Boolean);
  const knownMusic = windowsMusicProcessNames();
  const musicMarkers = rows
    .filter((row) => {
      const name = normalizeProcessName(row.name).toLowerCase();
      if (!name) return false;
      return knownMusic.has(name) || configuredMusic.some((keyword) => name.includes(keyword));
    })
    .map((row) => ({
      type: 'music',
      name: normalizeProcessName(row.name) || 'Music',
      detail: 'running',
    }));

  return compactMarkers([...terminalMarkers, ...musicMarkers]).slice(0, 12);
}

module.exports = {
  createWindowsBackgroundMarkers,
  normalizeProcessName,
  normalizeWindowsCommand,
  parseWindowsProcessJson,
  readWindowsProcesses,
  windowsProcessListScript,
};
