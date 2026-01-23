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
          // Prisma client must be BUNDLED (not external) because generated
          // client files import @prisma/client/runtime/* which won't resolve
          // correctly from ASAR in portable builds
          '@prisma/client',
          '@prisma/adapter-libsql',
          '@libsql/client',
          '@libsql/core',
          '@libsql/hrana-client',
          '@libsql/isomorphic-fetch',
          '@libsql/isomorphic-ws',
          'libsql'
        ]
      })
    ],
    build: {
      rollupOptions: {
        external: [
          // Prisma & LibSQL JS parts are now BUNDLED via exclude list above
          'better-sqlite3',
          '@libsql/win32-x64-msvc'
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
