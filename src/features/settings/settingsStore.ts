import { create } from 'zustand';
import { setSetting, getAllSettings } from '@/lib/db';
import { emit } from '@tauri-apps/api/event';

export type Theme = 'light' | 'dark' | 'system';
export type PetMotionName = 'petJump' | 'petWobble' | 'petBreathe';

export interface PetMotionSetting {
  enabled: boolean;
  amplitude: number;
  speed: number;
}

export type PetMotionSettings = Record<PetMotionName, PetMotionSetting>;

export interface AppSettings {
  theme: Theme;
  petOpacity: number;
  petScale: number;
  dialogWidth: number;
  compactChatFontSize: number;
  petMotions: PetMotionSettings;
  petName: string;
  smartAttach: boolean;
  attachActivity: 'low' | 'medium' | 'high';
  alwaysOnTop: boolean;
  temperature: number;
  maxTokens: number;
  streamOutput: boolean;
  voiceInputLang: string;
  voiceOutput: boolean;
  wakeWord: string;
  wakeWordEnabled: boolean;
  autoSpeak: boolean;
  speakRate: number;
  globalShortcut: string;
  screenshotShortcut: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  petOpacity: 1.0,
  petScale: 1.0,
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
  temperature: 0.7,
  maxTokens: 2048,
  streamOutput: true,
  voiceInputLang: 'system',
  voiceOutput: true,
  wakeWord: '你好灵宠',
  wakeWordEnabled: false,
  autoSpeak: false,
  speakRate: 1.0,
  globalShortcut: 'CommandOrControl+Shift+P',
  screenshotShortcut: 'CommandOrControl+Shift+S',
};

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
                : key === 'dialogWidth' && typeof parsed === 'number'
                  ? Math.min(600, Math.max(200, parsed))
                : key === 'compactChatFontSize' && typeof parsed === 'number'
                  ? Math.min(15, Math.max(11, parsed))
                : key === 'petMotions'
                  ? normalizePetMotions(parsed)
                : parsed;
          }
        }
      }
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
