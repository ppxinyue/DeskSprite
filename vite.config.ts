import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tauri-apps/api/core': path.resolve(__dirname, './src/electron-shims/core.ts'),
      '@tauri-apps/api/event': path.resolve(__dirname, './src/electron-shims/event.ts'),
      '@tauri-apps/api/window': path.resolve(__dirname, './src/electron-shims/window.ts'),
      '@tauri-apps/plugin-dialog': path.resolve(__dirname, './src/electron-shims/dialog.ts'),
    },
  },
})
