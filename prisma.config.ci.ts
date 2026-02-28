import path from 'node:path'
import { defineConfig } from 'prisma/config'

// CI build için template.db hedefleyen konfigürasyon.
// prisma db push --config prisma.config.ci.ts
const dbPath = path.join(process.cwd(), 'prisma', 'template.db').replace(/\\/g, '/')

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: `file:${dbPath}`
  }
})
