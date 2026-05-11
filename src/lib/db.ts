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

export type FocusStatsDay = {
  date: string;
  focusMs: number;
  focusSessions: number;
  distractions: number;
  codingMs: number;
  distractionApps: Record<string, { count: number; durationMs: number }>;
};

export type TimelineCategory = 'coding' | 'chat' | 'browser' | 'office' | 'entertainment' | 'other';

export type TimelineBackgroundMarker = {
  type: string;
  name: string;
  detail: string;
  startedAt?: string;
  endedAt?: string;
};

export type TimelineEntry = {
  id: number;
  date: string;
  startedAt: string;
  endedAt: string;
  appName: string;
  windowTitle: string;
  url: string | null;
  domain: string | null;
  category: TimelineCategory;
  backgroundMarkers: TimelineBackgroundMarker[];
  foregroundVisible?: boolean;
};

type Store = {
  apiConfigs: ApiConfigRow[];
  systemPrompt: string;
  conversations: ConversationRow[];
  messages: MessageRow[];
  settings: Record<string, string>;
  usageLogs: Array<Record<string, unknown>>;
  focusStats: Record<string, FocusStatsDay>;
  timelineEntries: TimelineEntry[];
  nextIds: {
    apiConfig: number;
    conversation: number;
    message: number;
    usageLog: number;
    timelineEntry: number;
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
    focusStats: {},
    timelineEntries: [],
    nextIds: {
      apiConfig: 1,
      conversation: 1,
      message: 1,
      usageLog: 1,
      timelineEntry: 1,
    },
  };
}

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return createStore();
    const parsed = JSON.parse(raw);
    const base = createStore();
    return {
      ...base,
      ...parsed,
      timelineEntries: Array.isArray(parsed.timelineEntries) ? parsed.timelineEntries : [],
      nextIds: {
        ...base.nextIds,
        ...(parsed.nextIds ?? {}),
      },
    };
  } catch {
    return createStore();
  }
}

function saveStore(store: Store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, offset: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return localDateKey(date);
}

function domainFromUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function classifyTimelineCategory(appName: string, windowTitle: string, url: string | null | undefined): TimelineCategory {
  const app = appName.toLowerCase();
  const title = windowTitle.toLowerCase();
  const domain = domainFromUrl(url)?.toLowerCase() ?? '';
  if (/(terminal|iterm|warp|cursor|visual studio code|xcode|github|codex|claude)/.test(app)) return 'coding';
  if (/(wechat|微信|qq|feishu|飞书|slack|discord|telegram|messages|mail|outlook|teams)/.test(app)) return 'chat';
  if (/(safari|chrome|chromium|brave|edge|arc|firefox|vivaldi)/.test(app)) {
    if (/(youtube|bilibili|netflix|twitch|douyin|tiktok|weibo|xiaohongshu|reddit|instagram|twitter|x\.com)/.test(`${domain} ${title}`)) {
      return 'entertainment';
    }
    return 'browser';
  }
  if (/(music|neteasemusic|spotify|steam|网易云|vlc|quicktime|tv|podcasts)/.test(app)) return 'entertainment';
  if (/(pages|numbers|keynote|word|excel|powerpoint|preview|finder|notion|obsidian|figma|photoshop|illustrator)/.test(app)) return 'office';
  return 'other';
}

