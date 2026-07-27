import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  root: 'presentation',
  plugins: [vue()],
  server: {
    port: 1420,
    strictPort: true,
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler'
      }
    }
  },
  logLevel: 'warn',
})
