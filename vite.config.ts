import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const OPENING_BOOK_CHUNK_LIMIT_KB = 650;
const CROSS_ORIGIN_ISOLATION_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
} as const;

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    port: 3002,
    headers: CROSS_ORIGIN_ISOLATION_HEADERS,
  },
  preview: {
    headers: {},
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: OPENING_BOOK_CHUNK_LIMIT_KB,
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
