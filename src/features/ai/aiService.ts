import type { ApiConfig, Message, AiError } from './types';
import { getApiKey } from '@/lib/keychain';

export async function* streamChat(
  messages: Message[],
  config: ApiConfig & { keyringRef?: string | null },
): AsyncGenerator<string, void, undefined> {
  const apiKey = config.apiKey || (config.keyringRef ? await getApiKey(config.keyringRef) : '');
  const configWithKey = { ...config, apiKey };
  const body = buildRequestBody(messages, configWithKey, true);
  const headers = buildHeaders(configWithKey);

  let response: Response;
  try {
    response = await fetch(`${configWithKey.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw createAiError(e);
  }

  if (!response.ok) {
    throw await responseToAiError(response);
  }

  const reader = response.body?.getReader();
  if (!reader) throw { code: 'network' as const, message: 'No response body' };

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const tokens = parseSSELine(line);
      for (const token of tokens) {
        yield token;
      }
    }
  }

  // Process remaining buffer
  if (buffer) {
    const tokens = parseSSELine(buffer);
    for (const token of tokens) {
      yield token;
    }
  }
}

export async function vision(
  imageBase64: string,
  config: ApiConfig & { keyringRef?: string | null },
  prompt = '请详细描述并分析图片中的内容。',
): Promise<string> {
  const apiKey = config.apiKey || (config.keyringRef ? await getApiKey(config.keyringRef) : '');
  const configWithKey = { ...config, apiKey };
  const headers = buildHeaders(configWithKey);
  const body = buildVisionBody(imageBase64, prompt, configWithKey);

  let response: Response;
  try {
    response = await fetch(`${configWithKey.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw createAiError(e);
  }

  if (!response.ok) {
    throw await responseToAiError(response);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function buildHeaders(config: ApiConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  };
  if (config.provider === 'anthropic') {
    headers['x-api-key'] = config.apiKey;
    headers['anthropic-version'] = '2023-06-01';
    delete headers['Authorization'];
  }
  return headers;
}

function buildRequestBody(
  messages: Message[],
  config: ApiConfig,
  stream: boolean,
) {
  if (config.provider === 'anthropic') {
    const systemMsg = messages.find((m) => m.role === 'system');
    const chatMsgs = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role,
        content: m.imageDataUrl ? [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: dataUrlMime(m.imageDataUrl),
              data: dataUrlPayload(m.imageDataUrl),
            },
          },
          { type: 'text', text: m.content || '请分析这张图片。' },
        ] : m.content,
      }));
    return {
      model: config.model,
      system: systemMsg?.content ?? '',
      messages: chatMsgs,
      stream,
      max_tokens: 2048,
    };
  }
  return {
    model: config.model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.imageDataUrl
        ? [
          { type: 'text', text: m.content || '请分析这张图片。' },
          { type: 'image_url', image_url: { url: m.imageDataUrl } },
        ]
        : m.content,
    })),
    stream,
  };
}

function dataUrlMime(dataUrl: string) {
  return dataUrl.match(/^data:([^;]+);base64,/)?.[1] ?? 'image/png';
}

function dataUrlPayload(dataUrl: string) {
  return dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : dataUrl;
}

function buildVisionBody(imageBase64: string, prompt: string, config: ApiConfig) {
  const imageUrl = `data:image/png;base64,${imageBase64}`;
  if (config.provider === 'anthropic') {
    return {
      model: config.model,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    };
  }
  return {
    model: config.model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl } },
          { type: 'text', text: prompt },
        ],
      },
    ],
  };
}

export function parseSSELine(line: string): string[] {
  const tokens: string[] = [];
  if (!line.startsWith('data: ')) return tokens;
  const data = line.slice(6).trim();
  if (data === '[DONE]') return tokens;

  try {
    const parsed = JSON.parse(data);
    const content = parsed.choices?.[0]?.delta?.content;
    if (content) tokens.push(content);
  } catch {
    // Skip malformed SSE data
  }
  return tokens;
}

function createAiError(e: unknown): AiError {
  if (e instanceof TypeError && e.message.includes('fetch')) {
    return { code: 'network', message: '网络连接失败' };
  }
  return { code: 'unknown', message: e instanceof Error ? e.message : String(e) };
}

async function responseToAiError(response: Response): Promise<AiError> {
  const status = response.status;
  const body = await response.text().catch(() => '');
  if (status === 401 || status === 403) {
    return { code: 'auth', status, message: 'API Key 无效或权限不足' };
  }
  if (status === 429) {
    return { code: 'rate_limit', status, message: '请求频率过高，请稍后重试' };
  }
  if (status >= 500) {
    return { code: 'server', status, message: `服务器错误 (${status})` };
  }
  return { code: 'unknown', status, message: body || `HTTP ${status}` };
}
