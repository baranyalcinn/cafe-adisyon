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
          'class-variance-authority',
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
      })
    ],
    build: {
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
