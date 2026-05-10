import type { Theme } from '@/features/settings/settingsStore';

export type ThemeClassAction = 'add-dark' | 'remove-dark' | 'defer';

export function resolveInitialTheme(theme: unknown, prefersDark: boolean): boolean {
  return theme === 'dark' || (theme === 'system' && prefersDark);
}

export function getThemeClassAction({
  loaded,
  theme,
  prefersDark,
}: {
  loaded: boolean;
  theme: Theme;
  prefersDark: boolean;
}): ThemeClassAction {
  if (!loaded) return 'defer';
  return resolveInitialTheme(theme, prefersDark) ? 'add-dark' : 'remove-dark';
}

export function readStoredThemeFromRawStore(raw: string | null): Theme {
  if (!raw) return 'system';
  try {
    const store = JSON.parse(raw);
    const value = store?.settings?.theme;
    if (typeof value !== 'string') return 'system';
    let parsed: unknown = value;
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value;
    }
    return parsed === 'light' || parsed === 'dark' || parsed === 'system' ? parsed : 'system';
  } catch {
    return 'system';
  }
}

export function shouldDeferWindowContent(label: string, loaded: boolean): boolean {
  return (label === 'settings' || label === 'chat') && !loaded;
}
