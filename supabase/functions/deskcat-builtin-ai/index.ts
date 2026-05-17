import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type ChatMessage = {
  role?: string;
  content?: string;
  imageDataUrl?: string;
};

type BuiltinRequest = {
  action?: 'chat' | 'transcribe' | 'synthesize';
  request?: Record<string, unknown>;
};

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, x-client-info, x-deskcat-action, x-deskcat-app-version, x-deskcat-device-id, x-deskcat-signature, x-deskcat-signature-nonce, x-deskcat-signature-timestamp',
  'access-control-allow-methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}

function getBaseUrl() {
  return (Deno.env.get('DESKCAT_BUILTIN_BASE_URL') || 'https://api.openai-proxy.org/v1').replace(/\/+$/, '');
}

function getApiKey(kind: 'chat' | 'voice') {
  const specific = kind === 'voice'
    ? Deno.env.get('DESKCAT_BUILTIN_VOICE_API_KEY')
    : Deno.env.get('DESKCAT_BUILTIN_CHAT_API_KEY');
  const shared = Deno.env.get('DESKCAT_BUILTIN_API_KEY');
  const key = (specific || shared || '').trim().replace(/^Bearer\s+/i, '').replace(/\s+/g, '');
  if (!key) throw new Error(kind === 'voice' ? 'Voice service is not configured' : 'Chat service is not configured');
  return key;
}

function getProxyClientToken() {
  return (Deno.env.get('DESKCAT_BUILTIN_PROXY_CLIENT_TOKEN') || '').trim();
}

function requiresProxySignature() {
  return Deno.env.get('DESKCAT_BUILTIN_REQUIRE_SIGNATURE') === '1';
}

function getMinimumAppVersion() {
  return (Deno.env.get('DESKCAT_BUILTIN_MIN_APP_VERSION') || '').trim();
}

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function extractApiErrorMessage(text: string) {
  try {
    const data = JSON.parse(text);
    return data?.error?.message || data?.message || text;
  } catch {
    return text || null;
  }
}

function extractHttpStatus(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  const match = message.match(/\bHTTP\s+(\d{3})\b/i);
  const status = match ? Number(match[1]) : NaN;
  return Number.isFinite(status) ? status : null;
}

function safeText(value: unknown, maxLength = 200) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

function sanitizeDeviceId(value: unknown) {
  const text = safeText(value, 160);
  return text && /^[a-zA-Z0-9:._-]+$/.test(text) ? text : null;
}

function getDeviceId(req: Request, request: Record<string, unknown>) {
  return sanitizeDeviceId(request.deviceId) || sanitizeDeviceId(req.headers.get('x-deskcat-device-id'));
}

function getAppVersion(req: Request) {
  return safeText(req.headers.get('x-deskcat-app-version'), 80);
}

function compareVersions(left: string, right: string) {
  const leftParts = left.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = right.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length, 3);
  for (let index = 0; index < length; index += 1) {
    const delta = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

function assertAppVersion(req: Request) {
  const minimum = getMinimumAppVersion();
  if (!minimum) return;
  const version = getAppVersion(req);
  if (!version || compareVersions(version, minimum) < 0) {
    throw new Error(`HTTP 426: DeskCat ${minimum} or newer is required`);
  }
}

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value: string) {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

async function hmacSha256Hex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

async function assertProxySignature(req: Request, bodyText: string) {
  const token = getProxyClientToken();
  if (!token && !requiresProxySignature()) return;
  if (!token) throw new Error('HTTP 500: Proxy signature token is not configured');

  const signature = safeText(req.headers.get('x-deskcat-signature'), 128);
  const timestamp = safeText(req.headers.get('x-deskcat-signature-timestamp'), 32);
  const nonce = safeText(req.headers.get('x-deskcat-signature-nonce'), 80);
  const appVersion = getAppVersion(req) || '';
  const deviceId = sanitizeDeviceId(req.headers.get('x-deskcat-device-id')) || '';
  const action = safeText(req.headers.get('x-deskcat-action'), 32) || '';
  if (!signature || !timestamp || !nonce || !appVersion || !action) {
    throw new Error('HTTP 401: Missing request signature');
  }

  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    throw new Error('HTTP 401: Expired request signature');
  }

  const bodyHash = await sha256Hex(bodyText);
  const expected = await hmacSha256Hex(token, `${timestamp}.${nonce}.${appVersion}.${deviceId}.${action}.${bodyHash}`);
  if (!constantTimeEqual(signature.toLowerCase(), expected)) {
    throw new Error('HTTP 401: Invalid request signature');
  }
}

