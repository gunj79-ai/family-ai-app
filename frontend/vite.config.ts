import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',

      // Dynamic manifest served by Express — disable static generation
      manifest: false,

      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],

  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },

  server: {
    port: 5173,
    middlewareMode: false,
    // Only use proxy for localhost development
    // For network access, frontend will use VITE_API_BASE_URL
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Disable proxy if accessing from different host
        bypass(req, res, options) {
          const host = req.headers.host;
          if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
            return req.url; // bypass proxy, use fetch instead
          }
        },
      },
    },
  },

  build: {
    outDir: '../backend/public',
    emptyOutDir: true,
  },
});
