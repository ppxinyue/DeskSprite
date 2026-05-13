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

export type TelemetryFeature =
  | 'app'
  | 'chat'
  | 'coding'
  | 'voice'
  | 'screenshot'
  | 'timeline'
  | 'settings'
  | 'focus'
  | 'rest'
  | 'avatar';

export type TelemetryEvent = {
  id: number;
  eventName: string;
  feature: TelemetryFeature;
  count: number;
  durationMs: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  syncedAt: string | null;
};

export type FeatureUsageSummary = {
  feature: TelemetryFeature;
  eventCount: number;
  totalCount: number;
  totalDurationMs: number;
  lastUsedAt: string | null;
};

export type AnalyticsDashboard = {
  deviceId: string;
  totalUsers: number;
  dau: number;
  activeDays: number;
  totalUsageMs: number;
  featureUsage: FeatureUsageSummary[];
  recentEvents: TelemetryEvent[];
};

export type CloudSyncStatus = {
  deviceId: string;
  enabled: boolean;
  endpoint: string | null;
  pendingBackup: boolean;
  pendingTelemetryEvents: number;
  lastBackupAt: string | null;
  lastSyncAttemptAt: string | null;
  lastSyncError: string | null;
};

export type CloudSyncResult = CloudSyncStatus & {
  ok: boolean;
  uploadedTelemetryEvents: number;
};

export type CloudBackupPayload = {
  id: string;
  reason: string;
  createdAt: string;
  deviceId: string;
  snapshot: Omit<Store, 'cloudSync'>;
};

type CloudSyncState = {
  deviceId: string;
  pendingBackup: CloudBackupPayload | null;
  lastBackupAt: string | null;
  lastSyncAttemptAt: string | null;
  lastSyncError: string | null;
};

type Store = {
  apiConfigs: ApiConfigRow[];
  systemPrompt: string;
  conversations: ConversationRow[];
  messages: MessageRow[];
  settings: Record<string, string>;
  usageLogs: Array<Record<string, unknown>>;
  telemetryEvents: TelemetryEvent[];
  focusStats: Record<string, FocusStatsDay>;
  timelineEntries: TimelineEntry[];
  cloudSync: CloudSyncState;
  nextIds: {
    apiConfig: number;
    conversation: number;
    message: number;
    usageLog: number;
    timelineEntry: number;
    telemetryEvent: number;
  };
};

const STORE_KEY = 'desksprite:electron-db:v1';

function now() {
  return new Date().toISOString();
}

