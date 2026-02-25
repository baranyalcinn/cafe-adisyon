import { app } from 'electron'
import { existsSync, promises as fs } from 'fs'
import * as path from 'path'
import { ApiResponse, ArchiveDataResult, EndOfDayCheckResult } from '../../shared/types'
import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'
import { logService } from './LogService'

// ============================================================================
// System Configuration & Seed Data
// ============================================================================

const CONFIG = {
  DEFAULT_LOG_RETENTION_DAYS: 30,
  DEFAULT_MAX_BACKUPS: 30,
  ARCHIVE_YEARS_AGO: 1,
  EXPORT_DIR: 'exports',
  BACKUP_DIR: 'backups'
} as const

const SEED_DATA = {
  categories: [
    { id: 'cat-sicak', name: 'Sıcak İçecekler', icon: 'coffee' },
    { id: 'cat-soguk', name: 'Soğuk İçecekler', icon: 'wine' },
    { id: 'cat-yiyecek', name: 'Yiyecekler', icon: 'utensils' },
    { id: 'cat-tatli', name: 'Tatlılar', icon: 'cake' }
  ],
  products: [
    { name: 'Türk Kahvesi', price: 6000, categoryId: 'cat-sicak', isFavorite: true },
    { name: 'Double Türk Kahvesi', price: 8000, categoryId: 'cat-sicak', isFavorite: false },
    { name: 'Espresso', price: 5500, categoryId: 'cat-sicak', isFavorite: true },
    { name: 'Double Espresso', price: 7000, categoryId: 'cat-sicak', isFavorite: false },
    { name: 'Americano', price: 6500, categoryId: 'cat-sicak', isFavorite: false },
    { name: 'Latte', price: 7500, categoryId: 'cat-sicak', isFavorite: true },
    { name: 'Cappuccino', price: 7500, categoryId: 'cat-sicak', isFavorite: true },
    { name: 'Filtre Kahve', price: 6000, categoryId: 'cat-sicak', isFavorite: false },
    { name: 'Çay', price: 2500, categoryId: 'cat-sicak', isFavorite: true },
    { name: 'Sıcak Çikolata', price: 8000, categoryId: 'cat-sicak', isFavorite: false },
    { name: 'Ice Latte', price: 8000, categoryId: 'cat-soguk', isFavorite: true },
    { name: 'Ev Yapımı Limonata', price: 6000, categoryId: 'cat-soguk', isFavorite: true },
    { name: 'Su (33cl)', price: 1500, categoryId: 'cat-soguk', isFavorite: false },
    { name: 'Soda', price: 2500, categoryId: 'cat-soguk', isFavorite: false },
    { name: 'Kaşarlı Tost', price: 8000, categoryId: 'cat-yiyecek', isFavorite: true },
    { name: 'Karışık Tost', price: 9500, categoryId: 'cat-yiyecek', isFavorite: true },
    { name: 'Patates Cips', price: 7000, categoryId: 'cat-yiyecek', isFavorite: true },
    { name: 'San Sebastian Cheesecake', price: 14000, categoryId: 'cat-tatli', isFavorite: true },
    { name: 'Belçika Çikolatalı Brownie', price: 11000, categoryId: 'cat-tatli', isFavorite: true },
    { name: 'Tiramisu', price: 11000, categoryId: 'cat-tatli', isFavorite: true }
  ]
}

// ============================================================================
// Service Class
// ============================================================================

export class MaintenanceService {
  // --- Private Utility Methods ---

  private handleError<T = null>(
    methodName: string,
    error: unknown,
    defaultMessage: string
  ): ApiResponse<T> {
    logger.error(`MaintenanceService.${methodName}`, error)
    if (
      error instanceof Error &&
      !error.message.includes('prisma') &&
      !error.message.includes('Database')
    ) {
      return { success: false, error: error.message }
    }
    return { success: false, error: defaultMessage }
  }

  private getCutoffDate(options: { years?: number; days?: number }): Date {
    const d = new Date()
    if (options.years) d.setFullYear(d.getFullYear() - options.years)
    if (options.days) d.setDate(d.getDate() - options.days)
    return d
  }

