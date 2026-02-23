import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'

export class DBMaintenance {
  private backupDir: string

  constructor() {
    const isDev = process.env.NODE_ENV === 'development'
    const baseDir = isDev ? process.cwd() : app.getPath('userData')
    this.backupDir = path.join(baseDir, 'backups')

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true })
    }
  }

  public async runMaintenance(): Promise<void> {
    try {
      logger.info('DBMaintenance', 'Starting maintenance tasks...')
      await this.runMigrations()
      await this.walCheckpoint()
      await this.runVacuum()
      await this.createBackup()
      this.cleanupOldBackups()
      logger.info('DBMaintenance', 'Maintenance completed successfully.')
    } catch (error) {
      logger.error('DBMaintenance', error)
    }
  }

  /**
   * Auto-migration: applies schema changes to existing databases.
   * Each migration is idempotent — safe to run on every startup.
   * When adding a new schema change, append a new migration entry below.
   */
  private async runMigrations(): Promise<void> {
    try {
      logger.debug('DBMaintenance', 'Running auto-migrations...')

      // Migration 1: Add updatedAt column to Order table
      await this.addColumnIfNotExists('Order', 'updatedAt', 'DATETIME')

      // Migration 2: Add isDeleted column to Category table (soft delete support)
      await this.addColumnIfNotExists('Category', 'isDeleted', 'BOOLEAN DEFAULT 0')

      // Migration 3: Add isDeleted column to Product table (soft delete support)
      await this.addColumnIfNotExists('Product', 'isDeleted', 'BOOLEAN DEFAULT 0')

      // Migration 4: Add paymentMethod column to Expense table
      await this.addColumnIfNotExists('Expense', 'paymentMethod', "TEXT DEFAULT 'CASH'")

      // Comprehensive index sync — ensures ALL schema.prisma indexes exist
      // Each statement is idempotent (IF NOT EXISTS), safe on every startup
      const indexes = [
        // Product indexes
        'CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId")',
        'CREATE INDEX IF NOT EXISTS "Product_isFavorite_idx" ON "Product"("isFavorite")',
        'CREATE INDEX IF NOT EXISTS "Product_isDeleted_idx" ON "Product"("isDeleted")',
        'CREATE INDEX IF NOT EXISTS "Product_name_idx" ON "Product"("name")',

        // Category indexes
        'CREATE INDEX IF NOT EXISTS "Category_isDeleted_idx" ON "Category"("isDeleted")',

        // Order indexes
        'CREATE INDEX IF NOT EXISTS "Order_tableId_status_idx" ON "Order"("tableId", "status")',
        'CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status")',
        'CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt")',

        // OrderItem indexes
        'CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId")',
        'CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId")',
        'CREATE INDEX IF NOT EXISTS "OrderItem_isPaid_idx" ON "OrderItem"("isPaid")',

        // Transaction indexes
        'CREATE INDEX IF NOT EXISTS "Transaction_orderId_idx" ON "Transaction"("orderId")',
        'CREATE INDEX IF NOT EXISTS "Transaction_createdAt_idx" ON "Transaction"("createdAt")',
        'CREATE INDEX IF NOT EXISTS "Transaction_paymentMethod_idx" ON "Transaction"("paymentMethod")',

        // DailySummary indexes
        'CREATE INDEX IF NOT EXISTS "DailySummary_date_idx" ON "DailySummary"("date")',

        // ActivityLog indexes
        'CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt")',
        'CREATE INDEX IF NOT EXISTS "ActivityLog_action_idx" ON "ActivityLog"("action")',

        // Expense indexes
        'CREATE INDEX IF NOT EXISTS "Expense_createdAt_idx" ON "Expense"("createdAt")',

        // MonthlyReport indexes
        'CREATE INDEX IF NOT EXISTS "MonthlyReport_monthDate_idx" ON "MonthlyReport"("monthDate")'
      ]

      for (const sql of indexes) {
        await prisma.$executeRawUnsafe(sql)
      }

      logger.debug('DBMaintenance', `Auto-migrations completed. ${indexes.length} indexes synced.`)
    } catch (error) {
      // Migrations failing should NOT block app startup
      logger.error('DBMaintenance Migrations', error)
    }
  }

  /**
   * Adds a column to a table if it doesn't already exist.
   * SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we check pragma first.
   */
  private async addColumnIfNotExists(table: string, column: string, type: string): Promise<void> {
    try {
      const columns: Array<{ name: string }> = await prisma.$queryRawUnsafe(
        `PRAGMA table_info("${table}")`
      )
      const exists = columns.some((c) => c.name === column)
      if (!exists) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}`)
        logger.debug('DBMaintenance', `Added column ${table}.${column}`)
      }
    } catch (error) {
      logger.error(`DBMaintenance AddColumn ${table}.${column}`, error)
    }
  }

  /**
   * Forces WAL (Write-Ahead Log) contents into the main database file and truncates the WAL.
   * Without this, the -wal file can grow unbounded in always-on Electron apps
   * where Prisma holds a persistent connection.
   */
  private async walCheckpoint(): Promise<void> {
    try {
      await prisma.$executeRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)')
      logger.debug('DBMaintenance', 'WAL checkpoint executed (TRUNCATE).')
    } catch (error) {
      logger.error('DBMaintenance WAL Checkpoint', error)
    }
  }

  private async shouldVacuum(): Promise<boolean> {
    const marker = path.join(this.backupDir, '.last-vacuum')
    try {
      const stat = await fs.promises.stat(marker)
      const daysSince = (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60 * 24)
      return daysSince >= 7
    } catch {
      return true // No marker file = never vacuumed
    }
  }

  private async runVacuum(): Promise<void> {
    try {
      if (!(await this.shouldVacuum())) {
        logger.debug('DBMaintenance', 'VACUUM skipped (last run < 7 days ago)')
        return
      }
      await prisma.$executeRawUnsafe('VACUUM;')
      await fs.promises.writeFile(path.join(this.backupDir, '.last-vacuum'), '')
      logger.debug('DBMaintenance', 'VACUUM executed.')
    } catch (error) {
      logger.error('DBMaintenance Vacuum', error)
      throw error
    }
  }

  private async createBackup(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = path.join(this.backupDir, `backup-${timestamp}.db`)

      // Use VACUUM INTO for a consistent snapshot (safe during active writes)
      await prisma.$executeRawUnsafe(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`)
      logger.debug('DBMaintenance', `Backup created at ${backupPath}`)
    } catch (error) {
      logger.error('DBMaintenance Backup', error)
      throw error
    }
  }

  private cleanupOldBackups(): void {
    try {
      // Keep only last 5 backups
      const files = fs
        .readdirSync(this.backupDir)
        .filter((f) => f.startsWith('backup-') && f.endsWith('.db'))
        .map((f) => ({
          name: f,
          time: fs.statSync(path.join(this.backupDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time)

      if (files.length > 5) {
        files.slice(5).forEach((file) => {
          fs.unlinkSync(path.join(this.backupDir, file.name))
          logger.debug('DBMaintenance', `Deleted old backup ${file.name}`)
        })
      }
    } catch (error) {
      logger.error('DBMaintenance Cleanup', error)
    }
  }
}

export const dbMaintenance = new DBMaintenance()
