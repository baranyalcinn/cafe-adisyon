import path from 'node:path'
import { defineConfig } from 'prisma/config'

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: `file:${dbPath}`
  },
  // @ts-expect-error - migrate is needed for LibSQL adapter but missing from types
  migrate: {
    adapter: async () => {
      const { PrismaLibSql } = await import('@prisma/adapter-libsql')
      return new PrismaLibSql({ url: `file:${dbPath}` })
    }
  }
})
