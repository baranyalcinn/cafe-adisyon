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
          '@prisma/client',
          '@prisma/client-runtime-utils',
          '@prisma/adapter-libsql',
          '@prisma/driver-adapter-utils',
          'async-mutex',
          'promise-limit',
          'js-base64',
          'libsql',
          '@libsql/client',
          '@libsql/core'
        ]
      })
    ],
    build: {
      commonjsOptions: {
        ignoreDynamicRequires: true
      },
      rollupOptions: {
        external: ['@libsql/win32-x64-msvc', 'bufferutil', 'utf-8-validate', 'detect-libc']
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
