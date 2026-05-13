import { accessSync, constants, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpegStaticPath from 'ffmpeg-static';

const root = new URL('..', import.meta.url).pathname;
const publicDir = join(root, 'public');
const outRoot = join(publicDir, 'assets/gif-videos');
function canExecute(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

const ffmpegPath = [
  ffmpegStaticPath,
  '/opt/homebrew/bin/ffmpeg',
  '/usr/local/bin/ffmpeg',
  'ffmpeg',
].find((candidate) => candidate && (candidate === 'ffmpeg' || (existsSync(candidate) && canExecute(candidate))));
const sourceRoots = [
  join(publicDir, 'assets/idle/gif'),
  join(publicDir, 'assets/rest/gif'),
  join(publicDir, 'assets/work/gif'),
  join(publicDir, 'assets/pet-images'),
];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.gif$/i.test(path) ? [path] : [];
  });
}

function videoPathFor(gifPath) {
  const publicRelative = relative(publicDir, gifPath);
  return join(outRoot, publicRelative.replace(/\.gif$/i, '.webm'));
}

for (const gifPath of sourceRoots.flatMap(walk)) {
  const outPath = videoPathFor(gifPath);
  mkdirSync(dirname(outPath), { recursive: true });
  const result = spawnSync(ffmpegPath, [
    '-y',
    '-i',
    gifPath,
    '-vf',
    'fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos',
    '-c:v',
    'libvpx-vp9',
    '-pix_fmt',
    'yuva420p',
    '-auto-alt-ref',
    '0',
    '-b:v',
    '0',
    '-crf',
    '28',
    outPath,
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(`Failed to convert ${gifPath}\n${result.stderr || result.stdout}`);
  }
  console.log(relative(root, outPath));
}
