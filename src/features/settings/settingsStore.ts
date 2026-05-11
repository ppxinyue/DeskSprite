import { create } from 'zustand';
import { setSetting, getAllSettings } from '@/lib/db';
import { emit } from '@tauri-apps/api/event';

export type Theme = 'light' | 'dark' | 'system';
export type PetMotionName = 'petJump' | 'petWobble' | 'petBreathe';
export type VoiceProviderMode = 'system' | 'cloud-auto' | 'user-cloud';
export type ModelMode = 'default' | 'custom';
export type AvatarRenderMode = 'pet' | 'orb';
export type CodingProvider = 'codex' | 'claude';
export type CodingSessionMode = 'new' | 'inherit';
export type AppLanguage = 'zh' | 'en';
export type MessageSendShortcut = 'enter' | 'mod-enter';

export interface PetMotionSetting {
  enabled: boolean;
  amplitude: number;
  speed: number;
}

export type PetMotionSettings = Record<PetMotionName, PetMotionSetting>;

export interface AppSettings {
  appLanguage: AppLanguage;
  theme: Theme;
  petOpacity: number;
  petScale: number;
  avatarRenderMode: AvatarRenderMode;
  dialogWidth: number;
  compactChatFontSize: number;
  petMotions: PetMotionSettings;
  petName: string;
  smartAttach: boolean;
  attachActivity: 'low' | 'medium' | 'high';
  alwaysOnTop: boolean;
  chatModelMode: ModelMode;
  codingModeEnabled: boolean;
  codingCodexEnabled: boolean;
  codingClaudeEnabled: boolean;
  codingProvider: CodingProvider;
  codingSessionMode: CodingSessionMode;
  temperature: number;
  maxTokens: number;
  streamOutput: boolean;
  voiceInputLang: string;
  voiceOutput: boolean;
  voiceInputProvider: VoiceProviderMode;
  voiceOutputProvider: VoiceProviderMode;
  customSttBaseUrl: string;
  customSttModel: string;
  customSttApiKey: string;
  customTtsBaseUrl: string;
  customTtsModel: string;
  customTtsApiKey: string;
  autoSpeak: boolean;
  speakRate: number;
  launchAtLogin: boolean;
  timelineRecordingEnabled: boolean;
  timelineMinSegmentMinutes: number;
  gameAppKeywords: string[];
  musicAppKeywords: string[];
  hidePetDuringScreenShare: boolean;
  globalShortcut: string;
  screenshotShortcut: string;
  messageSendShortcut: MessageSendShortcut;
  restReminderEnabled: boolean;
  restReminderIntervalMinutes: number;
  restDurationSeconds: number;
  focusDurationMinutes: number;
  distractionDetectionEnabled: boolean;
  distractionGraceSeconds: number;
  distractionBlockedApps: string[];
  distractionBlockedKeywords: string[];
}

