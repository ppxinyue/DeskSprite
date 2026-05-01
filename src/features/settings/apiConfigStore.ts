import { create } from 'zustand';
import {
  getApiConfigs,
  insertApiConfig,
  deleteApiConfig,
  setDefaultApiConfig,
} from '@/lib/db';
import {
  saveApiKey,
  deleteApiKey,
} from '@/lib/keychain';
import { emit } from '@tauri-apps/api/event';

export interface ApiConfig {
  id: number;
  provider: string;
  baseUrl: string;
  model: string;
  keyringRef: string | null;
  isDefault: boolean;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
}

interface ApiConfigState {
  configs: ApiConfig[];
  loaded: boolean;
  loadConfigs: () => Promise<void>;
  addConfig: (
    provider: string,
    baseUrl: string,
    model: string,
    apiKey: string
  ) => Promise<void>;
  removeConfig: (id: number, keyringRef: string | null) => Promise<void>;
  setDefault: (id: number) => Promise<void>;
  getDefaultConfig: () => ApiConfig | undefined;
}

export const useApiConfigStore = create<ApiConfigState>((set, get) => ({
  configs: [],
  loaded: false,

  loadConfigs: async () => {
    try {
      const rows = await getApiConfigs();
    set({
      configs: rows.map((r) => ({
        id: r.id,
        provider: r.provider,
        baseUrl: r.base_url,
        model: r.model,
        keyringRef: r.keyring_ref,
        isDefault: r.is_default === 1,
        lastUsedAt: r.last_used_at,
        usageCount: r.usage_count,
        createdAt: r.created_at,
      })),
      loaded: true,
    });
    } catch (e) {
      console.warn('Failed to load API configs:', e);
      set({ configs: [], loaded: true });
    }
  },

  addConfig: async (provider, baseUrl, model, apiKey) => {
    const keyringRef = `api_key/${Date.now()}`;
    await saveApiKey(keyringRef, apiKey);
    await insertApiConfig(provider, baseUrl, model, keyringRef, 0);
    await get().loadConfigs();
    await emit('api-config:changed', {});
  },

  removeConfig: async (id, keyringRef) => {
    if (keyringRef) {
      try {
        await deleteApiKey(keyringRef);
      } catch {
        // Key may already be deleted
      }
    }
    await deleteApiConfig(id);
    await get().loadConfigs();
    await emit('api-config:changed', {});
  },

  setDefault: async (id) => {
    await setDefaultApiConfig(id);
    await get().loadConfigs();
    await emit('api-config:changed', {});
  },

  getDefaultConfig: () => {
    return get().configs.find((c) => c.isDefault);
  },
}));
