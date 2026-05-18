import fs from 'node:fs/promises';
import path from 'node:path';

const publicDir = path.resolve('public');
const distDir = path.resolve('dist');
const runtimeAssetRoots = [
  path.join('assets', 'idle'),
  path.join('assets', 'rest'),
  path.join('assets', 'work'),
];

const missing = [];
let checkedCount = 0;
let checkedBytes = 0;

for (const root of runtimeAssetRoots) {
  const sourceRoot = path.join(publicDir, root);
  const sourceFiles = await walk(sourceRoot);
  for (const sourcePath of sourceFiles) {
    const publicRelative = path.relative(publicDir, sourcePath);
    const distRelative = publicRelative.replace(/\.gif$/i, '.webp');
    if (!/\.(gif|png|webp)$/i.test(publicRelative)) continue;
    const distPath = path.join(distDir, distRelative);
    const stat = await fs.stat(distPath).catch(() => null);
    checkedCount += 1;
    if (!stat || stat.size === 0) {
      missing.push(distRelative);
    } else {
      checkedBytes += stat.size;
    }
  }
}

const remainingGifFiles = (await walk(distDir))
  .filter((filePath) => /[/\\]assets[/\\](?:idle|rest|work)[/\\].+\.gif$/i.test(filePath));

if (remainingGifFiles.length > 0) {
  missing.push(...remainingGifFiles.map((filePath) => `${path.relative(distDir, filePath)} should have been converted to WebP`));
}

if (missing.length > 0) {
  console.error('[verify-pet-assets] runtime pet asset check failed:');
  for (const item of missing) console.error(`  - ${item}`);
  process.exit(1);
}

console.log(`[verify-pet-assets] verified ${checkedCount} runtime pet assets (${formatBytes(checkedBytes)})`);

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

function formatBytes(bytes) {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}
