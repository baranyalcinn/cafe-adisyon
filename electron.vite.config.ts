/// <reference types="vitest" />
import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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
          '@prisma/client',
          '@prisma/client-runtime-utils',
          '@prisma/adapter-libsql',
          '@prisma/driver-adapter-utils',
          '@libsql/client',
          '@libsql/core',
          '@libsql/hrana-client',
          '@libsql/isomorphic-ws',
          'js-base64',
          'ws',
          'cross-fetch',
          'node-fetch',
          'node-fetch-native',
          'whatwg-url',
          'webidl-conversions',
          'tr46',
          'web-streams-polyfill',
          'data-uri-to-buffer',
          'fetch-blob',
          'formdata-polyfill',
          'async-mutex',
          'promise-limit',
          'node-domexception'
        ]
      },
      commonjsOptions: {
        ignoreDynamicRequires: true
      },
      rollupOptions: {
        external: [
          'libsql',
          '@libsql/win32-x64-msvc',
          'bufferutil',
          'utf-8-validate',
          'detect-libc'
        ]
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
              // Let other dependencies be handled by default splitting
            }
          }
        }
      }
    }
  }
})
