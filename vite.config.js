import { defineConfig } from 'vite';

// base './' потрібен, щоб зібраний dist працював усередині Capacitor (file://)
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
});
