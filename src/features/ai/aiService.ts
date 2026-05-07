import type { ApiConfig, Message, AiError } from './types';
import { resolveStoredApiKey } from '@/lib/apiKeyStorage';
import { invoke } from '@tauri-apps/api/core';

export async function* streamChat(
  messages: Message[],
  config: ApiConfig & { keyringRef?: string | null },
): AsyncGenerator<string, void, undefined> {
  const apiKey = await resolveStoredApiKey(config.apiKey, config.keyringRef);
  try {
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
    throw createAiError(e);
  }
}

export async function vision(
  imageBase64: string,
  config: ApiConfig & { keyringRef?: string | null },
  prompt = '请详细描述并分析图片中的内容。',
): Promise<string> {
  const apiKey = await resolveStoredApiKey(config.apiKey, config.keyringRef);
  try {
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
    throw createAiError(e);
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

function createAiError(e: unknown): AiError {
  if (e instanceof TypeError && e.message.includes('fetch')) {
    return { code: 'network', message: '网络连接失败' };
  }
  return { code: 'unknown', message: e instanceof Error ? e.message : String(e) };
}
