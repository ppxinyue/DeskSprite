export function emit(channel: string, payload?: unknown): Promise<void> {
  if (!window.deskCat) return Promise.resolve();
  return window.deskCat.emit(channel, payload);
}

export function listen<T = unknown>(
  channel: string,
  callback: (event: { event: string; payload: T }) => void,
): Promise<() => void> {
  if (!window.deskCat) return Promise.resolve(() => {});
  return window.deskCat.listen<T>(channel, callback);
}
