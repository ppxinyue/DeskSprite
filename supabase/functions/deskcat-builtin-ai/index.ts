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
  'access-control-allow-headers': 'authorization, content-type, x-client-info, x-deskcat-app-version',
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

function extractApiErrorMessage(text: string) {
  try {
    const data = JSON.parse(text);
    return data?.error?.message || data?.message || text;
  } catch {
    return text || null;
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

  try {
    const payload = await req.json() as BuiltinRequest;
    if (payload.action === 'chat') return json(await chatCompletion(payload.request || {}));
    if (payload.action === 'transcribe') return json(await transcribeAudio(payload.request || {}));
    if (payload.action === 'synthesize') return json(await synthesizeSpeech(payload.request || {}));
    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
