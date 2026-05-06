import { create } from 'zustand';
import { setSetting, getAllSettings } from '@/lib/db';
import { emit } from '@tauri-apps/api/event';

export type Theme = 'light' | 'dark' | 'system';

export interface AppSettings {
  theme: Theme;
  petOpacity: number;
  petScale: number;
  dialogWidth: number;
  petName: string;
  smartAttach: boolean;
  attachActivity: 'low' | 'medium' | 'high';
  alwaysOnTop: boolean;
  temperature: number;
  maxTokens: number;
  streamOutput: boolean;
  voiceInputLang: string;
  voiceOutput: boolean;
  globalShortcut: string;
  screenshotShortcut: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  petOpacity: 1.0,
  petScale: 1.0,
  dialogWidth: 360,
  petName: '猫十五',
  smartAttach: true,
  attachActivity: 'medium',
  alwaysOnTop: true,
  temperature: 0.7,
  maxTokens: 2048,
  streamOutput: true,
  voiceInputLang: 'system',
  voiceOutput: true,
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
            (loaded as Record<string, unknown>)[key] = parsed;
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
