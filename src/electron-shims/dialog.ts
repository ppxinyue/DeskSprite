export function open(options: {
  multiple?: boolean;
  filters?: Array<{ name: string; extensions: string[] }>;
}): Promise<string | string[] | null> {
  if (!window.deskSprite) return Promise.resolve(null);
  return window.deskSprite.openDialog(options);
}
