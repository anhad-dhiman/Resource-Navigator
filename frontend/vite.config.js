import http from 'node:http';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In development, /api and /health are proxied to the Express backend, so the
// browser talks to one origin and no CORS setup is needed locally.
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// A fresh connection per proxied request. Reusing idle connections let the proxy
// pick one the backend had just closed, failing the first search with ECONNRESET.
const backend = { target: BACKEND_URL, agent: new http.Agent({ keepAlive: false }) };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': backend,
      '/health': backend,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: false,
  },
});