  private async getStorageDir(folderName: string): Promise<string> {
    const isDev = process.env.NODE_ENV === 'development'
    const baseDir = isDev ? process.cwd() : app.getPath('userData')
    const targetDir = path.join(baseDir, folderName)
    if (!existsSync(targetDir)) {
      await fs.mkdir(targetDir, { recursive: true })
    }
    return targetDir
  }

  // --- Public Operations ---

  async cleanupOldLogs(
    days: number = CONFIG.DEFAULT_LOG_RETENTION_DAYS
  ): Promise<ApiResponse<{ deletedLogs: number }>> {
    try {
      const cutoffDate = this.getCutoffDate({ days })
      const deletedLogs = await prisma.activityLog.deleteMany({
        where: { createdAt: { lt: cutoffDate } }
      })

      logger.info('MaintenanceService.cleanupOldLogs', `${deletedLogs.count} eski log silindi`)
      return { success: true, data: { deletedLogs: deletedLogs.count } }
    } catch (error) {
      return this.handleError('cleanupOldLogs', error, 'Log temizleme başarısız.')
    }
  }

  async archiveOldExpenses(): Promise<ApiResponse<{ deletedExpenses: number }>> {
    try {
      const cutoffDate = this.getCutoffDate({ years: CONFIG.ARCHIVE_YEARS_AGO })
      const deletedExpenses = await prisma.expense.deleteMany({
        where: { createdAt: { lt: cutoffDate } }
      })

      if (deletedExpenses.count > 0) {
        await logService.createLog(
          'ARCHIVE_EXPENSES',
          undefined,
          `${deletedExpenses.count} eski gider kaydı silindi`
        )
      }
      return { success: true, data: { deletedExpenses: deletedExpenses.count } }
    } catch (error) {
      return this.handleError('archiveOldExpenses', error, 'Gider arşivleme başarısız.')
    }
  }

  async archiveOldSummaries(): Promise<ApiResponse<{ deletedSummaries: number }>> {
    try {
      const cutoffDate = this.getCutoffDate({ years: CONFIG.ARCHIVE_YEARS_AGO })
      const deletedSummaries = await prisma.dailySummary.deleteMany({
        where: { date: { lt: cutoffDate } }
      })

      if (deletedSummaries.count > 0) {
        await logService.createLog(
          'ARCHIVE_SUMMARIES',
          undefined,
          `${deletedSummaries.count} eski Z-raporu silindi`
        )
      }
      return { success: true, data: { deletedSummaries: deletedSummaries.count } }
    } catch (error) {
      return this.handleError('archiveOldSummaries', error, 'Z-raporu arşivleme başarısız.')
    }
  }

  async integrityCheck(): Promise<ApiResponse<{ isHealthy: boolean; details: string }>> {
    try {
      const result =
        await prisma.$queryRawUnsafe<Array<{ integrity_check: string }>>('PRAGMA integrity_check')
      const isHealthy = result.length === 1 && result[0].integrity_check === 'ok'
      const details = result.map((r) => r.integrity_check).join(', ')

      if (!isHealthy)
        logger.error('MaintenanceService.integrityCheck', `Veritabanı bütünlük hatası: ${details}`)
      return { success: true, data: { isHealthy, details } }
    } catch (error) {
      return this.handleError('integrityCheck', error, 'Bütünlük kontrolü başarısız.')
    }
  }

