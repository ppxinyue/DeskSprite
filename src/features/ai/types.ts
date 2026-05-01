export type Provider = 'openai' | 'anthropic' | 'groq' | 'custom';

export interface ApiConfig {
  id: number;
  provider: Provider;
  baseUrl: string;
  model: string;
  apiKey: string;
  isDefault: boolean;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  imageUrl?: string;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
}

export interface VisionRequest {
  imageBase64: string;
  prompt?: string;
}

export type AiErrorCode = 'network' | 'auth' | 'rate_limit' | 'server' | 'unknown';

export interface AiError {
  code: AiErrorCode;
  status?: number;
  message: string;
}

export interface ChatResponse {
  content: string;
  inputTokens?: number;
  outputTokens?: number;
}
