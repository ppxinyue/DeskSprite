import { create } from 'zustand';
import {
  getApiConfigs,
  insertApiConfig,
  deleteApiConfig,
  setDefaultApiConfig,
  updateApiConfig,
} from '@/lib/db';
import {
  saveApiKey,
  deleteApiKey,
} from '@/lib/keychain';
import { decodeLocalApiKey, encodeLocalApiKey } from '@/lib/apiKeyStorage';
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
    const keyringRef = createKeyringRef();
    const normalizedKey = normalizeApiKey(apiKey);
    await persistApiKey(keyringRef, normalizedKey);
    await insertApiConfig(provider, baseUrl, model, keyringRef, 0, name, providerId, encodeLocalApiKey(normalizedKey));
    await get().loadConfigs();
    await emit('api-config:changed', {});
  },

  updateConfig: async (id, provider, baseUrl, model, name, providerId, apiKey) => {
    const config = get().configs.find((c) => c.id === id);
    let keyringRef = config?.keyringRef ?? null;
    let encodedApiKey: string | undefined;

    if (apiKey && apiKey.length > 0) {
      const normalizedKey = normalizeApiKey(apiKey);
      keyringRef = createKeyringRef(id);
      encodedApiKey = encodeLocalApiKey(normalizedKey);
      await persistApiKey(keyringRef, normalizedKey);
      if (config?.keyringRef && config.keyringRef !== keyringRef) {
        deleteApiKey(config.keyringRef).catch(() => undefined);
      }
    } else if (!keyringRef && !config?.apiKey) {
      throw new Error('缺少 API Key，请重新填写并保存。');
    }

    await updateApiConfig(id, provider, baseUrl, model, name, providerId, keyringRef, encodedApiKey);
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

function createKeyringRef(id?: number) {
  const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return id ? `desksprite_api_key_${id}_${randomPart}` : `desksprite_api_key_${randomPart}`;
}

async function persistApiKey(keyringRef: string, apiKey: string) {
  saveApiKey(keyringRef, apiKey).catch((e) => {
    console.warn('Failed to save API key to system keychain; local storage fallback is active:', e);
  });
}

function normalizeApiKey(apiKey: string) {
  const normalizedKey = apiKey.trim();
  if (!normalizedKey) {
    throw new Error('API Key 不能为空。');
  }
  return normalizedKey;
}
