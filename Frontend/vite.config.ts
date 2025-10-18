import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Proxy backend requests to the Express server during development
      '/auto-apply': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/status': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});