function estimateChatChars(messages: ChatMessage[]) {
  return messages.reduce((total, message) => (
    total + String(message.content || '').length + (message.imageDataUrl ? 1000 : 0)
  ), 0);
}

function buildUsageMetrics(action: BuiltinRequest['action'], request: Record<string, unknown>, result?: Record<string, unknown>) {
  if (action === 'chat') {
    const messages = Array.isArray(request.messages) ? request.messages as ChatMessage[] : [];
    return {
      unit: 'chars',
      inputUnits: estimateChatChars(messages),
      outputUnits: String(result?.content || '').length,
      metadata: {
        messageCount: messages.length,
        hasImage: messages.some((message) => Boolean(message.imageDataUrl)),
      },
    };
  }
  if (action === 'transcribe') {
    const seconds = Math.max(0, Math.ceil(Number(request.durationMs || 0) / 1000));
    return {
      unit: 'seconds',
      inputUnits: seconds,
      outputUnits: String(result?.text || '').length,
      metadata: {
        mimeType: safeText(request.mimeType, 80),
        language: safeText(request.language, 20),
      },
    };
  }
  if (action === 'synthesize') {
    return {
      unit: 'chars',
      inputUnits: String(request.input || '').length,
      outputUnits: 0,
      metadata: {
        voice: safeText(request.voice, 80),
        format: safeText(request.format, 20),
      },
    };
  }
  return {
    unit: 'count',
    inputUnits: 1,
    outputUnits: 0,
    metadata: {},
  };
}

async function recordUsageEvent(args: {
  req: Request;
  action: BuiltinRequest['action'];
  request: Record<string, unknown>;
  result?: Record<string, unknown>;
  startedAt: number;
  success: boolean;
  statusCode?: number | null;
  error?: unknown;
}) {
  if (!args.action) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const metrics = buildUsageMetrics(args.action, args.request, args.result);
  await supabase.from('builtin_ai_usage_events').insert({
    device_id: getDeviceId(args.req, args.request),
    action: args.action,
    app_version: getAppVersion(args.req),
    unit: metrics.unit,
    input_units: metrics.inputUnits,
    output_units: metrics.outputUnits,
    success: args.success,
    status_code: args.statusCode ?? null,
    latency_ms: Math.max(0, Date.now() - args.startedAt),
    error_code: args.error ? safeText(args.error instanceof Error && args.error.name !== 'Error' ? args.error.name : `HTTP_${args.statusCode || 'UNKNOWN'}`, 120) : null,
    metadata: metrics.metadata,
  });
}

async function recordUsageBestEffort(args: Parameters<typeof recordUsageEvent>[0]) {
  try {
    await recordUsageEvent(args);
  } catch (error) {
    console.warn('Failed to record builtin AI usage', error instanceof Error ? error.message : String(error));
  }
}

function buildChatMessages(messages: ChatMessage[]) {
  return messages.map((message) => {
    const role = message.role === 'assistant' || message.role === 'system' ? message.role : 'user';
    if (!message.imageDataUrl) return { role, content: String(message.content || '') };
    return {
      role,
      content: [
        { type: 'text', text: String(message.content || '请分析这张图片。') },
        { type: 'image_url', image_url: { url: String(message.imageDataUrl) } },
      ],
    };
  });
}

