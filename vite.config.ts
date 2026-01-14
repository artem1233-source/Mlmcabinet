import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './attached_assets'),
      'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react'),
    },
    dedupe: ['lucide-react', 'react', 'react-dom', '@radix-ui/react-slot'],
  },
  optimizeDeps: {
    include: ['lucide-react', 'react', 'react-dom'],
    force: true,
  },
  build: {
    target: 'esnext',
    outDir: 'build',
  },
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
