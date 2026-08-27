import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') ) return 'vendor'
            if (id.includes('@dnd-kit')) return 'dnd'
            if (id.includes('chrono-node')) return 'chrono'
            if (id.includes('marked') || id.includes('dompurify')) return 'markdown'
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 40, functions: 30, branches: 20 },
    },
  },
})
