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

// Create Prisma adapter with LibSQL (Prisma 7+ compatible)
const adapter = new PrismaLibSql({
  url: `file:${dbPath}`
})

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

// Write operations that should go through the sequential queue
const WRITE_OPERATIONS = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany'
])

// Create base Prisma client
const basePrisma = new PrismaClient({ adapter })

// Extend Prisma with automatic write queueing via $allModels query interceptor
const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ operation, args, query }) {
        if (WRITE_OPERATIONS.has(operation)) {
          return writeQueue.enqueue(() => query(args))
        }
        return query(args)
      }
    }
  }
})

// Optimize SQLite performance
;(async () => {
  try {
    await basePrisma.$executeRawUnsafe('PRAGMA journal_mode = WAL;')
    await basePrisma.$executeRawUnsafe('PRAGMA synchronous = NORMAL;')
    await basePrisma.$executeRawUnsafe('PRAGMA cache_size = -64000;')
    await basePrisma.$executeRawUnsafe('PRAGMA temp_store = MEMORY;')
    await basePrisma.$executeRawUnsafe('PRAGMA busy_timeout = 5000;')
    await basePrisma.$executeRawUnsafe('PRAGMA mmap_size = 67108864;')
  } catch (error) {
    console.error('Failed to set SQLite pragmas:', error)
  }
})()

export { prisma, basePrisma, dbPath }
