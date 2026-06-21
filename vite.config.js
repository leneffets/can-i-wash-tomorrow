import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.vite',
  base: '/can-i-wash-tomorrow/', // Change to your repo name if different
});
