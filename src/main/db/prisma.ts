import { PrismaClient } from '../../generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { app } from 'electron'
import path from 'path'
import * as fs from 'fs'

// Get the database path - in production use userData, in dev use project root
const isDev = process.env.NODE_ENV === 'development'
const dbPath = isDev
  ? path.join(process.cwd(), 'prisma', 'dev.db')
  : path.join(app.getPath('userData'), 'caffio.db')

// First Run Logic: Copy initial DB if missing in production
if (!isDev && !fs.existsSync(dbPath)) {
  try {
    const initialDbPath = path.join(process.resourcesPath, 'initial.db')
    if (fs.existsSync(initialDbPath)) {
      console.log('First run: Copying initial database...')
      fs.copyFileSync(initialDbPath, dbPath)
    } else {
      console.error('Initial database file not found at:', initialDbPath)
    }
  } catch (error) {
    console.error('Failed to copy initial database:', error)
  }
}

// Create Prisma adapter with LibSQL (Prisma 7+ compatible)
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
