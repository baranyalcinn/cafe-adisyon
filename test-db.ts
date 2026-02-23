import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import Database from 'better-sqlite3'
import { PrismaClient } from './src/generated/prisma/client'

const sqlite = new Database('./prisma/dev.db')
const adapter = new PrismaBetterSqlite3(sqlite)
const prisma = new PrismaClient({ adapter })

async function main() {
  const t = await prisma.$queryRawUnsafe(
    `SELECT typeof("createdAt") as type, "createdAt" as val FROM "Order" LIMIT 1`
  )
  console.log('Order createdAt type:', t)
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