function createDeviceId() {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && 'randomUUID' in cryptoObj) return cryptoObj.randomUUID();
  return `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getDefaultCloudSettings(): Record<string, string> {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const endpoint = env?.VITE_CLOUD_SYNC_ENDPOINT?.trim();
  const ingestToken = env?.VITE_CLOUD_SYNC_INGEST_TOKEN?.trim();
  return {
    ...(endpoint ? { cloudSyncEndpoint: endpoint } : {}),
    ...(ingestToken ? { cloudSyncIngestToken: ingestToken } : {}),
  };
}

function createStore(): Store {
  return {
    apiConfigs: [],
    systemPrompt: '',
    conversations: [],
    messages: [],
    settings: getDefaultCloudSettings(),
    usageLogs: [],
    telemetryEvents: [],
    focusStats: {},
    timelineEntries: [],
    cloudSync: {
      deviceId: createDeviceId(),
      pendingBackup: null,
      lastBackupAt: null,
      lastSyncAttemptAt: null,
      lastSyncError: null,
    },
    nextIds: {
      apiConfig: 1,
      conversation: 1,
      message: 1,
      usageLog: 1,
      timelineEntry: 1,
      telemetryEvent: 1,
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
      settings: {
        ...base.settings,
        ...(parsed.settings ?? {}),
      },
      telemetryEvents: Array.isArray(parsed.telemetryEvents) ? parsed.telemetryEvents : [],
      timelineEntries: Array.isArray(parsed.timelineEntries) ? parsed.timelineEntries : [],
      cloudSync: {
        ...base.cloudSync,
        ...(parsed.cloudSync ?? {}),
        deviceId: parsed.cloudSync?.deviceId || parsed.settings?.cloudDeviceId || base.cloudSync.deviceId,
      },
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

function cloudBackupEnabled(store: Store) {
  return store.settings.cloudBackupEnabled !== 'false';
}

function analyticsEnabled(store: Store) {
  return store.settings.analyticsEnabled !== 'false';
}

function scrubApiConfigForCloud(config: ApiConfigRow): ApiConfigRow {
  return {
    ...config,
    api_key: config.api_key ? '[redacted]' : null,
    keyring_ref: config.keyring_ref ? '[keychain]' : null,
  };
}

function scrubSettingsForCloud(settings: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(settings).map(([key, value]) => [
    key,
    /(apiKey|token|secret|password)/i.test(key) && value ? '[redacted]' : value,
  ]));
}

function createCloudSnapshot(store: Store): Omit<Store, 'cloudSync'> {
  return {
    apiConfigs: store.apiConfigs.map(scrubApiConfigForCloud),
    systemPrompt: store.systemPrompt,
    conversations: store.conversations,
    messages: store.messages,
    settings: scrubSettingsForCloud(store.settings),
    usageLogs: store.usageLogs,
    telemetryEvents: store.telemetryEvents,
    focusStats: store.focusStats,
    timelineEntries: store.timelineEntries,
    nextIds: store.nextIds,
  };
}

function queueCloudBackup(store: Store, reason: string) {
  if (!cloudBackupEnabled(store)) return;
  const createdAt = now();
  store.cloudSync.pendingBackup = {
    id: `${store.cloudSync.deviceId}:${createdAt}`,
    reason,
    createdAt,
    deviceId: store.cloudSync.deviceId,
    snapshot: createCloudSnapshot(store),
  };
}

function getCloudEndpoint(store: Store) {
  const value = store.settings.cloudSyncEndpoint?.trim();
  return value || null;
}

function getUnsyncedTelemetryEvents(store: Store) {
  return store.telemetryEvents.filter((event) => !event.syncedAt);
}

function cloneTelemetryEvent(event: TelemetryEvent): TelemetryEvent {
  return {
    ...event,
    metadata: { ...event.metadata },
  };
}

function getActiveDates(store: Store) {
  const dates = new Set<string>();
  Object.values(store.focusStats).forEach((day) => {
    if (day.focusMs > 0 || day.focusSessions > 0 || day.distractions > 0 || (day.codingMs ?? 0) > 0) dates.add(day.date);
  });
  store.timelineEntries.forEach((entry) => dates.add(entry.date));
  store.telemetryEvents.forEach((event) => dates.add(localDateKey(new Date(event.createdAt))));
  return dates;
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

function mutate<T>(fn: (store: Store) => T, options: { backup?: boolean; backupReason?: string } = {}): T {
  const store = loadStore();
  const result = fn(store);
  if (options.backup !== false) queueCloudBackup(store, options.backupReason ?? 'local-change');
  saveStore(store);
  return result;
}

function appendTelemetryEvent(
  store: Store,
  eventName: string,
  feature: TelemetryFeature,
  count: number,
  durationMs: number,
  metadata: Record<string, unknown>,
  createdAt = now(),
) {
  if (!analyticsEnabled(store)) return null;
  const event: TelemetryEvent = {
    id: store.nextIds.telemetryEvent,
    eventName,
    feature,
    count: Math.max(1, Math.floor(count)),
    durationMs: Math.max(0, Math.floor(durationMs)),
    metadata,
    createdAt,
    syncedAt: null,
  };
  store.telemetryEvents.push(event);
  store.nextIds.telemetryEvent += 1;
  if (store.telemetryEvents.length > 10_000) {
    store.telemetryEvents = store.telemetryEvents.slice(-10_000);
  }
  return event;
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
    appendTelemetryEvent(store, 'chat.message', 'chat', 1, 0, { role, hasImage: Boolean(imagePath), tokensUsed: tokensUsed ?? null });
  }, { backupReason: 'chat-message' });
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
  }, { backupReason: 'usage-log' });
}

export async function getSetting(key: string): Promise<string | null> {
  return loadStore().settings[key] ?? null;
}

export async function setSetting(key: string, value: string) {
  mutate((store) => {
    store.settings[key] = value;
  }, { backupReason: `setting:${key}` });
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
    appendTelemetryEvent(store, 'focus.session', 'focus', 1, duration, { startedAt: new Date(startedAt).toISOString(), endedAt: new Date(endedAt).toISOString() });
    return { ...day };
  }, { backupReason: 'focus-session' });
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
    appendTelemetryEvent(store, 'focus.distraction', 'focus', 1, Math.max(0, durationMs), { appName: key, occurredAt: new Date(occurredAt).toISOString() });
    return { ...day };
  }, { backupReason: 'focus-distraction' });
}

export async function recordCodingModeTime(startedAt: number, endedAt = Date.now()) {
  const duration = Math.max(0, endedAt - startedAt);
  if (duration < 1000) return;
  return mutate((store) => {
    const day = ensureFocusStatsDay(store, localDateKey(new Date(endedAt)));
    day.codingMs += duration;
    appendTelemetryEvent(store, 'coding.session', 'coding', 1, duration, { startedAt: new Date(startedAt).toISOString(), endedAt: new Date(endedAt).toISOString() });
    return { ...day };
  }, { backupReason: 'coding-session' });
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
    appendTelemetryEvent(store, 'timeline.entry', 'timeline', 1, end - start, {
      appName,
      category,
      domain,
      foregroundVisible: foregroundVisible !== false,
    });
    return { ...next, backgroundMarkers: next.backgroundMarkers.map((marker) => ({ ...marker })) };
  }, { backupReason: 'timeline-entry' });
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

export async function recordTelemetryEvent({
  eventName,
  feature,
  count = 1,
  durationMs = 0,
  metadata = {},
  createdAt,
}: {
  eventName: string;
  feature: TelemetryFeature;
  count?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}): Promise<TelemetryEvent | null> {
  return mutate((store) => {
    const event = appendTelemetryEvent(store, eventName, feature, count, durationMs, metadata, createdAt);
    return event ? cloneTelemetryEvent(event) : null;
  }, { backupReason: `telemetry:${eventName}` });
}

export async function getTelemetryEvents(limit = 200): Promise<TelemetryEvent[]> {
  const count = Math.max(1, Math.floor(limit));
  return loadStore().telemetryEvents
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, count)
    .map(cloneTelemetryEvent);
}

export async function getCloudSyncStatus(): Promise<CloudSyncStatus> {
  const store = loadStore();
  return {
    deviceId: store.cloudSync.deviceId,
    enabled: cloudBackupEnabled(store),
    endpoint: getCloudEndpoint(store),
    pendingBackup: Boolean(store.cloudSync.pendingBackup),
    pendingTelemetryEvents: getUnsyncedTelemetryEvents(store).length,
    lastBackupAt: store.cloudSync.lastBackupAt,
    lastSyncAttemptAt: store.cloudSync.lastSyncAttemptAt,
    lastSyncError: store.cloudSync.lastSyncError,
  };
}

export async function hasPendingCloudSync(): Promise<boolean> {
  const store = loadStore();
  return cloudBackupEnabled(store)
    && Boolean(getCloudEndpoint(store))
    && (Boolean(store.cloudSync.pendingBackup) || getUnsyncedTelemetryEvents(store).length > 0);
}

export async function getCloudBackupPayload(): Promise<CloudBackupPayload | null> {
  const store = loadStore();
  return store.cloudSync.pendingBackup
    ? {
      ...store.cloudSync.pendingBackup,
      snapshot: createCloudSnapshot(store),
    }
    : null;
}

export async function getDeveloperAnalyticsDashboard(days = 30): Promise<AnalyticsDashboard> {
  const store = loadStore();
  const cutoff = Date.now() - Math.max(1, Math.floor(days)) * 24 * 60 * 60 * 1000;
  const events = store.telemetryEvents.filter((event) => new Date(event.createdAt).getTime() >= cutoff);
  const featureMap = new Map<TelemetryFeature, FeatureUsageSummary>();
  for (const event of events) {
    const current = featureMap.get(event.feature) ?? {
      feature: event.feature,
      eventCount: 0,
      totalCount: 0,
      totalDurationMs: 0,
      lastUsedAt: null,
    };
    current.eventCount += 1;
    current.totalCount += event.count;
    current.totalDurationMs += event.durationMs;
    if (!current.lastUsedAt || event.createdAt > current.lastUsedAt) current.lastUsedAt = event.createdAt;
    featureMap.set(event.feature, current);
  }

  const today = localDateKey();
  const activeDates = getActiveDates(store);
  return {
    deviceId: store.cloudSync.deviceId,
    totalUsers: 1,
    dau: activeDates.has(today) ? 1 : 0,
    activeDays: activeDates.size,
    totalUsageMs: events.reduce((sum, event) => sum + event.durationMs, 0),
    featureUsage: Array.from(featureMap.values()).sort((a, b) => b.totalDurationMs - a.totalDurationMs || b.totalCount - a.totalCount),
    recentEvents: events.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50).map(cloneTelemetryEvent),
  };
}

export async function syncCloudBackup(endpointOverride?: string): Promise<CloudSyncResult> {
  const store = loadStore();
  const endpoint = endpointOverride?.trim() || getCloudEndpoint(store);
  const attemptedAt = now();
  if (!endpoint) {
    return mutate((draft) => {
      draft.cloudSync.lastSyncAttemptAt = attemptedAt;
      draft.cloudSync.lastSyncError = 'cloudSyncEndpoint is not configured';
      return {
        ok: false,
        uploadedTelemetryEvents: 0,
        deviceId: draft.cloudSync.deviceId,
        enabled: cloudBackupEnabled(draft),
        endpoint: null,
        pendingBackup: Boolean(draft.cloudSync.pendingBackup),
        pendingTelemetryEvents: getUnsyncedTelemetryEvents(draft).length,
        lastBackupAt: draft.cloudSync.lastBackupAt,
        lastSyncAttemptAt: draft.cloudSync.lastSyncAttemptAt,
        lastSyncError: draft.cloudSync.lastSyncError,
      };
    }, { backup: false });
  }

  const telemetryEvents = getUnsyncedTelemetryEvents(store).map(cloneTelemetryEvent);
  const backup = store.cloudSync.pendingBackup
    ? { ...store.cloudSync.pendingBackup, snapshot: createCloudSnapshot(store) }
    : null;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-desksprite-device-id': store.cloudSync.deviceId,
        ...(store.settings.cloudSyncIngestToken ? { 'x-desksprite-ingest-token': store.settings.cloudSyncIngestToken } : {}),
      },
      body: JSON.stringify({
        deviceId: store.cloudSync.deviceId,
        backup,
        telemetryEvents,
        sentAt: attemptedAt,
      }),
    });
    if (!response.ok) throw new Error(`Cloud sync failed: ${response.status} ${response.statusText}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return mutate((draft) => {
      draft.cloudSync.lastSyncAttemptAt = attemptedAt;
      draft.cloudSync.lastSyncError = message;
      return {
        ok: false,
        uploadedTelemetryEvents: 0,
        deviceId: draft.cloudSync.deviceId,
        enabled: cloudBackupEnabled(draft),
        endpoint,
        pendingBackup: Boolean(draft.cloudSync.pendingBackup),
        pendingTelemetryEvents: getUnsyncedTelemetryEvents(draft).length,
        lastBackupAt: draft.cloudSync.lastBackupAt,
        lastSyncAttemptAt: draft.cloudSync.lastSyncAttemptAt,
        lastSyncError: draft.cloudSync.lastSyncError,
      };
    }, { backup: false });
  }

  return mutate((draft) => {
    const syncedAt = now();
    const uploadedIds = new Set(telemetryEvents.map((event) => event.id));
    draft.telemetryEvents.forEach((event) => {
      if (uploadedIds.has(event.id)) event.syncedAt = syncedAt;
    });
    draft.cloudSync.pendingBackup = null;
    draft.cloudSync.lastBackupAt = syncedAt;
    draft.cloudSync.lastSyncAttemptAt = attemptedAt;
    draft.cloudSync.lastSyncError = null;
    return {
      ok: true,
      uploadedTelemetryEvents: uploadedIds.size,
      deviceId: draft.cloudSync.deviceId,
      enabled: cloudBackupEnabled(draft),
      endpoint,
      pendingBackup: false,
      pendingTelemetryEvents: getUnsyncedTelemetryEvents(draft).length,
      lastBackupAt: draft.cloudSync.lastBackupAt,
      lastSyncAttemptAt: draft.cloudSync.lastSyncAttemptAt,
      lastSyncError: null,
    };
  }, { backup: false });
}
