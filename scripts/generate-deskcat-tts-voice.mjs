import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const voiceService = readFileSync(join(root, 'src/features/voice/voiceService.ts'), 'utf8');
const baseUrl = voiceService.match(/BUILTIN_VOICE_BASE_URL = '([^']+)'/)?.[1];
const apiKey = voiceService.match(/BUILTIN_VOICE_API_KEY = '([^']+)'/)?.[1];
const model = voiceService.match(/BUILTIN_TTS_MODEL = '([^']+)'/)?.[1] ?? 'tts-1';
if (!baseUrl || !apiKey) throw new Error('Missing built-in TTS config');

const outDir = join(root, 'public/audio/deskcat-tts-vo');
mkdirSync(outDir, { recursive: true });

const fps = 30;
const tracks = [
  { name: '01-intro', from: 18, until: 210, text: 'Introducing DeskCat. Your floating desktop companion.' },
  { name: '03-appearance', from: 228, until: 344, text: 'Upload any image to create a custom companion.' },
  { name: '04-resize', from: 334, until: 450, text: 'DeskCat renders the new pet instantly on your desktop.' },
  { name: '05-chat', from: 474, until: 674, text: 'Hover to open chat. Type, speak, or send an image.' },
  { name: '06-models', from: 674, until: 840, text: 'And connect DeskCat to your own model provider.' },
  { name: '07-states', from: 858, until: 1020, text: 'Choose between a pet sprite and a live Orb. Both respond to idle, work, and rest.' },
  { name: '08-modes', from: 1038, until: 1260, text: 'Focus mode keeps DeskCat quiet when you need space. Coding mode mirrors Claude Code and Codex status.' },
  { name: '09-timeline', from: 1278, until: 1560, text: 'Timeline remembers the shape of your day. Including foreground windows, background activity, and terminal sessions, all in one calm view.' },
  { name: '10-finale', from: 1728, until: 1920, text: 'DeskCat. The tiny desktop companion that keeps up with your day. Open source on GitHub.' },
];

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function durationSeconds(path) {
  const output = run('afinfo', [path]);
  const match = output.match(/estimated duration: ([0-9.]+)/);
  if (!match) throw new Error(`Could not read duration for ${path}`);
  return Number(match[1]);
}

async function synthesize(track, speed) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/audio/speech`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: track.text,
      voice: 'nova',
      response_format: 'wav',
      speed,
    }),
  });
  if (!response.ok) {
    throw new Error(`TTS failed for ${track.name}: HTTP ${response.status}: ${await response.text()}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const path = join(outDir, `${track.name}.wav`);
  writeFileSync(path, bytes);
  return path;
}

const manifest = [];
for (const track of tracks) {
  const targetSeconds = Math.max(0.8, (track.until - track.from - 8) / fps);
  let speed = 1;
  let path = await synthesize(track, speed);
  let duration = durationSeconds(path);
  if (duration > targetSeconds) {
    speed = Math.min(1.5, Math.max(1.02, (duration / targetSeconds) * 1.05));
    path = await synthesize(track, speed);
    duration = durationSeconds(path);
  }
  manifest.push({ ...track, speed: Number(speed.toFixed(2)), duration: Number(duration.toFixed(3)), targetSeconds: Number(targetSeconds.toFixed(3)), file: path.replace(root, '') });
}

writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.table(manifest.map(({ name, speed, duration, targetSeconds }) => ({ name, speed, duration, targetSeconds })));
