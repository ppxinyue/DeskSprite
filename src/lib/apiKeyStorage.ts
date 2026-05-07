import { getApiKey } from './keychain';

const LOCAL_API_KEY_PREFIX = 'local:v1:';

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
  if (!value.startsWith(LOCAL_API_KEY_PREFIX)) return value;
  try {
    const binary = atob(value.slice(LOCAL_API_KEY_PREFIX.length));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

export async function resolveStoredApiKey(apiKey: string | null | undefined, keyringRef?: string | null) {
  const localKey = decodeLocalApiKey(apiKey);
  if (localKey.trim()) return localKey;
  if (!keyringRef) return '';
  return getApiKey(keyringRef);
}
