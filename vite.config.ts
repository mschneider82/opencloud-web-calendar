import { defineConfig } from '@opencloud-eu/extension-sdk'

export default defineConfig({
  name: 'web-calendar',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'js/web-calendar.js',
        chunkFileNames: 'js/chunks/[name].js',
        manualChunks: undefined,
        inlineDynamicImports: true
      }
    }
  }
})
