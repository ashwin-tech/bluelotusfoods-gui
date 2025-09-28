import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Allow external access
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