function ensureFocusStatsDay(store: Store, dateKey: string): FocusStatsDay {
  const existing = store.focusStats[dateKey];
  if (existing) {
    existing.codingMs ??= 0;
    existing.distractionApps ??= {};
    return existing;
  }
  const created = { date: dateKey, focusMs: 0, focusSessions: 0, distractions: 0, codingMs: 0, distractionApps: {} };
  store.focusStats[dateKey] = created;
  return created;
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

export async function recordFocusSession(startedAt: number, endedAt = Date.now()) {
  const duration = Math.max(0, endedAt - startedAt);
  if (duration < 1000) return;
  return mutate((store) => {
    const day = ensureFocusStatsDay(store, localDateKey(new Date(endedAt)));
    day.focusMs += duration;
    day.focusSessions += 1;
    return { ...day };
  });
}

export async function recordDistraction(occurredAt = Date.now(), appName = 'Unknown', durationMs = 0) {
  return mutate((store) => {
    const day = ensureFocusStatsDay(store, localDateKey(new Date(occurredAt)));
    day.distractions += 1;
    const key = String(appName || 'Unknown').trim() || 'Unknown';
    const current = day.distractionApps[key] ?? { count: 0, durationMs: 0 };
    day.distractionApps[key] = {
      count: current.count + 1,
      durationMs: current.durationMs + Math.max(0, durationMs),
    };
    return { ...day };
  });
}

export async function recordCodingModeTime(startedAt: number, endedAt = Date.now()) {
  const duration = Math.max(0, endedAt - startedAt);
  if (duration < 1000) return;
  return mutate((store) => {
    const day = ensureFocusStatsDay(store, localDateKey(new Date(endedAt)));
    day.codingMs += duration;
    return { ...day };
  });
}

export async function getFocusStatsDays(days = 14, endDate = localDateKey()): Promise<FocusStatsDay[]> {
  const store = loadStore();
  const count = Math.max(1, Math.floor(days));
  return Array.from({ length: count }, (_, index) => {
    const date = addDays(endDate, index - count + 1);
    const day = store.focusStats[date];
    return day
      ? { ...day, codingMs: day.codingMs ?? 0, distractionApps: day.distractionApps ?? {} }
      : { date, focusMs: 0, focusSessions: 0, distractions: 0, codingMs: 0, distractionApps: {} };
  });
}

export async function upsertTimelineEntry({
  id,
  startedAt,
  endedAt,
  appName,
  windowTitle,
  url,
  backgroundMarkers,
  foregroundVisible,
}: {
  id?: number | null;
  startedAt: number;
  endedAt: number;
  appName: string;
  windowTitle: string;
  url?: string | null;
  backgroundMarkers?: TimelineBackgroundMarker[];
  foregroundVisible?: boolean;
}): Promise<TimelineEntry | null> {
  const start = Math.min(startedAt, endedAt);
  const end = Math.max(startedAt, endedAt);
  if (end - start < 1000) return null;
  return mutate((store) => {
    const normalizedUrl = url?.trim() || null;
    const domain = domainFromUrl(normalizedUrl);
    const category = classifyTimelineCategory(appName, windowTitle, normalizedUrl);
    const next: TimelineEntry = {
      id: id ?? store.nextIds.timelineEntry,
      date: localDateKey(new Date(end)),
      startedAt: new Date(start).toISOString(),
      endedAt: new Date(end).toISOString(),
      appName,
      windowTitle,
      url: normalizedUrl,
      domain,
      category,
      backgroundMarkers: backgroundMarkers ?? [],
      ...(foregroundVisible === false ? { foregroundVisible: false } : {}),
    };
    const existingIndex = id ? store.timelineEntries.findIndex((entry) => entry.id === id) : -1;
    if (existingIndex >= 0) {
      store.timelineEntries[existingIndex] = next;
    } else {
      store.timelineEntries.push(next);
      store.nextIds.timelineEntry = Math.max(store.nextIds.timelineEntry + 1, next.id + 1);
    }
    const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
    store.timelineEntries = store.timelineEntries.filter((entry) => new Date(entry.endedAt).getTime() >= cutoff);
    return { ...next, backgroundMarkers: next.backgroundMarkers.map((marker) => ({ ...marker })) };
  });
}

export async function getTimelineEntries(date = localDateKey()): Promise<TimelineEntry[]> {
  const dayStart = new Date(`${date}T00:00:00`).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  return loadStore().timelineEntries
    .filter((entry) => {
      const startedAt = new Date(entry.startedAt).getTime();
      const endedAt = new Date(entry.endedAt).getTime();
      const foregroundOverlaps = startedAt < dayEnd && endedAt > dayStart;
      if (foregroundOverlaps) return true;
      return (entry.backgroundMarkers ?? []).some((marker) => {
        const markerStartedAt = new Date(marker.startedAt ?? entry.startedAt).getTime();
        const markerEndedAt = new Date(marker.endedAt ?? marker.startedAt ?? entry.startedAt).getTime();
        return markerStartedAt < dayEnd && markerEndedAt > dayStart;
      });
    })
    .sort((a, b) => {
      const aStart = Math.max(new Date(a.startedAt).getTime(), dayStart);
      const bStart = Math.max(new Date(b.startedAt).getTime(), dayStart);
      return aStart - bStart;
    })
    .map((entry) => ({
      ...entry,
      backgroundMarkers: Array.isArray(entry.backgroundMarkers)
        ? entry.backgroundMarkers.map((marker) => ({ ...marker }))
        : [],
    }));
}
