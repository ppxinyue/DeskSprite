import type { ApiConfig, Message, AiError } from './types';
import { BUILTIN_QUOTA_EXHAUSTED_MESSAGE } from './defaultModel';
import { resolveStoredApiKey } from '@/lib/apiKeyStorage';
import { getCloudSyncStatus } from '@/lib/db';
import { invoke } from '@tauri-apps/api/core';

export async function* streamChat(
  messages: Message[],
  config: ApiConfig & { keyringRef?: string | null },
): AsyncGenerator<string, void, undefined> {
  try {
    if (config.id === -1) {
      const content = await invoke<string>('builtin_chat_completion', {
        request: { messages, deviceId: await getBuiltinDeviceId() },
      });
      if (content) yield content;
      return;
    }
    const apiKey = await resolveStoredApiKey(config.apiKey, config.keyringRef);
    const content = await invoke<string>('chat_completion', {
      request: {
        provider: config.provider,
        baseUrl: config.baseUrl,
        model: config.model,
        apiKey,
        messages,
      },
    });
    if (content) yield content;
  } catch (e) {
    throw toError(createAiError(e, config.id === -1));
  }
}

export async function vision(
  imageBase64: string,
  config: ApiConfig & { keyringRef?: string | null },
  prompt = '请详细描述并分析图片中的内容。',
): Promise<string> {
  try {
    if (config.id === -1) {
      return await invoke<string>('builtin_chat_completion', {
        request: {
          messages: [
            {
              role: 'user',
              content: prompt,
              imageDataUrl: `data:image/png;base64,${imageBase64}`,
            },
          ],
          deviceId: await getBuiltinDeviceId(),
        },
      });
    }
    const apiKey = await resolveStoredApiKey(config.apiKey, config.keyringRef);
    return await invoke<string>('chat_completion', {
      request: {
        provider: config.provider,
        baseUrl: config.baseUrl,
        model: config.model,
        apiKey,
        messages: [
          {
            role: 'user',
            content: prompt,
            imageDataUrl: `data:image/png;base64,${imageBase64}`,
          },
        ],
      },
    });
  } catch (e) {
    throw toError(createAiError(e, config.id === -1));
  }
}

async function getBuiltinDeviceId() {
  try {
    return (await getCloudSyncStatus()).deviceId;
  } catch {
    return '';
  }
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

function createAiError(e: unknown, usingBuiltin = false): AiError {
  if (e instanceof TypeError && e.message.includes('fetch')) {
    return { code: 'network', message: '网络连接失败' };
  }
  const message = normalizeErrorMessage(e);
  const status = extractHttpStatus(message);
  if (usingBuiltin && isQuotaLimitError(message, status)) {
    return { code: 'rate_limit', status, message: BUILTIN_QUOTA_EXHAUSTED_MESSAGE };
  }
  return {
    code: status === 401 || status === 403 ? 'auth' : status === 429 ? 'rate_limit' : 'unknown',
    status,
    message,
  };
}

function toError(error: AiError) {
  const next = new Error(error.message);
  next.name = error.code;
  return next;
}

function normalizeErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object') {
    const object = e as Record<string, unknown>;
    const direct = object.message ?? object.error ?? object.reason ?? object.detail;
    if (typeof direct === 'string') return direct;
    if (direct && typeof direct === 'object') {
      const nested = direct as Record<string, unknown>;
      if (typeof nested.message === 'string') return nested.message;
      if (typeof nested.error === 'string') return nested.error;
    }
    try {
      return JSON.stringify(e);
    } catch {
      return '未知错误';
    }
  }
  return String(e);
}

function extractHttpStatus(message: string): number | undefined {
  const match = message.match(/\bHTTP\s+(\d{3})\b/i);
  const status = match ? Number(match[1]) : NaN;
  return Number.isFinite(status) ? status : undefined;
}

function isQuotaLimitError(message: string, status?: number) {
  const text = message.toLowerCase();
  return (
    status === 429 ||
    /quota|spending limit|monthly limit|usage limit|rate limit|insufficient_quota|billing|exceeded/.test(text)
  );
}
