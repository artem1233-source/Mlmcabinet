import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  // Полностью игнорировать папку supabase
  exclude: ['**/supabase/**'],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: [
        /^node:/,  // Exclude all node: imports
      ],
    },
  },
  // Exclude server-side code from scanning and build
  optimizeDeps: {
    exclude: ['supabase'],
    entries: [
      'index.html',
      'src/**/*.{ts,tsx}',
      'App.tsx',
      'AppRu.tsx',
      'components/**/*.{ts,tsx}',
      '!supabase/**/*',
      '!**/supabase/**/*',
    ],
  },
  server: {
    fs: {
      deny: ['**/supabase/**'],
    },
  },
});