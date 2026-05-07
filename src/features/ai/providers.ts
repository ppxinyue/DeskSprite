export interface ProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyHint: string;
  docsUrl: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKeyHint: 'sk-...', docsUrl: 'https://platform.openai.com/api-keys' },
  { id: 'anthropic', name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', apiKeyHint: 'sk-ant-...', docsUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'google', name: 'Google', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', apiKeyHint: 'AIza...', docsUrl: 'https://aistudio.google.com/app/apikey' },
  { id: 'grok', name: 'Grok', baseUrl: 'https://api.x.ai/v1', apiKeyHint: 'sk-...', docsUrl: 'https://console.x.ai/' },
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', apiKeyHint: 'sk-...', docsUrl: 'https://platform.deepseek.com/api_keys' },
  { id: 'kimi', name: 'Kimi', baseUrl: 'https://api.moonshot.ai/v1', apiKeyHint: 'sk-...', docsUrl: 'https://platform.moonshot.cn/console/api-keys' },
  { id: 'glm', name: 'GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', apiKeyHint: '...', docsUrl: 'https://open.bigmodel.cn/usercenter/apikeys' },
  { id: 'hunyuan', name: 'Hunyuan', baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1', apiKeyHint: '...', docsUrl: 'https://console.cloud.tencent.com/cam/capi' },
  { id: 'minimax', name: 'MiniMax', baseUrl: 'https://api.minimax.io/v1', apiKeyHint: '...', docsUrl: 'https://www.minimaxi.com/user-center/basic-information/interface-key' },
  { id: 'mimo', name: 'MiMo', baseUrl: 'https://api.xiaomimimo.com/v1', apiKeyHint: '...', docsUrl: '' },
  { id: 'qwen', name: 'Qwen', baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', apiKeyHint: 'sk-...', docsUrl: 'https://dashscope.console.aliyun.com/apiKey' },
  { id: 'custom', name: '自定义', baseUrl: '', apiKeyHint: '自定义 API Key', docsUrl: '' },
];

export function getProviderById(id: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((p) => p.id === id);
}

export function getProviderName(id: string): string {
  const provider = getProviderById(id);
  return provider?.name || id;
}
