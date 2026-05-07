const LOCAL_API_KEY_PREFIX = 'local:v1:';
const INTERNAL_ERROR_MARKERS = [
  '未找到已保存的 API Key',
  '缺少 API Key',
  'API Key 为空',
  'No matching entry found in secure storage',
];

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

export async function resolveStoredApiKey(apiKey: string | null | undefined) {
  return decodeLocalApiKey(apiKey).trim();
}
