import path from 'node:path';
import { Config } from '@remotion/cli/config';

Config.overrideWebpackConfig((currentConfiguration) => ({
  ...currentConfiguration,
  resolve: {
    ...currentConfiguration.resolve,
    alias: {
      ...(currentConfiguration.resolve?.alias ?? {}),
      '@': path.resolve(process.cwd(), 'src'),
      '@tauri-apps/api/core': path.resolve(process.cwd(), 'src/electron-shims/core.ts'),
      '@tauri-apps/api/event': path.resolve(process.cwd(), 'src/electron-shims/event.ts'),
      '@tauri-apps/api/window': path.resolve(process.cwd(), 'src/electron-shims/window.ts'),
      '@tauri-apps/plugin-dialog': path.resolve(process.cwd(), 'src/electron-shims/dialog.ts'),
    },
  },
}));
