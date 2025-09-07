import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/can-i-wash-tomorrow/', // Change to your repo name if different
});
