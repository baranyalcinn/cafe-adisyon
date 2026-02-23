import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import Database from 'better-sqlite3'
import { app } from 'electron'
import * as fs from 'fs'
import path from 'path'
import { PrismaClient } from '../../generated/prisma/client'

// Get the database path - in production use userData, in dev use project root
const isDev = process.env.NODE_ENV === 'development'
const dbPath = isDev
  ? path.join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/')
  : path.join(app.getPath('userData'), 'caffio.db').replace(/\\/g, '/')

// First Run Logic: Copy initial DB if missing in production
if (!isDev && !fs.existsSync(dbPath)) {
  try {
    const initialDbPath = path.join(process.resourcesPath, 'initial.db')
    if (fs.existsSync(initialDbPath)) {
      fs.copyFileSync(initialDbPath, dbPath)
    } else {
      console.error('Initial database file not found at:', initialDbPath)
    }
  } catch (error) {
    console.error('Failed to copy initial database:', error)
  }
}

// Create Prisma client with better-sqlite3 adapter
// Native C++ driver — no TaskQueue needed, locking handled at driver level
const sqlite = new Database(dbPath)
const adapter = new PrismaBetterSqlite3(sqlite)
const prisma = new PrismaClient({ adapter })

// Optimize SQLite performance
;(async () => {
  try {
    await prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL')
    await prisma.$executeRawUnsafe('PRAGMA synchronous = NORMAL')
    await prisma.$executeRawUnsafe('PRAGMA cache_size = -64000')
    await prisma.$executeRawUnsafe('PRAGMA temp_store = MEMORY')
    await prisma.$executeRawUnsafe('PRAGMA busy_timeout = 5000')
    await prisma.$executeRawUnsafe('PRAGMA mmap_size = 16777216')
  } catch (error) {
    console.error('Failed to set SQLite pragmas:', error)
  }
})()

// Helper to disconnect DB
export const disconnectDb = async (): Promise<void> => {
  await prisma.$disconnect()
}

export { dbPath, prisma }
