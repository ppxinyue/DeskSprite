type ApiConfigRow = {
  id: number;
  provider: string;
  base_url: string;
  model: string;
  keyring_ref: string | null;
  is_default: number;
  last_used_at: string | null;
  usage_count: number;
  created_at: string;
  name: string | null;
  provider_id: string | null;
  api_key: string | null;
};

type ConversationRow = {
  id: number;
  title: string | null;
  model_id: number | null;
  started_at: string;
  updated_at: string;
};

type MessageRow = {
  id: number;
  conversation_id: number;
  role: string;
  content: string;
  image_path: string | null;
  tokens_used: number | null;
  timestamp: string;
};

type Store = {
  apiConfigs: ApiConfigRow[];
  systemPrompt: string;
  conversations: ConversationRow[];
  messages: MessageRow[];
  settings: Record<string, string>;
  usageLogs: Array<Record<string, unknown>>;
  nextIds: {
    apiConfig: number;
    conversation: number;
    message: number;
    usageLog: number;
  };
};

const STORE_KEY = 'desksprite:electron-db:v1';

function now() {
  return new Date().toISOString();
}

function createStore(): Store {
  return {
    apiConfigs: [],
    systemPrompt: '',
    conversations: [],
    messages: [],
    settings: {},
    usageLogs: [],
    nextIds: {
      apiConfig: 1,
      conversation: 1,
      message: 1,
      usageLog: 1,
    },
  };
}

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return createStore();
    return { ...createStore(), ...JSON.parse(raw) };
  } catch {
    return createStore();
  }
}

function saveStore(store: Store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function mutate<T>(fn: (store: Store) => T): T {
  const store = loadStore();
  const result = fn(store);
  saveStore(store);
  return result;
}

export async function query<T>(_sql: string, _values?: unknown[]): Promise<T[]> {
  throw new Error('Raw SQL query is not available in the Electron storage adapter.');
}

export async function execute(_sql: string, _values?: unknown[]): Promise<void> {
  throw new Error('Raw SQL execute is not available in the Electron storage adapter.');
}

export async function getApiConfigs() {
  return loadStore().apiConfigs.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function insertApiConfig(
  provider: string,
  baseUrl: string,
  model: string,
  keyringRef: string | null,
  isDefault = 0,
  name?: string,
  providerId?: string,
  apiKey?: string | null,
) {
  mutate((store) => {
    if (isDefault) store.apiConfigs.forEach((config) => { config.is_default = 0; });
    store.apiConfigs.push({
      id: store.nextIds.apiConfig,
      provider,
      base_url: baseUrl,
      model,
      keyring_ref: keyringRef,
      is_default: isDefault,
      last_used_at: null,
      usage_count: 0,
      created_at: now(),
      name: name ?? null,
      provider_id: providerId ?? null,
      api_key: apiKey ?? null,
    });
    store.nextIds.apiConfig += 1;
  });
}

export async function updateApiConfig(
  id: number,
  provider: string,
  baseUrl: string,
  model: string,
  name: string,
  providerId: string,
  keyringRef: string | null,
  apiKey?: string | null,
) {
  mutate((store) => {
    const config = store.apiConfigs.find((item) => item.id === id);
    if (!config) return;
    config.provider = provider;
    config.base_url = baseUrl;
    config.model = model;
    config.name = name;
    config.provider_id = providerId;
    config.keyring_ref = keyringRef;
    if (apiKey !== undefined) config.api_key = apiKey;
  });
}

export async function deleteApiConfig(id: number) {
  mutate((store) => {
    store.apiConfigs = store.apiConfigs.filter((config) => config.id !== id);
  });
}

export async function setDefaultApiConfig(id: number) {
  mutate((store) => {
    store.apiConfigs.forEach((config) => {
      config.is_default = config.id === id ? 1 : 0;
    });
  });
}

export async function getSystemPrompt() {
  return loadStore().systemPrompt;
}

export async function updateSystemPrompt(text: string) {
  mutate((store) => {
    store.systemPrompt = text;
  });
}

export async function getConversations() {
  return loadStore().conversations.slice().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function createConversation(title?: string, modelId?: number) {
  mutate((store) => {
    const createdAt = now();
    store.conversations.push({
      id: store.nextIds.conversation,
      title: title ?? null,
      model_id: modelId ?? null,
      started_at: createdAt,
      updated_at: createdAt,
    });
    store.nextIds.conversation += 1;
  });
}

export async function deleteConversation(id: number) {
  mutate((store) => {
    store.messages = store.messages.filter((message) => message.conversation_id !== id);
    store.conversations = store.conversations.filter((conversation) => conversation.id !== id);
  });
}

export async function getMessages(conversationId: number) {
  return loadStore().messages
    .filter((message) => message.conversation_id === conversationId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function insertMessage(
  conversationId: number,
  role: string,
  content: string,
  imagePath?: string,
  tokensUsed?: number,
) {
  mutate((store) => {
    const timestamp = now();
    store.messages.push({
      id: store.nextIds.message,
      conversation_id: conversationId,
      role,
      content,
      image_path: imagePath ?? null,
      tokens_used: tokensUsed ?? null,
      timestamp,
    });
    store.nextIds.message += 1;
    const conversation = store.conversations.find((item) => item.id === conversationId);
    if (conversation) conversation.updated_at = timestamp;
  });
}

export async function insertUsageLog(
  configId: number | null,
  conversationId: number | null,
  messageId: number | null,
  type: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  costEstimate: number,
) {
  mutate((store) => {
    store.usageLogs.push({
      id: store.nextIds.usageLog,
      config_id: configId,
      conversation_id: conversationId,
      message_id: messageId,
      type,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_estimate: costEstimate,
      created_at: now(),
    });
    store.nextIds.usageLog += 1;
  });
}

export async function getSetting(key: string): Promise<string | null> {
  return loadStore().settings[key] ?? null;
}

export async function setSetting(key: string, value: string) {
  mutate((store) => {
    store.settings[key] = value;
  });
}

export async function getAllSettings() {
  const settings = loadStore().settings;
  return Object.entries(settings).map(([key, value]) => ({ key, value }));
}
