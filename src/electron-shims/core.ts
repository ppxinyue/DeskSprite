export function invoke<T = unknown>(command: string, args?: Record<string, unknown>): Promise<T> {
  return window.deskSprite.invoke<T>(command, args);
}

export function convertFileSrc(path: string): string {
  return window.deskSprite.convertFileSrc(path);
}
