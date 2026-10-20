import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // base './' để file build chạy được khi Electron load từ đĩa (file://)
  base: './',
  server: { port: 5173 },
});
