import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const voiceDir = join(root, 'public/audio/deskcat-tts-vo');

const sampleRate = 44100;
const channels = 2;
const seconds = 64;
const output = Buffer.alloc(sampleRate * seconds * channels * 2);
const tracks = [
  { from: 18, file: '01-intro.wav' },
  { from: 228, file: '03-appearance.wav' },
  { from: 334, file: '04-resize.wav' },
  { from: 474, file: '05-chat.wav' },
  { from: 674, file: '06-models.wav' },
  { from: 858, file: '07-states.wav' },
  { from: 1038, file: '08-modes.wav' },
  { from: 1278, file: '09-timeline.wav' },
  { from: 1728, file: '10-finale.wav' },
];

function readWav(path) {
  const bytes = readFileSync(path);
  const fmtIndex = bytes.indexOf('fmt ');
  const dataIndex = bytes.indexOf('data');
  if (fmtIndex < 0) throw new Error(`No fmt chunk in ${path}`);
  if (dataIndex < 0) throw new Error(`No data chunk in ${path}`);
  const audioFormat = bytes.readUInt16LE(fmtIndex + 8);
  const sourceChannels = bytes.readUInt16LE(fmtIndex + 10);
  const sourceSampleRate = bytes.readUInt32LE(fmtIndex + 12);
  const bitsPerSample = bytes.readUInt16LE(fmtIndex + 22);
  if (audioFormat !== 1 || bitsPerSample !== 16) {
    throw new Error(`Unsupported WAV format in ${path}`);
  }
  const dataSize = bytes.readUInt32LE(dataIndex + 4);
  const pcm = bytes.subarray(dataIndex + 8, dataIndex + 8 + dataSize);
  const frameCount = Math.floor(pcm.length / (sourceChannels * 2));
  const mono = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame++) {
    let sum = 0;
    for (let channel = 0; channel < sourceChannels; channel++) {
      sum += pcm.readInt16LE((frame * sourceChannels + channel) * 2) / 32768;
    }
    mono[frame] = sum / sourceChannels;
  }
  return { sampleRate: sourceSampleRate, mono };
}

for (const track of tracks) {
  const source = readWav(join(voiceDir, track.file));
  const offsetFrames = Math.round((track.from / 30) * sampleRate);
  const outFrames = Math.ceil((source.mono.length / source.sampleRate) * sampleRate);
  for (let frame = 0; frame < outFrames && offsetFrames + frame < output.length / (channels * 2); frame++) {
    const sourcePosition = (frame / sampleRate) * source.sampleRate;
    const leftIndex = Math.floor(sourcePosition);
    const rightIndex = Math.min(source.mono.length - 1, leftIndex + 1);
    const frac = sourcePosition - leftIndex;
    const sample = (source.mono[leftIndex] * (1 - frac) + source.mono[rightIndex] * frac) * 0.96;
    const intSample = Math.round(Math.max(-1, Math.min(1, sample)) * 32767);
    for (let channel = 0; channel < channels; channel++) {
      const byteOffset = ((offsetFrames + frame) * channels + channel) * 2;
      const mixed = output.readInt16LE(byteOffset) + intSample;
      output.writeInt16LE(Math.max(-32768, Math.min(32767, mixed)), byteOffset);
    }
  }
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + output.length, 4);
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
header.writeUInt32LE(output.length, 40);
const previewPath = join(root, 'public/audio/deskcat-tts-voice-preview.wav');
writeFileSync(previewPath, Buffer.concat([header, output]));
console.log(previewPath);
