const LOCAL_API_KEY_PREFIX = 'local:v1:';
const INTERNAL_ERROR_MARKERS = [
  '未找到已保存的 API Key',
  '缺少 API Key',
  'API Key 为空',
  'No matching entry found in secure storage',
];

export function normalizeApiKeyText(apiKey: string) {
  return apiKey
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^Bearer\s+/i, '')
    .replace(/\s+/g, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();
}

export function encodeLocalApiKey(apiKey: string) {
  const bytes = new TextEncoder().encode(apiKey);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `${LOCAL_API_KEY_PREFIX}${btoa(binary)}`;
}

export function decodeLocalApiKey(value: string | null | undefined) {
  if (!value) return '';
  if (INTERNAL_ERROR_MARKERS.some((marker) => value.includes(marker))) return '';
  if (!value.startsWith(LOCAL_API_KEY_PREFIX)) return value;
  try {
    const binary = atob(value.slice(LOCAL_API_KEY_PREFIX.length));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    return INTERNAL_ERROR_MARKERS.some((marker) => decoded.includes(marker)) ? '' : decoded;
  } catch {
    return '';
  }
}

export async function resolveStoredApiKey(apiKey: string | null | undefined, keyringRef?: string | null) {
  if (keyringRef) {
    const { getApiKey } = await import('./keychain.ts');
    return normalizeApiKeyText(await getApiKey(keyringRef));
  }
  return normalizeApiKeyText(decodeLocalApiKey(apiKey));
}

export function describeApiKey(apiKey: string | null | undefined, keyringRef?: string | null) {
  if (keyringRef) return 'Key: 已保存于系统安全存储';
  const normalized = normalizeApiKeyText(decodeLocalApiKey(apiKey));
  if (!normalized) return 'Key: 未保存';
  const tail = normalized.slice(-4);
  return `Key: 已保存 · ${normalized.length} 位 · 尾号 ...${tail} · 指纹 ${hashApiKey(normalized)}`;
}

function hashApiKey(value: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
