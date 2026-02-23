/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [],
    build: {
      sourcemap: false,
      target: 'node24', // Electron 40 uses Node 24
      externalizeDeps: {
        exclude: [
          '@electron-toolkit/utils',
          'zod',
          'date-fns',
          'zustand',
          'clsx',
          'tailwind-merge',
          'class-variance-authority',
          // --- PRISMA & ADAPTER BUNDLING ---
          '@prisma/client',
          '@prisma/client-runtime-utils',
          '@prisma/driver-adapter-utils',
          '@prisma/adapter-better-sqlite3',
          'js-base64'
        ]
      },
      commonjsOptions: {
        ignoreDynamicRequires: true
      },
      rollupOptions: {
        // Native modüller (C++) Vite tarafından paketlenemez, external kalmalıdır!
        external: ['bufferutil', 'utf-8-validate', 'detect-libc', 'electron', 'better-sqlite3']
      }
    }
  },
  preload: {
    plugins: [],
    build: {
      sourcemap: false,
      target: 'node24',
      externalizeDeps: {
        exclude: ['@electron-toolkit/preload']
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()],
    build: {
      sourcemap: false,
      target: 'chrome144', // Electron 40 uses Chrome ~134+
      modulePreload: {
        polyfill: false
      },
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          manualChunks(id): string | void {
            if (id.includes('node_modules')) {
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('react-router') ||
                id.includes('framer-motion') ||
                id.includes('@tanstack') ||
                id.includes('lucide') ||
                id.includes('@radix-ui') ||
                id.includes('clsx') ||
                id.includes('tailwind-merge')
              ) {
                return 'vendor-core'
              }
            }
          }
        }
      }
    }
  }
})
