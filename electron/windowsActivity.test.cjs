const assert = require('node:assert/strict');
const test = require('node:test');
const {
  normalizeWindowsAppName,
  parseWindowsActiveWindowJson,
  readActiveWindowWindows,
  windowsActiveWindowScript,
} = require('./platform/windowsActivity.cjs');

test('normalizes Windows executable names without touching friendly names', () => {
  assert.equal(normalizeWindowsAppName('Code.exe'), 'Code');
  assert.equal(normalizeWindowsAppName('Windows Terminal'), 'Windows Terminal');
  assert.equal(normalizeWindowsAppName(' chrome.EXE '), 'chrome');
});

test('parses Windows active window PowerShell JSON into timeline shape', () => {
  const parsed = parseWindowsActiveWindowJson(JSON.stringify({
    appName: 'Code.exe',
    windowTitle: 'DeskCat - Visual Studio Code',
    processId: 1234,
    path: 'C:\\Users\\Lenovo\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe',
  }));

  assert.deepEqual(parsed, {
    supported: true,
    appName: 'Code',
    windowTitle: 'DeskCat - Visual Studio Code',
    url: '',
    processId: 1234,
    path: 'C:\\Users\\Lenovo\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe',
    error: null,
  });
});

test('invalid Windows active window output fails closed with a supported error', () => {
  const parsed = parseWindowsActiveWindowJson('not-json');

  assert.equal(parsed.supported, true);
  assert.equal(parsed.appName, '');
  assert.equal(parsed.windowTitle, '');
  assert.match(parsed.error, /invalid active window response/);
});

test('Windows active window script uses user32 foreground APIs and JSON output', () => {
  const script = windowsActiveWindowScript();

  assert.match(script, /GetForegroundWindow/);
  assert.match(script, /GetWindowText/);
  assert.match(script, /GetWindowThreadProcessId/);
  assert.match(script, /ConvertTo-Json -Compress/);
});

test('readActiveWindowWindows invokes PowerShell without profiles', async () => {
  const calls = [];
  const result = await readActiveWindowWindows({
    execFileFn: (command, args, options, callback) => {
      calls.push({ command, args, options });
      callback(null, JSON.stringify({
        appName: 'WindowsTerminal.exe',
        windowTitle: 'PowerShell',
        processId: 42,
        path: 'C:\\Program Files\\WindowsApps\\Microsoft.WindowsTerminal\\WindowsTerminal.exe',
      }), '');
    },
  });

  assert.equal(calls[0].command, 'powershell.exe');
  assert.deepEqual(calls[0].args.slice(0, 3), ['-NoProfile', '-ExecutionPolicy', 'Bypass']);
  assert.equal(calls[0].options.timeout, 2500);
  assert.equal(result.appName, 'WindowsTerminal');
  assert.equal(result.windowTitle, 'PowerShell');
});

test('readActiveWindowWindows returns an error payload when PowerShell fails', async () => {
  const logs = [];
  const result = await readActiveWindowWindows({
    log: (payload) => logs.push(payload),
    execFileFn: (_command, _args, _options, callback) => {
      callback(new Error('access denied'), '', 'denied by policy');
    },
  });

  assert.equal(result.supported, true);
  assert.equal(result.appName, '');
  assert.equal(result.windowTitle, '');
  assert.equal(result.error, 'denied by policy');
  assert.equal(logs[0].stage, 'windows-active-window:error');
});
