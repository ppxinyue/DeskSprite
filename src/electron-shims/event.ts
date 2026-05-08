export function emit(channel: string, payload?: unknown): Promise<void> {
  return window.deskSprite.emit(channel, payload);
}

export function listen<T = unknown>(
  channel: string,
  callback: (event: { event: string; payload: T }) => void,
): Promise<() => void> {
  return window.deskSprite.listen<T>(channel, callback);
}
