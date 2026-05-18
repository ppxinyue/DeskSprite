const { execFile } = require('node:child_process');

const EMPTY_ACTIVE_WINDOW = {
  supported: true,
  appName: '',
  windowTitle: '',
  url: '',
  error: null,
};

function windowsActiveWindowScript() {
  return `
$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class DeskCatForegroundWindow {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@

$hwnd = [DeskCatForegroundWindow]::GetForegroundWindow()
if ($hwnd -eq [IntPtr]::Zero) {
  [pscustomobject]@{ appName = ""; windowTitle = ""; processId = 0; path = "" } | ConvertTo-Json -Compress
  exit 0
}

$titleBuilder = New-Object System.Text.StringBuilder 1024
[void][DeskCatForegroundWindow]::GetWindowText($hwnd, $titleBuilder, $titleBuilder.Capacity)

$processId = 0
[void][DeskCatForegroundWindow]::GetWindowThreadProcessId($hwnd, [ref]$processId)

$processName = ""
$processPath = ""
try {
  $process = Get-Process -Id $processId -ErrorAction Stop
  $processName = $process.ProcessName
  try {
    $processPath = $process.MainModule.FileName
  } catch {
    $processPath = ""
  }
} catch {
  $processName = ""
}

[pscustomobject]@{
  appName = $processName
  windowTitle = $titleBuilder.ToString()
  processId = [int]$processId
  path = $processPath
} | ConvertTo-Json -Compress
`;
}

function normalizeWindowsAppName(value) {
  const name = String(value || '').trim();
  return name.replace(/\.exe$/i, '');
}

function parseWindowsActiveWindowJson(stdout) {
  const text = String(stdout || '').trim();
  if (!text) return { ...EMPTY_ACTIVE_WINDOW, error: 'empty active window response' };
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      ...EMPTY_ACTIVE_WINDOW,
      error: `invalid active window response: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  return {
    supported: true,
    appName: normalizeWindowsAppName(parsed.appName),
    windowTitle: String(parsed.windowTitle || '').trim(),
    url: '',
    processId: Number(parsed.processId) || 0,
    path: String(parsed.path || '').trim(),
    error: null,
  };
}

function readActiveWindowWindows({ execFileFn = execFile, timeout = 2500, log = () => {} } = {}) {
  return new Promise((resolve) => {
    execFileFn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', windowsActiveWindowScript()],
      { timeout },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr || error.message || String(error);
          log({ stage: 'windows-active-window:error', error: detail });
          resolve({
            supported: true,
            appName: '',
            windowTitle: '',
            url: '',
            error: detail,
          });
          return;
        }
        resolve(parseWindowsActiveWindowJson(stdout));
      },
    );
  });
}

module.exports = {
  normalizeWindowsAppName,
  parseWindowsActiveWindowJson,
  readActiveWindowWindows,
  windowsActiveWindowScript,
};
