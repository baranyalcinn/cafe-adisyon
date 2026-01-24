import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          '@electron-toolkit/utils',
          'zod',
          'date-fns',
          'zustand',
          'clsx',
          'tailwind-merge',
          'class-variance-authority'
          // Externalizing DB libs to prevent bundle corruption and ensure native binary access
          // '@prisma/client',
          // '@prisma/adapter-libsql',
          // '@libsql/client',
          // '@libsql/core',
          // '@libsql/hrana-client',
          // 'libsql',
          // '@libsql/isomorphic-fetch',
          // '@libsql/isomorphic-ws',
          // 'ws',
          // '@neon-rs/load',
          // 'detect-libc',
          // 'cross-fetch',
          // 'node-fetch',
          // 'data-uri-to-buffer',
          // 'fetch-blob',
          // 'formdata-polyfill',
          // 'js-base64',
          // 'promise-limit',
          // 'async-mutex',
          // 'tslib',
          // 'bufferutil',
          // 'utf-8-validate'
        ]
      })
    ],
    build: {
      commonjsOptions: {
        ignoreDynamicRequires: true
      },
      rollupOptions: {
        external: ['@libsql/win32-x64-msvc', 'better-sqlite3']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['@electron-toolkit/preload'] })]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
