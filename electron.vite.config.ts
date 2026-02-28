/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    plugins: [],
    build: {
      sourcemap: false,
      target: 'node24', // Electron 40 uses Node 24
      // build.externalizeDeps: true → package.json'daki tüm "dependencies"'i otomatik external yapar.
      // Prisma, adapter ve diğer runtime deps böylece bundle'a girmez, node_modules'tan yüklenir.
      externalizeDeps: true,
      commonjsOptions: {
        ignoreDynamicRequires: true
      },
      rollupOptions: {
        // Sadece native .node modüller ve electron burada açıkça belirtilir
        external: ['bufferutil', 'utf-8-validate', 'detect-libc', 'electron', 'better-sqlite3']
      }
    }
  },
  preload: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    plugins: [],
    build: {
      sourcemap: false,
      target: 'node24',
      externalizeDeps: true,
      rollupOptions: {
        // electron devDependencies'de olduğundan externalizeDeps kapsamaz — açıkça belirt
        external: ['electron']
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react(), tailwindcss()],
    build: {
      sourcemap: false,
      target: 'chrome144', // Electron 40 = Chromium 144.0.7559.x (electronjs.org/releases)
      modulePreload: {
        polyfill: false
      },
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id): string | void {
            if (!id.includes('node_modules')) return

            // Grafik kütüphaneleri — ağır, ayrı chunk'ta lazy parse edilsin
            if (id.includes('recharts') || id.includes('/d3-')) return 'vendor-charts'

            // UI primitives — sık değişmez, cache'de kalır
            if (id.includes('@radix-ui') || id.includes('lucide')) return 'vendor-ui'

            // React ekosistemi + state/query — kritik core
            // /react/ path segmenti kullan: preact, @react-aria gibi false positive'leri engeller
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('react-router') ||
              id.includes('@tanstack') ||
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
})
