import fs from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const gif2webpPath = await resolveGif2WebpPath();
const distDir = path.resolve('dist');
const runtimeAssetRoots = [
  path.join(distDir, 'assets', 'idle'),
  path.join(distDir, 'assets', 'rest'),
  path.join(distDir, 'assets', 'work'),
];

let convertedCount = 0;
let originalBytes = 0;
let optimizedBytes = 0;

for (const sourceRoot of runtimeAssetRoots) {
  const gifPaths = (await walk(sourceRoot)).filter((filePath) => /\.gif$/i.test(filePath));
  for (const gifPath of gifPaths) {
    await convertGifToWebp(gifPath);
  }
}

if (convertedCount > 0) {
  console.log(
    `[optimize-pet-assets] converted ${convertedCount} GIFs to WebP ` +
    `(${formatBytes(originalBytes)} -> ${formatBytes(optimizedBytes)})`,
  );
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await walk(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

async function convertGifToWebp(gifPath) {
  const outPath = gifPath.replace(/\.gif$/i, '.webp');
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await execFile(gif2webpPath, [
    '-q',
    '80',
    '-m',
    '6',
    '-loop_compatibility',
    gifPath,
    '-o',
    outPath,
  ]);
  const [gifStat, webpStat] = await Promise.all([fs.stat(gifPath), fs.stat(outPath)]);
  if (!webpStat.size) throw new Error(`Converted WebP is empty: ${outPath}`);
  originalBytes += gifStat.size;
  optimizedBytes += webpStat.size;
  convertedCount += 1;
  await fs.rm(gifPath, { force: true });
}

function formatBytes(bytes) {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

async function resolveGif2WebpPath() {
  const pathEntries = (process.env.PATH || '')
    .split(path.delimiter)
    .filter(Boolean);
  const executableNames = process.platform === 'win32'
    ? ['gif2webp.exe', 'gif2webp.cmd', 'gif2webp']
    : ['gif2webp'];
  const pathCandidates = pathEntries.flatMap((entry) => (
    executableNames.map((name) => path.join(entry, name))
  ));
  const userProfile = process.env.USERPROFILE || process.env.HOME || '';
  const scoopCandidates = process.platform === 'win32' && userProfile
    ? executableNames.map((name) => path.join(userProfile, 'scoop', 'shims', name))
    : [];
  const candidates = [
    '/opt/homebrew/bin/gif2webp',
    '/usr/local/bin/gif2webp',
    ...scoopCandidates,
    ...pathCandidates,
  ];
  for (const candidate of candidates) {
    if (await isExecutable(candidate)) return candidate;
  }
  throw new Error('gif2webp is required to optimize pet GIF assets. Install it with `brew install webp` or `scoop install libwebp`.');
}

async function isExecutable(filePath) {
  try {
    await fs.access(filePath, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}
