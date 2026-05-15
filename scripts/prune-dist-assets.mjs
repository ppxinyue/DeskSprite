import fs from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');
const removable = [
  'captures',
  'remotion-captures',
  path.join('assets', 'gif-videos'),
  path.join('assets', 'pet-images'),
  path.join('assets', 'remotion'),
];

let removedBytes = 0;

async function sizeOf(target) {
  const stat = await fs.stat(target).catch(() => null);
  if (!stat) return 0;
  if (stat.isFile()) return stat.size;
  if (!stat.isDirectory()) return 0;
  const entries = await fs.readdir(target, { withFileTypes: true });
  const sizes = await Promise.all(entries.map((entry) => sizeOf(path.join(target, entry.name))));
  return sizes.reduce((sum, value) => sum + value, 0);
}

for (const relativePath of removable) {
  const target = path.join(distDir, relativePath);
  const bytes = await sizeOf(target);
  if (bytes === 0) continue;
  await fs.rm(target, { recursive: true, force: true });
  removedBytes += bytes;
  console.log(`[prune-dist-assets] removed ${relativePath} (${formatBytes(bytes)})`);
}

if (removedBytes > 0) {
  console.log(`[prune-dist-assets] total removed ${formatBytes(removedBytes)}`);
}

function formatBytes(bytes) {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}
