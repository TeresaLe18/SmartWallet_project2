import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        // Forward Set-Cookie from backend so HttpOnly refresh token works in dev
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            const cookies = proxyRes.headers['set-cookie'];
            if (Array.isArray(cookies)) {
              proxyRes.headers['set-cookie'] = cookies.map((cookie) =>
                cookie
                  .replace(/;?\s*secure/gi, '')
                  .replace(/;?\s*domain=[^;]+/gi, '')
              );
            }
          });
        },
      },
    },
  },
});
