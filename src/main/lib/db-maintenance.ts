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
      logger.info('DBMaintenance', 'Running auto-migrations...')

      // Migration 1: Add updatedAt column to Order table
      await this.addColumnIfNotExists('Order', 'updatedAt', 'DATETIME')

      // Migration 2: Add index on OrderItem.isPaid
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "OrderItem_isPaid_idx" ON "OrderItem"("isPaid")'
      )

      // Migration 3: Add index on Product.name
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "Product_name_idx" ON "Product"("name")'
      )

      logger.info('DBMaintenance', 'Auto-migrations completed.')
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
        logger.info('DBMaintenance', `Added column ${table}.${column}`)
      }
    } catch (error) {
      logger.error(`DBMaintenance AddColumn ${table}.${column}`, error)
    }
  }

  private async runVacuum(): Promise<void> {
    try {
      await prisma.$executeRawUnsafe('VACUUM;')
      logger.info('DBMaintenance', 'VACUUM executed.')
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
      logger.info('DBMaintenance', `Backup created at ${backupPath}`)
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
          logger.info('DBMaintenance', `Deleted old backup ${file.name}`)
        })
      }
    } catch (error) {
      logger.error('DBMaintenance Cleanup', error)
    }
  }
}

export const dbMaintenance = new DBMaintenance()