  async archiveOldData(): Promise<ApiResponse<ArchiveDataResult>> {
    try {
      const cutoffDate = this.getCutoffDate({ years: CONFIG.ARCHIVE_YEARS_AGO })

      const result = await prisma.$transaction(async (tx) => {
        const deletedItems = await tx.orderItem.deleteMany({
          where: { order: { createdAt: { lt: cutoffDate }, status: 'CLOSED' } }
        })
        const deletedTransactions = await tx.transaction.deleteMany({
          where: { order: { createdAt: { lt: cutoffDate }, status: 'CLOSED' } }
        })
        const deletedOrders = await tx.order.deleteMany({
          where: { createdAt: { lt: cutoffDate }, status: 'CLOSED' }
        })
        const deletedExpenses = await tx.expense.deleteMany({
          where: { createdAt: { lt: cutoffDate } }
        })
        const deletedSummaries = await tx.dailySummary.deleteMany({
          where: { date: { lt: cutoffDate } }
        })

        return {
          deletedOrders: deletedOrders.count,
          deletedItems: deletedItems.count,
          deletedTransactions: deletedTransactions.count,
          deletedExpenses: deletedExpenses.count,
          deletedSummaries: deletedSummaries.count
        }
      })

      await logService.createLog(
        'ARCHIVE_DATA',
        undefined,
        `Silinen: ${result.deletedOrders} sipariş, ${result.deletedItems} ürün, ${result.deletedTransactions} işlem, ${result.deletedExpenses} gider, ${result.deletedSummaries} Z-raporu`
      )
      await this.purgeOrphanedRecords()

      return { success: true, data: result }
    } catch (error) {
      return this.handleError('archiveOldData', error, 'Veri arşivleme başarısız.')
    }
  }

