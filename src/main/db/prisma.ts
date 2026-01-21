import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { app } from 'electron'
import path from 'path'

// Get the database path - in production use userData, in dev use project root
const isDev = !app.isPackaged
const dbPath = isDev
  ? path.join(process.cwd(), 'prisma', 'dev.db')
  : path.join(app.getPath('userData'), 'caffio.db')

// Create Prisma adapter with simplified constructor (v6.6.0+)
const adapter = new PrismaLibSql({
  url: `file:${dbPath}`
})

// Create Prisma client with adapter
const prisma = new PrismaClient({ adapter })

// Optimize SQLite performance
;(async () => {
  try {
    await prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL;')
    await prisma.$executeRawUnsafe('PRAGMA synchronous = NORMAL;')
    await prisma.$executeRawUnsafe('PRAGMA cache_size = -64000;')
    await prisma.$executeRawUnsafe('PRAGMA temp_store = MEMORY;')
  } catch (error) {
    console.error('Failed to set SQLite pragmas:', error)
  }
})()

export { prisma, dbPath }
