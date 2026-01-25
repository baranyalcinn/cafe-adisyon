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
        ]
      })
    ],
    build: {
      commonjsOptions: {
        ignoreDynamicRequires: true
      },
      rollupOptions: {
        external: [
          '@libsql/win32-x64-msvc',
          '@libsql/client',
          '@libsql/core',
          '@libsql/hrana-client',
          '@libsql/isomorphic-fetch',
          '@libsql/isomorphic-ws',
          'libsql',
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
          'bufferutil',
          'utf-8-validate',
          'detect-libc',
          '@prisma/client',
          '@prisma/adapter-libsql',
          'async-mutex',
          'promise-limit'
        ]
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
