import { create } from 'zustand';
import {
  getApiConfigs,
  insertApiConfig,
  deleteApiConfig,
  setDefaultApiConfig,
  updateApiConfig,
} from '@/lib/db';
import { decodeLocalApiKey } from '@/lib/apiKeyStorage';
import { emit } from '@tauri-apps/api/event';

export interface ApiConfig {
  id: number;
  provider: string;
  providerId: string | null;
  name: string | null;
  baseUrl: string;
  model: string;
  apiKey: string | null;
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
    apiKey: string,
    name?: string,
    providerId?: string
  ) => Promise<void>;
  updateConfig: (
    id: number,
    provider: string,
    baseUrl: string,
    model: string,
    name: string,
    providerId: string,
    apiKey?: string
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
        providerId: r.provider_id,
        name: r.name,
        baseUrl: r.base_url,
        model: r.model,
        apiKey: decodeLocalApiKey(r.api_key),
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

  addConfig: async (provider, baseUrl, model, apiKey, name, providerId) => {
    const normalizedKey = normalizeApiKey(apiKey);
    await insertApiConfig(provider, baseUrl, model, null, 0, name, providerId, normalizedKey);
    await get().loadConfigs();
    await emit('api-config:changed', {});
  },

  updateConfig: async (id, provider, baseUrl, model, name, providerId, apiKey) => {
    const config = get().configs.find((c) => c.id === id);
    const keyringRef = config?.keyringRef ?? null;
    let nextApiKey: string | undefined;

    if (apiKey && apiKey.length > 0) {
      nextApiKey = normalizeApiKey(apiKey);
    } else if (!config?.apiKey) {
      throw new Error('缺少 API Key，请重新填写并保存。');
    }

    await updateApiConfig(id, provider, baseUrl, model, name, providerId, keyringRef, nextApiKey);
    await get().loadConfigs();
    await emit('api-config:changed', {});
  },

  removeConfig: async (id, keyringRef) => {
    void keyringRef;
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

function normalizeApiKey(apiKey: string) {
  const normalizedKey = apiKey.trim();
  if (!normalizedKey) {
    throw new Error('API Key 不能为空。');
  }
  return normalizedKey;
}
