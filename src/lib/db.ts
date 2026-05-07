import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:desksprite.db');
  }
  return db;
}

export async function query<T>(sql: string, values?: unknown[]): Promise<T[]> {
  const database = await getDb();
  return database.select<T[]>(sql, values ?? []);
}

export async function execute(sql: string, values?: unknown[]): Promise<void> {
  const database = await getDb();
  await database.execute(sql, values ?? []);
}

// api_configs
export async function getApiConfigs() {
  return query<{
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
  }>('SELECT * FROM api_configs ORDER BY created_at DESC');
}

export async function insertApiConfig(
  provider: string,
  baseUrl: string,
  model: string,
  keyringRef: string,
  isDefault = 0,
  name?: string,
  providerId?: string,
  apiKey?: string | null
) {
  return execute(
    'INSERT INTO api_configs (provider, base_url, model, keyring_ref, is_default, name, provider_id, api_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [provider, baseUrl, model, keyringRef, isDefault, name ?? null, providerId ?? null, apiKey ?? null]
  );
}

export async function updateApiConfig(
  id: number,
  provider: string,
  baseUrl: string,
  model: string,
  name: string,
  providerId: string,
  keyringRef: string | null,
  apiKey?: string | null
) {
  if (apiKey === undefined) {
    return execute(
      'UPDATE api_configs SET provider = ?, base_url = ?, model = ?, name = ?, provider_id = ?, keyring_ref = ? WHERE id = ?',
      [provider, baseUrl, model, name, providerId, keyringRef, id]
    );
  }
  return execute(
    'UPDATE api_configs SET provider = ?, base_url = ?, model = ?, name = ?, provider_id = ?, keyring_ref = ?, api_key = ? WHERE id = ?',
    [provider, baseUrl, model, name, providerId, keyringRef, apiKey, id]
  );
}

export async function deleteApiConfig(id: number) {
  return execute('DELETE FROM api_configs WHERE id = ?', [id]);
}

export async function setDefaultApiConfig(id: number) {
  await execute('UPDATE api_configs SET is_default = 0');
  return execute('UPDATE api_configs SET is_default = 1 WHERE id = ?', [id]);
}

// system_prompts
export async function getSystemPrompt() {
  const rows = await query<{ prompt_text: string }>(
    'SELECT prompt_text FROM system_prompts WHERE id = 1'
  );
  return rows[0]?.prompt_text ?? '';
}

export async function updateSystemPrompt(text: string) {
  return execute(
    'UPDATE system_prompts SET prompt_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
    [text]
  );
}

// conversations
export async function getConversations() {
  return query<{
    id: number;
    title: string | null;
    model_id: number | null;
    started_at: string;
    updated_at: string;
  }>('SELECT * FROM conversations ORDER BY updated_at DESC');
}

export async function createConversation(title?: string, modelId?: number) {
  return execute(
    'INSERT INTO conversations (title, model_id) VALUES (?, ?)',
    [title ?? null, modelId ?? null]
  );
}

export async function deleteConversation(id: number) {
  await execute('DELETE FROM messages WHERE conversation_id = ?', [id]);
  return execute('DELETE FROM conversations WHERE id = ?', [id]);
}

// messages
export async function getMessages(conversationId: number) {
  return query<{
    id: number;
    conversation_id: number;
    role: string;
    content: string;
    image_path: string | null;
    tokens_used: number | null;
    timestamp: string;
  }>('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC', [conversationId]);
}

export async function insertMessage(
  conversationId: number,
  role: string,
  content: string,
  imagePath?: string,
  tokensUsed?: number
) {
  await execute(
    'INSERT INTO messages (conversation_id, role, content, image_path, tokens_used) VALUES (?, ?, ?, ?, ?)',
    [conversationId, role, content, imagePath ?? null, tokensUsed ?? null]
  );
  return execute(
    'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [conversationId]
  );
}

// ai_usage_logs
export async function insertUsageLog(
  configId: number | null,
  conversationId: number | null,
  messageId: number | null,
  type: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  costEstimate: number
) {
  return execute(
    'INSERT INTO ai_usage_logs (config_id, conversation_id, message_id, type, model, input_tokens, output_tokens, cost_estimate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [configId, conversationId, messageId, type, model, inputTokens, outputTokens, costEstimate]
  );
}

// settings
export async function getSetting(key: string): Promise<string | null> {
  const rows = await query<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  return execute(
    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [key, value]
  );
}

export async function getAllSettings() {
  return query<{ key: string; value: string }>('SELECT key, value FROM settings');
}
