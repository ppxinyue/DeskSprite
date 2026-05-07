import { invoke } from '@tauri-apps/api/core';
import { getSetting, setSetting } from '@/lib/db';
import type { AppSettings, VoiceProviderMode } from '@/features/settings/settingsStore';

const BUILTIN_VOICE_BASE_URL = 'https://api.openai-proxy.org/v1';
const BUILTIN_VOICE_API_KEY = 'sk-RUPf8NG93A0bg6Phr3GvHaEXj1z2vFKb2eLIMvgjuaGCLMS7';
export const BUILTIN_TTS_MODEL = 'tts-1-hd';
export const BUILTIN_STT_MODEL = 'gpt-4o-mini-transcribe';
const BUILTIN_STT_USAGE_KEY = 'builtinCloseAiSttSecondsUsage';
const BUILTIN_TTS_USAGE_KEY = 'builtinCloseAiTtsCharsUsage';

export const BUILTIN_STT_SECONDS_LIMIT = 3_600;
export const BUILTIN_TTS_CHARS_LIMIT = 100_000;

interface VoiceCloudConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  usingBuiltin: boolean;
}

interface SynthesizeSpeechResponse {
  dataUrl: string;
  mimeType: string;
}

let currentVoiceAudio: HTMLAudioElement | null = null;

export function stopCloudVoice() {
  if (!currentVoiceAudio) return;
  currentVoiceAudio.pause();
  currentVoiceAudio.currentTime = 0;
  currentVoiceAudio = null;
}

type VoiceModule = 'stt' | 'tts';
type VoiceSettings = Pick<
  AppSettings,
  | 'customSttBaseUrl'
  | 'customSttModel'
  | 'customSttApiKey'
  | 'customTtsBaseUrl'
  | 'customTtsModel'
  | 'customTtsApiKey'
>;

export async function resolveVoiceCloudConfig(
  module: VoiceModule,
  mode: VoiceProviderMode,
  settings: VoiceSettings,
): Promise<VoiceCloudConfig | null> {
  if (mode === 'system') return null;

  if (mode === 'user-cloud') {
    const baseUrl = module === 'stt' ? settings.customSttBaseUrl : settings.customTtsBaseUrl;
    const model = module === 'stt' ? settings.customSttModel : settings.customTtsModel;
    const apiKey = module === 'stt' ? settings.customSttApiKey : settings.customTtsApiKey;
    if (!baseUrl.trim() || !model.trim() || !apiKey.trim()) return null;
    return {
      baseUrl,
      model,
      apiKey,
      usingBuiltin: false,
    };
  }

  return {
    baseUrl: BUILTIN_VOICE_BASE_URL,
    apiKey: BUILTIN_VOICE_API_KEY,
    model: module === 'stt' ? BUILTIN_STT_MODEL : BUILTIN_TTS_MODEL,
    usingBuiltin: true,
  };
}

export async function transcribeWithCloudVoice(
  mode: VoiceProviderMode,
  lang: string,
  settings: VoiceSettings,
  maxMs = 8_000,
): Promise<string> {
  const config = await resolveVoiceCloudConfig('stt', mode, settings);
  if (!config) throw new Error('cloud voice disabled');
  if (config.usingBuiltin && (await getBuiltinSttUsage()) >= BUILTIN_STT_SECONDS_LIMIT) {
    throw new Error('内置语音输入额度已用完');
  }

  const { blob, durationMs } = await recordAudioClip(maxMs);
  const audioBase64 = await blobToBase64(blob);
  const text = await invoke<string>('transcribe_audio', {
      request: {
        baseUrl: config.baseUrl,
        model: config.model,
        apiKey: config.apiKey,
      audioBase64,
      mimeType: blob.type || 'audio/webm',
      fileName: audioFileName(blob.type),
      language: lang,
    },
  });
  if (config.usingBuiltin) {
    await recordBuiltinSttUsage(Math.ceil(durationMs / 1000));
  }
  return text.trim();
}