async function chatCompletion(request: Record<string, unknown>) {
  const response = await fetch(`${getBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${getApiKey('chat')}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('DESKCAT_BUILTIN_CHAT_MODEL') || 'gpt-4o-mini',
      stream: false,
      messages: buildChatMessages(Array.isArray(request.messages) ? request.messages as ChatMessage[] : []),
    }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${extractApiErrorMessage(text) || response.statusText}`);
  const data = JSON.parse(text);
  const content = data?.choices?.[0]?.message?.content;
  return {
    content: Array.isArray(content) ? content.map((item) => item?.text || '').join('') : String(content || ''),
  };
}

async function transcribeAudio(request: Record<string, unknown>) {
  const audioBase64 = String(request.audioBase64 || '').split(',').pop() || '';
  if (!audioBase64) throw new Error('Missing audio data');
  const bytes = Uint8Array.from(atob(audioBase64), (char) => char.charCodeAt(0));
  const form = new FormData();
  form.append('model', Deno.env.get('DESKCAT_BUILTIN_STT_MODEL') || 'gpt-4o-mini-transcribe');
  const language = String(request.language || '').split(/[-_]/)[0]?.toLowerCase();
  if (language) form.append('language', language);
  form.append(
    'file',
    new Blob([bytes], { type: String(request.mimeType || 'audio/webm') }),
    String(request.fileName || 'recording.webm'),
  );
  const response = await fetch(`${getBaseUrl()}/audio/transcriptions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${getApiKey('voice')}` },
    body: form,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${extractApiErrorMessage(text) || response.statusText}`);
  return { text: JSON.parse(text)?.text?.trim() || '' };
}

async function synthesizeSpeech(request: Record<string, unknown>) {
  const format = String(request.format || 'mp3');
  const response = await fetch(`${getBaseUrl()}/audio/speech`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${getApiKey('voice')}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('DESKCAT_BUILTIN_TTS_MODEL') || 'tts-1',
      input: String(request.input || ''),
      voice: String(request.voice || 'alloy'),
      response_format: format,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${extractApiErrorMessage(text) || response.statusText}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  const mimeType = format === 'opus' ? 'audio/ogg' : format === 'wav' ? 'audio/wav' : 'audio/mpeg';
  return { dataUrl: `data:${mimeType};base64,${btoa(binary)}`, mimeType };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const startedAt = Date.now();
  let payload: BuiltinRequest | null = null;
  let request: Record<string, unknown> = {};
  try {
    assertAppVersion(req);
    const bodyText = await req.text();
    await assertProxySignature(req, bodyText);
    payload = JSON.parse(bodyText) as BuiltinRequest;
    const signedAction = safeText(req.headers.get('x-deskcat-action'), 32);
    if (signedAction && signedAction !== payload.action) {
      throw new Error('HTTP 401: Signed action does not match request body');
    }
    request = payload.request || {};
    if (payload.action === 'chat') {
      const result = await chatCompletion(request);
      await recordUsageBestEffort({ req, action: payload.action, request, result, startedAt, success: true, statusCode: 200 });
      return json(result);
    }
    if (payload.action === 'transcribe') {
      const result = await transcribeAudio(request);
      await recordUsageBestEffort({ req, action: payload.action, request, result, startedAt, success: true, statusCode: 200 });
      return json(result);
    }
    if (payload.action === 'synthesize') {
      const result = await synthesizeSpeech(request);
      await recordUsageBestEffort({ req, action: payload.action, request, result, startedAt, success: true, statusCode: 200 });
      return json(result);
    }
    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    const status = extractHttpStatus(error) || 500;
    await recordUsageBestEffort({
      req,
      action: payload?.action,
      request,
      startedAt,
      success: false,
      statusCode: status,
      error,
    });
    return json({ error: error instanceof Error ? error.message : String(error) }, status);
  }
});
