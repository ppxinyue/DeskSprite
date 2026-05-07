export interface ProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  models: string[];
  apiKeyHint: string;
  docsUrl: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini', 'o3-mini'],
    apiKeyHint: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-3-5-sonnet-20241022'],
    apiKeyHint: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'google',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-2.0-flash', 'gemini-2.5-pro'],
    apiKeyHint: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'grok',
    name: 'Grok (xAI)',
    baseUrl: 'https://api.x.ai/v1',
    models: ['grok-3', 'grok-3-mini', 'grok-2'],
    apiKeyHint: 'sk-...',
    docsUrl: 'https://console.x.ai/',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    apiKeyHint: 'sk-...',
    docsUrl: 'https://platform.deepseek.com/api_keys',
  },
  {
    id: 'kimi',
    name: 'Kimi (月之暗面)',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k'],
    apiKeyHint: 'sk-...',
    docsUrl: 'https://platform.moonshot.cn/console/api-keys',
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4-plus', 'glm-4-flash'],
    apiKeyHint: '...',
    docsUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
  },
  {
    id: 'hunyuan',
    name: '腾讯混元',
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    models: ['hunyuan-turbos', 'hunyuan-pro'],
    apiKeyHint: '...',
    docsUrl: 'https://console.cloud.tencent.com/cam/capi',
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    baseUrl: 'https://api.minimax.chat/v1',
    models: ['MiniMax-Text-01'],
    apiKeyHint: '...',
    docsUrl: 'https://www.minimaxi.com/user-center/basic-information/interface-key',
  },
  {
    id: 'qwen',
    name: '通义千问 (Qwen)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
    apiKeyHint: 'sk-...',
    docsUrl: 'https://dashscope.console.aliyun.com/apiKey',
  },
  {
    id: 'custom',
    name: '自定义',
    baseUrl: '',
    models: [],
    apiKeyHint: '自定义 API Key',
    docsUrl: '',
  },
];

export function getProviderById(id: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((p) => p.id === id);
}

export function getProviderName(id: string): string {
  const provider = getProviderById(id);
  return provider?.name || id;
}
