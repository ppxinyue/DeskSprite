import { invoke } from '@tauri-apps/api/core';

export async function saveApiKey(keyringRef: string, key: string): Promise<void> {
  await invoke('save_api_key', { keyringRef, key });
}

export async function getApiKey(keyringRef: string): Promise<string> {
  return await invoke<string>('get_api_key', { keyringRef });
}

export async function deleteApiKey(keyringRef: string): Promise<void> {
  await invoke('delete_api_key', { keyringRef });
}

export function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}
