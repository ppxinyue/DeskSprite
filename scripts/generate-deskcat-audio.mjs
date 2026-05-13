import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const voiceDir = join(root, 'public/audio/deskcat-vo');
mkdirSync(voiceDir, { recursive: true });
mkdirSync(join(root, 'public/audio'), { recursive: true });

const tracks = [
  ['01-intro', 'Introducing DeskCat. Your floating desktop companion.'],
  ['02-custom', ''],
  ['03-appearance', 'Switch instantly between light and dark themes.'],
  ['04-resize', 'Then resize your companion until it feels right on your desktop.'],
  ['05-chat', 'Hover to open chat. Type, speak, or send an image.'],
  ['06-models', 'And connect DeskCat to your own model provider.'],
  ['07-states', 'Choose between a pet sprite and a live Orb. Both respond to idle, work, and rest.'],
  ['08-modes', 'Focus mode keeps DeskCat quiet when you need space. Coding mode mirrors Claude Code and Codex status.'],
  ['09-timeline', 'Timeline remembers the shape of your day. Including foreground windows, background activity, and terminal sessions, all in one calm view.'],
  ['10-finale', 'DeskCat. The tiny desktop companion that keeps up with your day. Open source on GitHub.'],
];

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${command} failed with status ${result.status}`);
  }
}

for (const [name, text] of tracks) {
  if (!text) {
    continue;
  }
  const aiff = join(voiceDir, `${name}.aiff`);
  const wav = join(voiceDir, `${name}.wav`);
  mkdirSync(dirname(wav), { recursive: true });
  run('say', ['-v', 'Samantha', '-r', '156', '-o', aiff, text]);
  run('afconvert', ['-f', 'WAVE', '-d', 'LEI16@44100', aiff, wav]);
  if (existsSync(aiff)) {
    unlinkSync(aiff);
  }
}

const sampleRate = 44100;
const seconds = 64;
const channels = 2;
const frames = sampleRate * seconds;
const data = Buffer.alloc(frames * channels * 2);
const bpm = 124;
const beat = 60 / bpm;
const chords = [
  [146.83, 220.0, 293.66, 369.99],
  [174.61, 261.63, 329.63, 440.0],
  [130.81, 196.0, 261.63, 329.63],
  [164.81, 246.94, 311.13, 392.0],
];

function envelope(t, period, attack, decay) {
  const x = t % period;
  if (x < attack) return x / attack;
  return Math.max(0, 1 - (x - attack) / decay);
}

function saw(phase) {
  return 2 * (phase - Math.floor(phase + 0.5));
}

function tri(phase) {
  return 1 - 4 * Math.abs(Math.round(phase - 0.25) - (phase - 0.25));
}

function hashNoise(i) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

for (let i = 0; i < frames; i++) {
  const t = i / sampleRate;
  const section = t < 7 ? 0 : t < 17 ? 1 : t < 28 ? 2 : t < 40 ? 3 : t < 53 ? 4 : 5;
  const sectionEnergy = [0.55, 0.72, 0.82, 0.92, 1.0, 0.78][section];
  const chord = chords[Math.floor(t / (beat * 8)) % chords.length];
  const barT = t % (beat * 4);
  const kickEnv = envelope(t, beat, 0.006, 0.19);
  const pulseEnv = envelope(t + beat * 0.25, beat / 2, 0.01, 0.20);
  const hatEnv = envelope(t + beat * 0.125, beat / 2, 0.004, 0.07);
  const arpIndex = Math.floor(t / (beat / 4)) % 16;
  const arpFreq = chord[[0, 2, 1, 3, 2, 1, 3, 2, 0, 2, 3, 1, 2, 3, 1, 0][arpIndex]] * 2;
  const sidechain = 0.58 + 0.42 * Math.min(1, barT / (beat * 0.72));
  let value = 0;

  for (const freq of chord) {
    value += Math.sin(Math.PI * 2 * freq * t) * 0.032 * sidechain;
    value += tri(freq * 0.5 * t) * 0.014 * sidechain;
  }

  value += Math.sin(Math.PI * 2 * chord[0] * 0.5 * t) * 0.09 * kickEnv;
  value += saw(arpFreq * t) * 0.035 * pulseEnv * sectionEnergy;
  value += Math.sin(Math.PI * 2 * arpFreq * 2 * t) * 0.018 * pulseEnv * sectionEnergy;
  value += hashNoise(i) * 0.025 * hatEnv * sectionEnergy;
  value += Math.sin(Math.PI * 2 * 55 * t) * 0.035 * sectionEnergy;

  for (const hit of [7, 17, 28, 40, 53]) {
    const d = t - hit;
    if (d >= 0 && d < 0.95) {
      const impact = Math.exp(-d * 5.2);
      value += Math.sin(Math.PI * 2 * (92 - d * 36) * t) * 0.10 * impact;
      value += hashNoise(i + hit * 1000) * 0.035 * impact;
    }
    const r = hit - t;
    if (r >= 0 && r < 2.1) {
      const rise = 1 - r / 2.1;
      value += Math.sin(Math.PI * 2 * (860 + rise * 1180) * t) * 0.018 * rise;
      value += hashNoise(i + hit * 2000) * 0.014 * rise;
    }
  }

  const fadeIn = Math.min(1, t / 3);
  const fadeOut = Math.min(1, (seconds - t) / 4);
  const gain = Math.min(fadeIn, fadeOut) * 0.86;
  const left = Math.max(-1, Math.min(1, value * gain));
  const right = Math.max(-1, Math.min(1, (value * 0.86 + Math.sin(Math.PI * 2 * arpFreq * 1.003 * t) * 0.014 * pulseEnv) * gain));
  data.writeInt16LE(Math.round(left * 32767), i * 4);
  data.writeInt16LE(Math.round(right * 32767), i * 4 + 2);
}

const wavPath = join(root, 'public/audio/deskcat-bgm.wav');
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(channels, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * channels * 2, 28);
header.writeUInt16LE(channels * 2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);
writeFileSync(wavPath, Buffer.concat([header, data]));

console.log(`Generated ${tracks.length} voice clips and ${wavPath}`);
