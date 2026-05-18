import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

const packageJson = JSON.parse(
  fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version?: string }

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version ?? '0.0.0'),
    __OPTIMIZED_PET_ASSETS__: JSON.stringify(command === 'build'),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'vendor-react';
          }
          if (id.includes('/framer-motion/') || id.includes('/motion-dom/') || id.includes('/motion-utils/')) {
            return 'vendor-motion';
          }
          if (id.includes('/react-markdown/') || id.includes('/remark-gfm/') || id.includes('/rehype-highlight/')) {
            return 'vendor-markdown';
          }
          if (id.includes('/lucide-react/') || id.includes('/radix-ui/') || id.includes('/@radix-ui/')) {
            return 'vendor-ui';
          }
          if (id.includes('/date-fns/') || id.includes('/zustand/') || id.includes('/zod/')) {
            return 'vendor-data';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tauri-apps/api/core': path.resolve(__dirname, './src/electron-shims/core.ts'),
      '@tauri-apps/api/event': path.resolve(__dirname, './src/electron-shims/event.ts'),
      '@tauri-apps/api/window': path.resolve(__dirname, './src/electron-shims/window.ts'),
      '@tauri-apps/plugin-dialog': path.resolve(__dirname, './src/electron-shims/dialog.ts'),
    },
  },
}))
