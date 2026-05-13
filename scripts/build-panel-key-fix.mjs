import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = path.join(root, 'electron', 'panel-key-fix.mm');
const outputDir = path.join(root, 'electron', 'native');
const output = path.join(outputDir, 'panel_key_fix.node');

if (process.platform !== 'darwin') {
  process.exit(0);
}

const nodeIncludeCandidates = [
  path.join(process.config.variables.node_prefix || '', 'include', 'node'),
  '/usr/local/include/node',
  '/opt/homebrew/include/node',
];

const nodeInclude = nodeIncludeCandidates.find(asyncPathExists);
if (!nodeInclude) {
  console.error('[native:build] Could not find Node headers');
  process.exit(1);
}

const [sourceStat, outputStat] = await Promise.all([
  fs.stat(source),
  fs.stat(output).catch(() => null),
]);

if (outputStat && outputStat.mtimeMs >= sourceStat.mtimeMs) {
  console.log('[native:build] panel_key_fix.node is up to date');
  process.exit(0);
}

await fs.mkdir(outputDir, { recursive: true });

const args = [
  '-std=c++17',
  '-fobjc-arc',
  '-I', nodeInclude,
  '-framework', 'Cocoa',
  '-bundle',
  '-undefined', 'dynamic_lookup',
  source,
  '-o', output,
];

const result = spawnSync('/usr/bin/clang++', args, {
  cwd: root,
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log('[native:build] Built electron/native/panel_key_fix.node');

function asyncPathExists(target) {
  if (!target) return false;
  return existsSync(target);
}
