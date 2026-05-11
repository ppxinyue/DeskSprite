export function invoke<T = unknown>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!window.deskSprite) {
    if (command === 'get_theme_class_action') return Promise.resolve('none' as T);
    if (command === 'set_window_content_ready') return Promise.resolve(undefined as T);
    if (command === 'read_timeline_active_window') return Promise.reject(new Error('desktop bridge unavailable'));
    return Promise.resolve(undefined as T);
  }
  return window.deskSprite.invoke<T>(command, args);
}

export function convertFileSrc(path: string): string {
  if (!window.deskSprite) return path;
  return window.deskSprite.convertFileSrc(path);
}
