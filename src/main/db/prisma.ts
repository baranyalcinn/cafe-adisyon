import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
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

// Fix Prisma BetterSQLite3 Adapter missing DATABASE_URL issue
process.env.DATABASE_URL = `file:${dbPath}`

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// Optimize SQLite performance
;(async () => {
  try {
    // 1. En kritik: WAL Mode (Write-Ahead Logging) - Sağlamlık ve concurrency için
    await prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL')
    // 2. Senkronizasyon türü (WAL ile NORMAL kullanımı %99 güvenlidir ve çok hızlıdır)
    await prisma.$executeRawUnsafe('PRAGMA synchronous = NORMAL')
    // 3. Cache boyutu (~32MB RAM kullanır, performansı çok artırır)
    await prisma.$executeRawUnsafe('PRAGMA cache_size = -32000')
    // 4. Geçici tabloları bellekte tut (RAM üzerinde işlem yapar)
    await prisma.$executeRawUnsafe('PRAGMA temp_store = MEMORY')
    // 5. Veritabanı kilidini bekleme süresi (Database Is Locked hatasını önler)
    await prisma.$executeRawUnsafe('PRAGMA busy_timeout = 5000')
    // 6. Memory-Mapped I/O (~16MB mmap ile okumaları hızlandırır)
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
