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

      // Optimizasyon: SQLite'a çalışmadan önce memory ve cache düzenlemesi yapmasını söyleyelim
      await prisma.$executeRawUnsafe('PRAGMA optimize;')

      await this.runMigrations()
      await this.walCheckpoint()
      await this.quickCheck()
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
   */
  private async runMigrations(): Promise<void> {
    try {
      logger.debug('DBMaintenance', 'Running auto-migrations...')

      await this.addColumnIfNotExists('Order', 'updatedAt', 'DATETIME')
      await this.addColumnIfNotExists('Category', 'isDeleted', 'BOOLEAN DEFAULT 0')
      await this.addColumnIfNotExists('Product', 'isDeleted', 'BOOLEAN DEFAULT 0')
      await this.addColumnIfNotExists('Expense', 'paymentMethod', "TEXT DEFAULT 'CASH'")
      await this.addColumnIfNotExists('Table', 'isDeleted', 'BOOLEAN DEFAULT 0')

      // OPTİMİZASYON: Son "schema.prisma" revizyonumuza göre güncellenmiş ve gereksizleri silinmiş Index'ler!
      const indexes = [
        // Product
        'CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId")',
        'CREATE INDEX IF NOT EXISTS "Product_isFavorite_idx" ON "Product"("isFavorite")',
        'CREATE INDEX IF NOT EXISTS "Product_isDeleted_idx" ON "Product"("isDeleted")',
        'CREATE INDEX IF NOT EXISTS "Product_name_idx" ON "Product"("name")',

        // Category & Table
        'CREATE INDEX IF NOT EXISTS "Category_isDeleted_idx" ON "Category"("isDeleted")',
        'CREATE INDEX IF NOT EXISTS "Table_isDeleted_idx" ON "Table"("isDeleted")',

        // Order
        'CREATE INDEX IF NOT EXISTS "Order_tableId_status_idx" ON "Order"("tableId", "status")',
        'CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx" ON "Order"("status", "createdAt")',

        // OrderItem
        'CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId")',
        'CREATE INDEX IF NOT EXISTS "OrderItem_orderId_isPaid_idx" ON "OrderItem"("orderId", "isPaid")',

        // Transaction
        'CREATE INDEX IF NOT EXISTS "Transaction_orderId_idx" ON "Transaction"("orderId")',
        'CREATE INDEX IF NOT EXISTS "Transaction_createdAt_paymentMethod_idx" ON "Transaction"("createdAt", "paymentMethod")',

        // Diğer
        'CREATE INDEX IF NOT EXISTS "DailySummary_date_idx" ON "DailySummary"("date")',
        'CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt")',
        'CREATE INDEX IF NOT EXISTS "ActivityLog_action_idx" ON "ActivityLog"("action")',
        'CREATE INDEX IF NOT EXISTS "Expense_createdAt_idx" ON "Expense"("createdAt")',
        'CREATE INDEX IF NOT EXISTS "MonthlyReport_monthDate_idx" ON "MonthlyReport"("monthDate")'
      ]

      for (const sql of indexes) {
        await prisma.$executeRawUnsafe(sql)
      }

      logger.debug('DBMaintenance', `Auto-migrations completed. ${indexes.length} indexes synced.`)
    } catch (error) {
      logger.error('DBMaintenance Migrations', error)
    }
  }

  private async addColumnIfNotExists(table: string, column: string, type: string): Promise<void> {
    try {
      const columns: Array<{ name: string }> = await prisma.$queryRawUnsafe(
        `PRAGMA table_info("${table}")`
      )
      if (!columns.some((c) => c.name === column)) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}`)
        logger.debug('DBMaintenance', `Added column ${table}.${column}`)
      }
    } catch (error) {
      logger.error(`DBMaintenance AddColumn ${table}.${column}`, error)
    }
  }

  protected async renameColumnIfExists(
    table: string,
    oldName: string,
    newName: string
  ): Promise<void> {
    try {
      const columns: Array<{ name: string }> = await prisma.$queryRawUnsafe(
        `PRAGMA table_info("${table}")`
      )
      if (!columns.some((c) => c.name === oldName) || columns.some((c) => c.name === newName))
        return

      await prisma.$executeRawUnsafe(
        `ALTER TABLE "${table}" RENAME COLUMN "${oldName}" TO "${newName}"`
      )
      logger.debug('DBMaintenance', `Renamed column ${table}.${oldName} → ${newName}`)
    } catch (error) {
      logger.error(`DBMaintenance RenameColumn ${table}.${oldName}→${newName}`, error)
    }
  }

  /**
   * Drops a column using native SQLite ALTER TABLE DROP COLUMN (3.35.0+).
   * Automatically drops any indexes covering the column first, since SQLite
   * refuses to drop an indexed column. The index sync step re-creates them on next run.
   */
  protected async dropColumnIfExists(table: string, column: string): Promise<void> {
    try {
      const columns: Array<{ name: string }> = await prisma.$queryRawUnsafe(
        `PRAGMA table_info("${table}")`
      )
      if (!columns.some((c) => c.name === column)) return

      // Drop all indexes that cover this column (SQLite blocks DROP COLUMN on indexed columns)
      const indexList: Array<{ name: string }> = await prisma.$queryRawUnsafe(
        `PRAGMA index_list("${table}")`
      )
      for (const idx of indexList) {
        const indexCols: Array<{ name: string }> = await prisma.$queryRawUnsafe(
          `PRAGMA index_info("${idx.name}")`
        )
        if (indexCols.some((c) => c.name === column)) {
          await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${idx.name}"`)
          logger.debug('DBMaintenance', `Dropped index ${idx.name} (blocking column drop)`)
        }
      }

      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" DROP COLUMN "${column}"`)
      logger.debug('DBMaintenance', `Dropped column ${table}.${column}`)
    } catch (error) {
      logger.error(`DBMaintenance DropColumn ${table}.${column}`, error)
    }
  }

  private async walCheckpoint(): Promise<void> {
    try {
      await prisma.$executeRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)')
      logger.debug('DBMaintenance', 'WAL checkpoint executed (TRUNCATE).')
    } catch (error) {
      logger.error('DBMaintenance WAL Checkpoint', error)
    }
  }

  private async quickCheck(): Promise<void> {
    try {
      const marker = path.join(this.backupDir, '.last-quickcheck')
      try {
        const stat = await fs.promises.stat(marker)
        if ((Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60 * 24) < 7) return
      } catch {
        /* No marker file */
      }

      const result: Array<{ integrity_check: string }> =
        await prisma.$queryRawUnsafe('PRAGMA quick_check')
      const isOk = result.length === 1 && result[0].integrity_check === 'ok'

      if (isOk) logger.info('DBMaintenance', 'quick_check passed — database integrity OK')
      else logger.error('DBMaintenance', `quick_check FAILED: ${JSON.stringify(result)}`)

      await fs.promises.writeFile(marker, '')
    } catch (error) {
      logger.error('DBMaintenance quick_check', error)
    }
  }

  private async shouldVacuum(): Promise<boolean> {
    const marker = path.join(this.backupDir, '.last-vacuum')
    try {
      const stat = await fs.promises.stat(marker)
      return (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60 * 24) >= 7
    } catch {
      return true
    }
  }

  private async runVacuum(): Promise<void> {
    try {
      if (!(await this.shouldVacuum())) return
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

      // macOS path sorunlarını engellemek için slash'leri güvenli hale getirdik.
      const safePath = backupPath.replace(/\\/g, '/').replace(/'/g, "''")
      await prisma.$executeRawUnsafe(`VACUUM INTO '${safePath}'`)
      logger.debug('DBMaintenance', `Backup created at ${backupPath}`)
    } catch (error) {
      logger.error('DBMaintenance Backup', error)
      throw error
    }
  }

  private cleanupOldBackups(): void {
    try {
      const files = fs
        .readdirSync(this.backupDir)
        .filter((f) => f.startsWith('backup-') && f.endsWith('.db'))
        .map((f) => ({ name: f, time: fs.statSync(path.join(this.backupDir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time)

      if (files.length > 5) {
        files.slice(5).forEach((file) => {
          // KRİTİK EKLENTİ: Her dosya silme işlemi kendi içinde try-catch bloğuna alındı.
          // Bir dosya kilitliyse, diğerlerinin silinmesini durdurmaz.
          try {
            fs.unlinkSync(path.join(this.backupDir, file.name))
            logger.debug('DBMaintenance', `Deleted old backup ${file.name}`)
          } catch (delError) {
            logger.error(`DBMaintenance Delete Backup Failed for ${file.name}`, delError)
          }
        })
      }
    } catch (error) {
      logger.error('DBMaintenance Cleanup', error)
    }
  }
}

export const dbMaintenance = new DBMaintenance()
