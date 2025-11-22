import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Vercel может использовать environment variable для output directory
const outputDir = process.env.OUTPUT_DIR || 'dist';

export default defineConfig({
  root: process.cwd(),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  build: {
    outDir: outputDir,
    emptyOutDir: true,
    sourcemap: true,
  },
});