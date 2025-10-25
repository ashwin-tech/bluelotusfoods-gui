import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/quotes/',
  plugins: [react(), tailwindcss()],
  // Load env vars from the monorepo root (../../)
  // so a single bluelotusfoods-gui/.env works during local dev
  envDir: '../../',
  server: {
    host: true, // Allow external access
    port: 5173, // Fixed port for quote-form app
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Ensure all routes fallback to index.html
      input: {
        main: 'index.html',
      },
    },
  },
});
