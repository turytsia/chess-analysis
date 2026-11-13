import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const OPENING_BOOK_CHUNK_LIMIT_KB = 650;
const CROSS_ORIGIN_ISOLATION_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
} as const;

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), crossOriginIsolation()],
  server: {
    port: 3002,
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

/*
 * The dev server must send the isolation headers on every response. Vite's
 * `server.headers` leaves them out of "304 Not Modified" answers, and Safari
 * then refuses to start a worker whose script was revalidated from its cache,
 * which breaks every engine after the first one.
 */
function crossOriginIsolation(): Plugin {
  return {
    name: 'cross-origin-isolation',
    configureServer(server) {
      server.middlewares.use((_request, response, next) => {
        Object.entries(CROSS_ORIGIN_ISOLATION_HEADERS).forEach(
          ([name, value]) => response.setHeader(name, value)
        );
        next();
      });
    },
  };
}
