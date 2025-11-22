import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Читаем из environment variable (для Vercel) или используем build по умолчанию
const outputDir = process.env.OUTPUT_DIR || 'build';

console.log('🔧 Vite will output to:', outputDir);

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