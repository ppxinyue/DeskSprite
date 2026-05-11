export function emit(channel: string, payload?: unknown): Promise<void> {
  if (!window.deskSprite) return Promise.resolve();
  return window.deskSprite.emit(channel, payload);
}

export function listen<T = unknown>(
  channel: string,
  callback: (event: { event: string; payload: T }) => void,
): Promise<() => void> {
  if (!window.deskSprite) return Promise.resolve(() => {});
  return window.deskSprite.listen<T>(channel, callback);
}
