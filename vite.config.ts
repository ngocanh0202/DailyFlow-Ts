import { defineConfig } from 'vite';
// @ts-ignore
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react';
import * as path from 'path';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    outDir: 'dist-react',
  },
  server: {
    port: 5123,
    strictPort: true,
    watch: {
      ignored: ['**/localdata/**']
    }
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
    },
  }
});