import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'
import { PrismaClient } from '../src/generated/prisma/client'

// Database path for standalone execution
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')

// Create client with better-sqlite3 adapter
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

async function softReset(): Promise<void> {
  console.log('🔄 Soft Reset: Transactional data cleaning...')
  console.log(`Target database: ${dbPath}`)

  try {
    await prisma.$connect()

    // Delete only transactional data - keep products, categories, tables
    console.log('Deleting transactions...')
    await prisma.transaction.deleteMany()

    console.log('Deleting order items...')
    await prisma.orderItem.deleteMany()

    console.log('Deleting orders...')
    await prisma.order.deleteMany()

    console.log('Deleting daily summaries (Z-Reports)...')
    await prisma.dailySummary.deleteMany()

    console.log('Deleting activity logs...')
    await prisma.activityLog.deleteMany()

    console.log('')
    console.log('✅ Soft reset complete!')
    console.log('   - Orders: Cleared')
    console.log('   - Transactions: Cleared')
    console.log('   - Z-Reports: Cleared')
    console.log('   - Activity Logs: Cleared')
    console.log('   - Products: Kept ✓')
    console.log('   - Categories: Kept ✓')
    console.log('   - Tables: Kept ✓')
  } catch (error) {
    console.error('Error during soft reset:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

softReset()