  async purgeOrphanedRecords(): Promise<
    ApiResponse<{ deletedProducts: number; deletedCategories: number }>
  > {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const orphanedProducts = await tx.product.findMany({
          where: { isDeleted: true, orderItems: { none: {} } },
          select: { id: true }
        })
        const deletedProducts =
          orphanedProducts.length > 0
            ? (
                await tx.product.deleteMany({
                  where: { id: { in: orphanedProducts.map((p) => p.id) } }
                })
              ).count
            : 0

        const orphanedCategories = await tx.category.findMany({
          where: { isDeleted: true, products: { none: {} } },
          select: { id: true }
        })
        const deletedCategories =
          orphanedCategories.length > 0
            ? (
                await tx.category.deleteMany({
                  where: { id: { in: orphanedCategories.map((c) => c.id) } }
                })
              ).count
            : 0

        return { deletedProducts, deletedCategories }
      })

      if (result.deletedProducts > 0 || result.deletedCategories > 0) {
        logger.info(
          'MaintenanceService.purgeOrphanedRecords',
          `Temizlendi: ${result.deletedProducts} hayalet ürün, ${result.deletedCategories} hayalet kategori`
        )
        await logService.createLog(
          'PURGE_ORPHANED',
          undefined,
          `${result.deletedProducts} kullanılmayan ürün, ${result.deletedCategories} kullanılmayan kategori kalıcı olarak silindi`
        )
      }

      return { success: true, data: result }
    } catch (error) {
      return this.handleError('purgeOrphanedRecords', error, 'Hayalet kayıt temizleme başarısız.')
    }
  }

  async exportData(
    format: 'json' | 'csv' = 'json'
  ): Promise<ApiResponse<{ filepath: string; count: number }>> {
    try {
      const cutoffDate = this.getCutoffDate({ years: CONFIG.ARCHIVE_YEARS_AGO })
      const oldOrders = await prisma.order.findMany({
        where: { createdAt: { lt: cutoffDate }, status: 'CLOSED' },
        include: { items: { include: { product: true } }, payments: true, table: true }
      })

      const exportDir = await this.getStorageDir(CONFIG.EXPORT_DIR)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filepath = path.join(exportDir, `archive_${timestamp}.${format}`)

      if (format === 'json') {
        await fs.writeFile(filepath, JSON.stringify(oldOrders, null, 2))
      } else {
        const escCsv = (val: string): string =>
          /["\n,]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val
        const headers = 'OrderId,TableName,TotalAmount,Status,CreatedAt\n'
        const rows = oldOrders
          .map(
            (o) =>
              `${escCsv(o.id)},${escCsv(o.table?.name || '')},${o.totalAmount},${escCsv(o.status)},${o.createdAt.toISOString()}`
          )
          .join('\n')
        await fs.writeFile(filepath, headers + rows)
      }

      return { success: true, data: { filepath, count: oldOrders.length } }
    } catch (error) {
      return this.handleError('exportData', error, 'Veri dışa aktarma başarısız.')
    }
  }

  async vacuumDatabase(): Promise<ApiResponse<null>> {
    try {
      await prisma.$executeRawUnsafe('VACUUM')
      await logService.createLog('VACUUM', undefined, 'Veritabanı optimize edildi')
      return { success: true, data: null }
    } catch (error) {
      return this.handleError('vacuumDatabase', error, 'Veritabanı optimizasyonu başarısız.')
    }
  }

  async backupDatabase(): Promise<ApiResponse<{ backupPath: string }>> {
    try {
      const backupDir = await this.getStorageDir(CONFIG.BACKUP_DIR)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = path.join(backupDir, `backup_${timestamp}.db`)

      await prisma.$executeRawUnsafe(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`)
      await logService.createLog('BACKUP_DATABASE', undefined, `Yedek oluşturuldu: ${backupPath}`)

      return { success: true, data: { backupPath } }
    } catch (error) {
      return this.handleError('backupDatabase', error, 'Yedekleme başarısız.')
    }
  }

  async backupWithRotation(
    maxBackups: number = CONFIG.DEFAULT_MAX_BACKUPS
  ): Promise<ApiResponse<{ backupPath: string; deletedCount: number; totalBackups: number }>> {
    try {
      const backupDir = await this.getStorageDir(CONFIG.BACKUP_DIR)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = path.join(backupDir, `backup_${timestamp}.db`)

      await prisma.$executeRawUnsafe(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`)

      const fileNames = await fs.readdir(backupDir)
      const backupFiles = await Promise.all(
        fileNames
          .filter((f) => f.startsWith('backup_') && f.endsWith('.db'))
          .map(async (name) => {
            const filePath = path.join(backupDir, name)
            return { name, path: filePath, mtime: (await fs.stat(filePath)).mtime.getTime() }
          })
      )

      backupFiles.sort((a, b) => a.mtime - b.mtime) // Oldest first
      const toDelete = backupFiles.slice(0, Math.max(0, backupFiles.length - maxBackups))

      await Promise.all(toDelete.map((file) => fs.unlink(file.path)))

      await logService.createLog(
        'BACKUP_DATABASE',
        undefined,
        `Yedek oluşturuldu. Silinen eski yedek sayısı: ${toDelete.length}`
      )
      return {
        success: true,
        data: {
          backupPath,
          deletedCount: toDelete.length,
          totalBackups: backupFiles.length - toDelete.length
        }
      }
    } catch (error) {
      return this.handleError('backupWithRotation', error, 'Yedekleme başarısız.')
    }
  }

  async endOfDayCheck(): Promise<ApiResponse<EndOfDayCheckResult>> {
    try {
      const openOrders = await prisma.order.findMany({
        where: { status: 'OPEN' },
        include: { table: true }
      })
      const openTables = openOrders.map((o) => ({
        tableId: o.tableId,
        tableName: o.table?.name || 'Bilinmeyen Masa',
        orderId: o.id,
        totalAmount: o.totalAmount
      }))

      return { success: true, data: { canProceed: openTables.length === 0, openTables } }
    } catch (error) {
      return this.handleError('endOfDayCheck', error, 'Gün sonu kontrolü başarısız.')
    }
  }

  async seedDatabase(): Promise<ApiResponse<null>> {
    try {
      await prisma.$transaction([
        prisma.transaction.deleteMany(),
        prisma.orderItem.deleteMany(),
        prisma.order.deleteMany(),
        prisma.product.deleteMany(),
        prisma.category.deleteMany(),
        prisma.table.deleteMany()
      ])

      await prisma.category.createMany({ data: SEED_DATA.categories })

      await prisma.product.createMany({
        data: SEED_DATA.products.map((product) => ({
          id: `prod-${product.name
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')}`,
          ...product
        }))
      })

      await prisma.table.createMany({
        data: Array.from({ length: 12 }, (_, i) => ({
          id: `table-${i + 1}`,
          name: `Masa ${i + 1}`
        }))
      })

      await logService.createLog(
        'SEED_DATABASE',
        undefined,
        'Demo verileri yüklendi (12 masa, 4 kategori, 40+ ürün)'
      )
      return { success: true, data: null }
    } catch (error) {
      return this.handleError('seedDatabase', error, 'Demo veri yükleme başarısız oldu.')
    }
  }
}

export const maintenanceService = new MaintenanceService()
