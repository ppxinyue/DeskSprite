import type { ApiConfig, Message } from './types';
import type { ApiConfig as StoredApiConfig } from '@/features/settings/apiConfigStore';
import { getSetting, setSetting } from '@/lib/db';
import { getApiKey } from '@/lib/keychain';

const BUILTIN_USAGE_KEY = 'builtinCloseAiTokenUsage';
const BUILTIN_TOKEN_LIMIT = 100_000;

export const BUILTIN_CLOSEAI_CONFIG: ApiConfig = {
  id: -1,
  provider: 'custom',
  baseUrl: 'https://api.openai-proxy.org/v1',
  model: 'gpt-4o-mini',
  apiKey: 'sk-PByFO1hQJwL32oh0xy3TyAov6bDwJdc91phAdmDDjkU3K6KO',
  isDefault: true,
};

export async function resolveChatConfig(defaultConfig: StoredApiConfig | undefined): Promise<{
  config: ApiConfig | null;
  usingBuiltin: boolean;
  error?: string;
}> {
  if (!defaultConfig) {
    const usage = await getBuiltinUsage();
    if (usage >= BUILTIN_TOKEN_LIMIT) {
      return {
        config: null,
        usingBuiltin: true,
        error: '内置默认模型额度已用完，请在设置中配置自己的 API Key。',
      };
    }
    return { config: BUILTIN_CLOSEAI_CONFIG, usingBuiltin: true };
  }

  try {
    const apiKey = defaultConfig.keyringRef
      ? await getApiKey(defaultConfig.keyringRef)
      : '';
    return {
      config: {
        id: defaultConfig.id,
        provider: defaultConfig.provider as ApiConfig['provider'],
        baseUrl: defaultConfig.baseUrl,
        model: defaultConfig.model,
        apiKey,
        isDefault: true,
      },
      usingBuiltin: false,
    };
  } catch {
    return {
      config: null,
      usingBuiltin: false,
      error: '无法读取 API Key，请重新配置。',
    };
  }
}

export async function resolveStoredChatConfig(defaultConfig: StoredApiConfig): Promise<{
  config: ApiConfig | null;
  error?: string;
}> {
  const resolved = await resolveChatConfig(defaultConfig);
  return { config: resolved.config, error: resolved.error };
}

export async function recordBuiltinUsage(messages: Message[], output: string) {
  const current = await getBuiltinUsage();
  await setSetting(BUILTIN_USAGE_KEY, JSON.stringify(current + estimateTokens(messages, output)));
}

async function getBuiltinUsage(): Promise<number> {
  const raw = await getSetting(BUILTIN_USAGE_KEY);
  if (!raw) return 0;
  const parsed = JSON.parse(raw);
  return typeof parsed === 'number' ? parsed : 0;
}

function estimateTokens(messages: Message[], output: string): number {
  const text = `${messages.map((m) => m.content).join('\n')}\n${output}`;
  return Math.ceil(text.length / 2);
}
