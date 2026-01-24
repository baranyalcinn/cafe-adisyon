import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { prisma, dbPath } from '../db/prisma'
import { logger } from '../lib/logger'

export class DBMaintenance {
  private backupDir: string

  constructor() {
    const isDev = process.env.NODE_ENV === 'development'
    // In dev, use project root/backups. In prod, use userData/backups
    const baseDir = isDev ? process.cwd() : app.getPath('userData')
    this.backupDir = path.join(baseDir, 'backups')

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true })
    }
  }

  public async runMaintenance(): Promise<void> {
    try {
      logger.info('DBMaintenance', 'Starting maintenance tasks...')
      await this.runVacuum()
      await this.createBackup()
      this.cleanupOldBackups()
      logger.info('DBMaintenance', 'Maintenance completed successfully.')
    } catch (error) {
      logger.error('DBMaintenance', error)
    }
  }

  private async runVacuum(): Promise<void> {
    try {
      // Execute VACUUM command to optimize SQLite DB
      await prisma.$executeRawUnsafe('VACUUM;')
      logger.info('DBMaintenance', 'VACUUM executed.')
    } catch (error) {
      logger.error('DBMaintenance Vacuum', error)
      throw error
    }
  }

  private async createBackup(): Promise<void> {
    try {
      // Ensure WAL checkpoint before copy (optional but good for consistency)
      // SQLite usually handles simple file copy if not in heavy write mode,
      // but VACUUM above already helps settle things.

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = path.join(this.backupDir, `backup-${timestamp}.db`)

      // In WAL mode, we should ideally use the SQLite backup API, but simple file copy
      // works reasonably well for small desktop apps if we accept slight risk or if app is idle.
      // Since specific dbPath includes the file scheme 'file:...,' we need actual path string.
      // We imported dbPath from prisma setup which should be the file path.

      // We must strip 'file:' prefix if present or handle typical prisma path logic
      let sourcePath = dbPath
      if (sourcePath.startsWith('file:')) {
        sourcePath = sourcePath.replace('file:', '')
      }

      fs.copyFileSync(sourcePath, backupPath)
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
