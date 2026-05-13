export function open(options: {
  multiple?: boolean;
  filters?: Array<{ name: string; extensions: string[] }>;
}): Promise<string | string[] | null> {
  if (!window.deskCat) return Promise.resolve(null);
  return window.deskCat.openDialog(options);
}