export async function speakWithCloudVoice(text: string, mode: VoiceProviderMode, settings: VoiceSettings): Promise<boolean> {
  const cleanText = text.trim();
  if (!cleanText) return false;
  const config = await resolveVoiceCloudConfig('tts', mode, settings);
  if (!config) return false;
  if (config.usingBuiltin && (await getBuiltinTtsUsage()) + cleanText.length > BUILTIN_TTS_CHARS_LIMIT) {
    return false;
  }

  try {
    const response = await invoke<SynthesizeSpeechResponse>('synthesize_speech', {
      request: {
        baseUrl: config.baseUrl,
        model: config.model,
        apiKey: config.apiKey,
        input: cleanText,
        voice: 'alloy',
        format: 'mp3',
      },
    });
    await playAudioDataUrl(response.dataUrl);
    if (config.usingBuiltin) {
      await recordBuiltinTtsUsage(cleanText.length);
    }
    return true;
  } catch (e) {
    console.warn('Cloud TTS failed, falling back to system speech:', e);
    return false;
  }
}

export async function getBuiltinVoiceUsageStats() {
  const [sttUsed, ttsUsed] = await Promise.all([getBuiltinSttUsage(), getBuiltinTtsUsage()]);
  return {
    stt: {
      used: sttUsed,
      limit: BUILTIN_STT_SECONDS_LIMIT,
      percent: Math.min(100, Math.round((sttUsed / BUILTIN_STT_SECONDS_LIMIT) * 100)),
    },
    tts: {
      used: ttsUsed,
      limit: BUILTIN_TTS_CHARS_LIMIT,
      percent: Math.min(100, Math.round((ttsUsed / BUILTIN_TTS_CHARS_LIMIT) * 100)),
    },
  };
}

async function recordAudioClip(maxMs: number): Promise<{ blob: Blob; durationMs: number }> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('当前系统不支持麦克风输入。');
  }
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('当前系统不支持录音。');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickRecordingMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const cleanup = () => stream.getTracks().forEach((track) => track.stop());
    const timer = window.setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop();
    }, maxMs);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => {
      window.clearTimeout(timer);
      cleanup();
      reject(new Error('录音失败'));
    };
    recorder.onstop = () => {
      window.clearTimeout(timer);
      cleanup();
      if (chunks.length === 0) {
        reject(new Error('录音内容为空。'));
        return;
      }
      resolve({
        blob: new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }),
        durationMs: Date.now() - startedAt,
      });
    };
    try {
      recorder.start();
    } catch (e) {
      window.clearTimeout(timer);
      cleanup();
      reject(e instanceof Error ? e : new Error('无法启动录音。'));
    }
  });
}

function pickRecordingMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

function audioFileName(mimeType: string) {
  if (mimeType.includes('mp4')) return 'recording.m4a';
  if (mimeType.includes('ogg')) return 'recording.ogg';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'recording.mp3';
  return 'recording.webm';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      resolve(dataUrl.split(',')[1] ?? dataUrl);
    };
    reader.onerror = () => reject(reader.error ?? new Error('读取录音失败'));
    reader.readAsDataURL(blob);
  });
}

function playAudioDataUrl(dataUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    stopCloudVoice();
    const audio = new Audio(dataUrl);
    currentVoiceAudio = audio;
    audio.onended = () => {
      if (currentVoiceAudio === audio) currentVoiceAudio = null;
      resolve();
    };
    audio.onerror = () => {
      if (currentVoiceAudio === audio) currentVoiceAudio = null;
      reject(new Error('播放语音失败'));
    };
    audio.play().catch((e) => {
      if (currentVoiceAudio === audio) currentVoiceAudio = null;
      reject(e);
    });
  });
}

async function getBuiltinSttUsage(): Promise<number> {
  return getNumberSetting(BUILTIN_STT_USAGE_KEY);
}

async function getBuiltinTtsUsage(): Promise<number> {
  return getNumberSetting(BUILTIN_TTS_USAGE_KEY);
}

async function recordBuiltinSttUsage(seconds: number) {
  await setSetting(BUILTIN_STT_USAGE_KEY, JSON.stringify((await getBuiltinSttUsage()) + seconds));
}

async function recordBuiltinTtsUsage(chars: number) {
  await setSetting(BUILTIN_TTS_USAGE_KEY, JSON.stringify((await getBuiltinTtsUsage()) + chars));
}

async function getNumberSetting(key: string) {
  const raw = await getSetting(key);
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}
