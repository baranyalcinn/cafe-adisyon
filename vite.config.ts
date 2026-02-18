import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  root: 'src/renderer',
  server: {
    port: 5173,
    strictPort: true
  },
  envDir: '../..',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer/src'),
      '@shared': path.resolve(__dirname, './src/shared')
    }
  },
  build: {
    outDir: '../../out/renderer',
    emptyOutDir: true
  }
})
