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
      // Logger not available yet during db init, use console for first-run message
      fs.copyFileSync(initialDbPath, dbPath)
    } else {
      console.error('Initial database file not found at:', initialDbPath)
    }
  } catch (error) {
    console.error('Failed to copy initial database:', error)
  }
}

// Database path logged at initialization (console ok here, before logger available)

// Create Prisma adapter with LibSQL (Prisma 7+ compatible)
const adapter = new PrismaLibSql({
  url: `file:${dbPath}`
})

// Create Prisma client with adapter
const prisma = new PrismaClient({ adapter })

// --- Sequential Write Queue for SQLite ---
// Since SQLite only allows one writer at a time, we use a simple queue to prevent "database is locked" errors.
type DbTask<T> = () => Promise<T>

class TaskQueue {
  private queue: Promise<void> = Promise.resolve()

  async enqueue<T>(task: DbTask<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        try {
          const result = await task()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
    })
  }
}

const writeQueue = new TaskQueue()

/**
 * Execute a database write operation through the sequential queue.
 * Use this for all Prisma CREATE, UPDATE, DELETE or TRANSACTION operations.
 */
export async function dbWrite<T>(task: DbTask<T>): Promise<T> {
  return writeQueue.enqueue(task)
}

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
