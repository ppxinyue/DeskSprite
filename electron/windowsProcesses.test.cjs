const assert = require('node:assert/strict');
const test = require('node:test');
const {
  createWindowsBackgroundMarkers,
  normalizeProcessName,
  normalizeWindowsCommand,
  parseWindowsProcessJson,
  readWindowsProcesses,
  windowsProcessListScript,
} = require('./platform/windowsProcesses.cjs');

test('normalizes Windows process names across exe casing', () => {
  assert.equal(normalizeProcessName('powershell.exe'), 'powershell');
  assert.equal(normalizeProcessName('Code.EXE'), 'Code');
  assert.equal(normalizeProcessName('WindowsTerminal'), 'WindowsTerminal');
});

test('parses CIM process JSON arrays and single objects', () => {
  const rows = parseWindowsProcessJson(JSON.stringify([
    { ProcessId: 10, Name: 'Code.exe', CommandLine: '"Code.exe" D:\\repo' },
    { ProcessId: 11, Name: 'node.exe', CommandLine: 'node server.js' },
  ]));
  const single = parseWindowsProcessJson(JSON.stringify({ ProcessId: 12, Name: 'Spotify.exe', CommandLine: null }));

  assert.deepEqual(rows, [
    { pid: 10, name: 'Code', commandLine: '"Code.exe" D:\\repo' },
    { pid: 11, name: 'node', commandLine: 'node server.js' },
  ]);
  assert.deepEqual(single, [{ pid: 12, name: 'Spotify', commandLine: '' }]);
});

test('invalid CIM JSON fails closed to an empty process list', () => {
  assert.deepEqual(parseWindowsProcessJson('not-json'), []);
  assert.deepEqual(parseWindowsProcessJson(''), []);
});

test('Windows process script uses CIM and compressed JSON', () => {
  const script = windowsProcessListScript();

  assert.match(script, /Get-CimInstance Win32_Process/);
  assert.match(script, /ProcessId,Name,CommandLine/);
  assert.match(script, /ConvertTo-Json -Compress/);
});

test('creates terminal and music markers from Windows processes', () => {
  const markers = createWindowsBackgroundMarkers([
    { pid: 1, name: 'WindowsTerminal.exe', commandLine: 'WindowsTerminal.exe' },
    { pid: 2, name: 'node.exe', commandLine: 'node .\\node_modules\\vite\\bin\\vite.js --host 127.0.0.1' },
    { pid: 3, name: 'pnpm.exe', commandLine: 'pnpm electron:dev' },
    { pid: 4, name: 'Codex.exe', commandLine: 'codex exec "fix this"' },
    { pid: 5, name: 'Spotify.exe', commandLine: 'Spotify.exe' },
  ], { ownPid: 999 });

  assert.deepEqual(markers, [
    { type: 'terminal', name: 'WindowsTerminal', detail: 'WindowsTerminal' },
    { type: 'terminal', name: 'node', detail: 'node .\\node_modules\\vite\\bin\\vite.js --host 127.0.0.1' },
    { type: 'terminal', name: 'pnpm', detail: 'pnpm electron:dev' },
    { type: 'terminal', name: 'Codex', detail: 'codex exec "fix this"' },
    { type: 'music', name: 'Spotify', detail: 'running' },
  ]);
});

test('configured music process keywords are recognized on Windows', () => {
  const markers = createWindowsBackgroundMarkers([
    { pid: 8, name: 'foobar2000.exe', commandLine: 'foobar2000.exe' },
  ], { musicAppKeywords: ['foobar'], ownPid: 999 });

  assert.deepEqual(markers, [
    { type: 'music', name: 'foobar2000', detail: 'running' },
  ]);
});

test('DeskCat helper process scans and the current process are ignored', () => {
  const markers = createWindowsBackgroundMarkers([
    { pid: 10, name: 'powershell.exe', commandLine: 'Get-CimInstance Win32_Process | ConvertTo-Json' },
    { pid: 11, name: 'node.exe', commandLine: 'electron\\main.cjs' },
    { pid: 12, name: 'node.exe', commandLine: 'node app.js' },
    { pid: 13, name: 'OpenConsole.exe', commandLine: 'OpenConsole.exe --headless --server 0x123' },
    { pid: 14, name: 'Code.exe', commandLine: 'node\\jsonServerMain --node-ipc --clientProcessId=100' },
    { pid: 15, name: 'node_repl.exe', commandLine: 'node_repl codex helper' },
    { pid: 16, name: 'powershell.exe', commandLine: 'node -e "const {readWindowsProcesses}=require(\'./electron/platform/windowsProcesses.cjs\')"' },
  ], { ownPid: 12 });

  assert.deepEqual(markers, []);
});

test('normalizes common Windows coding commands', () => {
  assert.equal(normalizeWindowsCommand({ name: 'pnpm.exe', commandLine: 'pnpm dev' }), 'pnpm dev');
  assert.equal(normalizeWindowsCommand({ name: 'cargo.exe', commandLine: 'cargo test --all' }), 'cargo test --all');
  assert.equal(normalizeWindowsCommand({ name: 'claude.exe', commandLine: 'claude implement feature' }), 'claude implement feature');
});

test('readWindowsProcesses invokes PowerShell without profiles and returns rows', async () => {
  const calls = [];
  const result = await readWindowsProcesses({
    execFileFn: (command, args, options, callback) => {
      calls.push({ command, args, options });
      callback(null, JSON.stringify({ ProcessId: 42, Name: 'pwsh.exe', CommandLine: 'pwsh' }), '');
    },
  });

  assert.equal(calls[0].command, 'powershell.exe');
  assert.deepEqual(calls[0].args.slice(0, 3), ['-NoProfile', '-ExecutionPolicy', 'Bypass']);
  assert.equal(calls[0].options.timeout, 2500);
  assert.deepEqual(result, [{ pid: 42, name: 'pwsh', commandLine: 'pwsh' }]);
});

test('readWindowsProcesses logs errors and returns an empty list on failure', async () => {
  const logs = [];
  const result = await readWindowsProcesses({
    log: (payload) => logs.push(payload),
    execFileFn: (_command, _args, _options, callback) => {
      callback(new Error('blocked'), '', 'policy blocked');
    },
  });

  assert.deepEqual(result, []);
  assert.equal(logs[0].stage, 'windows-processes:error');
  assert.equal(logs[0].error, 'policy blocked');
});
