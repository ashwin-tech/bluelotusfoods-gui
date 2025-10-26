import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/', // Ensure assets are loaded from root, not relative to current path
  plugins: [react(), tailwindcss()],
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