const DEFAULT_SETTINGS: AppSettings = {
  appLanguage: 'zh',
  theme: 'system',
  petOpacity: 1.0,
  petScale: 1.0,
  avatarRenderMode: 'pet',
  dialogWidth: 300,
  compactChatFontSize: 13,
  petMotions: {
    petJump: { enabled: true, amplitude: 4, speed: 1 },
    petWobble: { enabled: false, amplitude: 3, speed: 1 },
    petBreathe: { enabled: false, amplitude: 2, speed: 1 },
  },
  petName: '猫十五',
  smartAttach: true,
  attachActivity: 'medium',
  alwaysOnTop: true,
  chatModelMode: 'default',
  codingModeEnabled: false,
  codingCodexEnabled: true,
  codingClaudeEnabled: true,
  codingProvider: 'codex',
  codingSessionMode: 'new',
  temperature: 0.7,
  maxTokens: 2048,
  streamOutput: true,
  voiceInputLang: 'system',
  voiceOutput: true,
  voiceInputProvider: 'cloud-auto',
  voiceOutputProvider: 'cloud-auto',
  customSttBaseUrl: 'https://api.openai-proxy.org/v1',
  customSttModel: 'gpt-4o-mini-transcribe',
  customSttApiKey: '',
  customTtsBaseUrl: 'https://api.openai-proxy.org/v1',
  customTtsModel: 'tts-1',
  customTtsApiKey: '',
  autoSpeak: false,
  speakRate: 1.0,
  launchAtLogin: true,
  timelineRecordingEnabled: true,
  timelineMinSegmentMinutes: 1,
  gameAppKeywords: [
    'Steam',
    'Epic Games',
    'Battle.net',
    'Riot Client',
    'League of Legends',
    'Dota',
    'Minecraft',
    'Roblox',
    'Valorant',
    'Counter-Strike',
    'Genshin',
    'Honkai',
    'World of Warcraft',
    'Final Fantasy',
    'Baldur',
    'Civilization',
    'Factorio',
  ],
  musicAppKeywords: ['Music', 'Spotify', 'NeteaseMusic', '网易云音乐'],
  hidePetDuringScreenShare: true,
  globalShortcut: 'CommandOrControl+Shift+P',
  screenshotShortcut: 'CommandOrControl+Shift+S',
  messageSendShortcut: 'enter',
  restReminderEnabled: true,
  restReminderIntervalMinutes: 60,
  restDurationSeconds: 60,
  focusDurationMinutes: 25,
  distractionDetectionEnabled: true,
  distractionGraceSeconds: 8,
  distractionBlockedApps: ['Steam', 'Discord', 'Telegram', 'WeChat', 'QQ'],
  distractionBlockedKeywords: [
    'youtube',
    'youtu.be',
    'twitter',
    'x.com',
    'instagram',
    'reddit',
    'tiktok',
    'netflix',
    'twitch',
    'facebook',
    'bilibili',
    'weibo',
    'douyin',
    'xiaohongshu',
    'zhihu',
    'douban',
    'taobao',
    'jd.com',
    '小红书',
    '微博',
    '抖音',
    '知乎',
    '豆瓣',
    '淘宝',
    '京东',
    '哔哩哔哩',
    '虎扑',
    '贴吧',
  ],
};

function getPreviewLanguageOverride(): AppLanguage | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = new URLSearchParams(window.location.search).get('previewLanguage');
    return isAppLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

export interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  loadSettings: async () => {
    try {
      const rows = await getAllSettings();
      const map = new Map(rows.map((r) => [r.key, r.value]));
      const loaded = { ...DEFAULT_SETTINGS };
      for (const [key, value] of map) {
        if (key in loaded) {
          const parsed = tryParse(value);
          if (parsed !== undefined) {
            (loaded as Record<string, unknown>)[key] =
              key === 'theme' && !['system', 'light', 'dark'].includes(String(parsed))
                ? 'system'
                : key === 'appLanguage' && !isAppLanguage(parsed)
                  ? 'zh'
                : key === 'chatModelMode' && !isModelMode(parsed)
                  ? 'default'
                : key === 'avatarRenderMode' && !isAvatarRenderMode(parsed)
                  ? 'pet'
                : key === 'codingProvider' && !isCodingProvider(parsed)
                  ? 'codex'
                : key === 'codingSessionMode' && !isCodingSessionMode(parsed)
                  ? 'new'
                : key === 'messageSendShortcut' && !isMessageSendShortcut(parsed)
                  ? 'enter'
                : (key === 'voiceInputProvider' || key === 'voiceOutputProvider') && !isVoiceProviderMode(parsed)
                  ? 'system'
                : key === 'dialogWidth' && typeof parsed === 'number'
                  ? Math.min(600, Math.max(200, parsed))
                : key === 'compactChatFontSize' && typeof parsed === 'number'
                  ? Math.min(15, Math.max(11, parsed))
                : key === 'restReminderIntervalMinutes' && typeof parsed === 'number'
                  ? Math.min(240, Math.max(1, parsed))
                : key === 'restDurationSeconds' && typeof parsed === 'number'
                  ? Math.min(7200, Math.max(60, parsed))
                : key === 'focusDurationMinutes' && typeof parsed === 'number'
                  ? Math.min(240, Math.max(1, parsed))
                : key === 'distractionGraceSeconds' && typeof parsed === 'number'
                  ? Math.min(120, Math.max(0, parsed))
                : key === 'timelineMinSegmentMinutes' && typeof parsed === 'number'
                  ? Math.min(20, Math.max(1, parsed))
                : (key === 'distractionBlockedApps' || key === 'distractionBlockedKeywords' || key === 'gameAppKeywords' || key === 'musicAppKeywords')
                  ? normalizeStringList(parsed, DEFAULT_SETTINGS[key])
                : key === 'petMotions'
                  ? normalizePetMotions(parsed)
                : parsed;
          }
        }
      }
      const previewLanguage = getPreviewLanguageOverride();
      if (previewLanguage) loaded.appLanguage = previewLanguage;
      set({ settings: loaded, loaded: true });
    } catch (e) {
      console.warn('Failed to load settings from DB, using defaults:', e);
      set({ settings: DEFAULT_SETTINGS, loaded: true });
    }
  },

  updateSetting: async (key, value) => {
    await setSetting(key, JSON.stringify(value));
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }));
    await emit('settings:updated', { key, value });
  },

  updateSettings: async (partial) => {
    const updates = Object.entries(partial);
    for (const [key, value] of updates) {
      await setSetting(key, JSON.stringify(value));
    }
    set((state) => ({
      settings: { ...state.settings, ...partial },
    }));
    await emit('settings:updated', partial);
  },
}));

function tryParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function isVoiceProviderMode(value: unknown): value is VoiceProviderMode {
  return value === 'system' || value === 'cloud-auto' || value === 'user-cloud';
}

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'zh' || value === 'en';
}

function isMessageSendShortcut(value: unknown): value is MessageSendShortcut {
  return value === 'enter' || value === 'mod-enter';
}

function isModelMode(value: unknown): value is ModelMode {
  return value === 'default' || value === 'custom';
}

function isAvatarRenderMode(value: unknown): value is AvatarRenderMode {
  return value === 'pet' || value === 'orb';
}

function isCodingSessionMode(value: unknown): value is CodingSessionMode {
  return value === 'new' || value === 'inherit';
}

function isCodingProvider(value: unknown): value is CodingProvider {
  return value === 'codex' || value === 'claude';
}

function normalizeStringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const normalized = value.map((item) => String(item).trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : fallback;
}

function normalizePetMotions(value: unknown): PetMotionSettings {
  const defaults = DEFAULT_SETTINGS.petMotions;
  if (!value || typeof value !== 'object') return defaults;
  const source = value as Partial<Record<PetMotionName, Partial<PetMotionSetting>>>;

  return {
    petJump: normalizePetMotion(source.petJump, defaults.petJump, 2, 24, 0.5, 3),
    petWobble: normalizePetMotion(source.petWobble, defaults.petWobble, 1, 12, 0.5, 3),
    petBreathe: normalizePetMotion(source.petBreathe, defaults.petBreathe, 1, 8, 0.5, 3),
  };
}

function normalizePetMotion(
  value: Partial<PetMotionSetting> | undefined,
  fallback: PetMotionSetting,
  minAmplitude: number,
  maxAmplitude: number,
  minSpeed: number,
  maxSpeed: number,
): PetMotionSetting {
  return {
    enabled: typeof value?.enabled === 'boolean' ? value.enabled : fallback.enabled,
    amplitude: clampNumber(value?.amplitude, fallback.amplitude, minAmplitude, maxAmplitude),
    speed: clampNumber(value?.speed, fallback.speed, minSpeed, maxSpeed),
  };
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}
