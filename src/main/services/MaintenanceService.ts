import { prisma, dbPath } from '../db/prisma'
import { logger } from '../lib/logger'
import { logService } from './LogService'
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { ApiResponse } from '../../shared/types'

export class MaintenanceService {
  /**
   * Eski logları temizler (varsayılan: 30 günden eski)
   */
  async cleanupOldLogs(days: number = 30): Promise<ApiResponse<{ deletedLogs: number }>> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      const deletedLogs = await prisma.activityLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate }
        }
      })

      logger.info('MaintenanceService.cleanupOldLogs', `${deletedLogs.count} eski log silindi`)

      return {
        success: true,
        data: { deletedLogs: deletedLogs.count }
      }
    } catch (error) {
      logger.error('MaintenanceService.cleanupOldLogs', error)
      return { success: false, error: 'Log temizleme başarısız.' }
    }
  }

  /**
   * 1 yıldan eski giderleri arşivler (siler)
   */
  async archiveOldExpenses(): Promise<ApiResponse<{ deletedExpenses: number }>> {
    try {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      const deletedExpenses = await prisma.expense.deleteMany({
        where: {
          createdAt: { lt: oneYearAgo }
        }
      })

      if (deletedExpenses.count > 0) {
        await logService.createLog(
          'ARCHIVE_EXPENSES',
          undefined,
          `${deletedExpenses.count} eski gider kaydı silindi`
        )
      }

      return {
        success: true,
        data: { deletedExpenses: deletedExpenses.count }
      }
    } catch (error) {
      logger.error('MaintenanceService.archiveOldExpenses', error)
      return { success: false, error: 'Gider arşivleme başarısız.' }
    }
  }

  /**
   * 1 yıldan eski Z-raporlarını (DailySummary) siler
   */
  async archiveOldSummaries(): Promise<ApiResponse<{ deletedSummaries: number }>> {
    try {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      const deletedSummaries = await prisma.dailySummary.deleteMany({
        where: {
          date: { lt: oneYearAgo }
        }
      })

      if (deletedSummaries.count > 0) {
        await logService.createLog(
          'ARCHIVE_SUMMARIES',
          undefined,
          `${deletedSummaries.count} eski Z-raporu silindi`
        )
      }

      return {
        success: true,
        data: { deletedSummaries: deletedSummaries.count }
      }
    } catch (error) {
      logger.error('MaintenanceService.archiveOldSummaries', error)
      return { success: false, error: 'Z-raporu arşivleme başarısız.' }
    }
  }

  /**
   * Veritabanı bütünlük kontrolü yapar
   */
  async integrityCheck(): Promise<ApiResponse<{ isHealthy: boolean; details: string }>> {
    try {
      const result =
        await prisma.$queryRawUnsafe<Array<{ integrity_check: string }>>('PRAGMA integrity_check')

      const isHealthy = result.length === 1 && result[0].integrity_check === 'ok'
      const details = result.map((r) => r.integrity_check).join(', ')

      if (!isHealthy) {
        logger.error('MaintenanceService.integrityCheck', `Veritabanı bütünlük hatası: ${details}`)
      }

      return {
        success: true,
        data: { isHealthy, details }
      }
    } catch (error) {
      logger.error('MaintenanceService.integrityCheck', error)
      return { success: false, error: 'Bütünlük kontrolü başarısız.' }
    }
  }

  /**
   * 1 yıldan eski siparişleri, giderleri ve Z-raporlarını arşivler
   */
  async archiveOldData(): Promise<
    ApiResponse<{
      deletedOrders: number
      deletedItems: number
      deletedTransactions: number
      deletedExpenses: number
      deletedSummaries: number
    }>
  > {
    try {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      const deletedItems = await prisma.orderItem.deleteMany({
        where: {
          order: {
            createdAt: { lt: oneYearAgo },
            status: 'CLOSED'
          }
        }
      })

      const deletedTransactions = await prisma.transaction.deleteMany({
        where: {
          order: {
            createdAt: { lt: oneYearAgo },
            status: 'CLOSED'
          }
        }
      })

      const deletedOrders = await prisma.order.deleteMany({
        where: {
          createdAt: { lt: oneYearAgo },
          status: 'CLOSED'
        }
      })

      // Giderleri de arşivle
      const expenseResult = await this.archiveOldExpenses()
      const deletedExpenses = expenseResult.data?.deletedExpenses || 0

      // Z-raporlarını da arşivle
      const summaryResult = await this.archiveOldSummaries()
      const deletedSummaries = summaryResult.data?.deletedSummaries || 0

      await logService.createLog(
        'ARCHIVE_DATA',
        undefined,
        `Silinen: ${deletedOrders.count} sipariş, ${deletedItems.count} ürün, ${deletedTransactions.count} işlem, ${deletedExpenses} gider, ${deletedSummaries} Z-raporu`
      )

      return {
        success: true,
        data: {
          deletedOrders: deletedOrders.count,
          deletedItems: deletedItems.count,
          deletedTransactions: deletedTransactions.count,
          deletedExpenses,
          deletedSummaries
        }
      }
    } catch (error) {
      logger.error('MaintenanceService.archiveOldData', error)
      return { success: false, error: 'Veri arşivleme başarısız.' }
    }
  }

  async exportData(
    format: 'json' | 'csv' = 'json'
  ): Promise<ApiResponse<{ filepath: string; count: number }>> {
    try {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      const oldOrders = await prisma.order.findMany({
        where: {
          createdAt: { lt: oneYearAgo },
          status: 'CLOSED'
        },
        include: {
          items: { include: { product: true } },
          payments: true,
          table: true
        }
      })

      const isDev = process.env.NODE_ENV === 'development'
      const baseDir = isDev ? process.cwd() : app.getPath('userData')
      const exportDir = path.join(baseDir, 'exports')
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true })
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `archive_${timestamp}.${format}`
      const filepath = path.join(exportDir, filename)

      if (format === 'json') {
        fs.writeFileSync(filepath, JSON.stringify(oldOrders, null, 2))
      } else {
        const headers = 'OrderId,TableName,TotalAmount,Status,CreatedAt\n'
        const rows = oldOrders
          .map(
            (o) =>
              `${o.id},${o.table?.name || ''},${o.totalAmount},${o.status},${o.createdAt.toISOString()}`
          )
          .join('\n')
        fs.writeFileSync(filepath, headers + rows)
      }

      return { success: true, data: { filepath, count: oldOrders.length } }
    } catch (error) {
      logger.error('MaintenanceService.exportData', error)
      return { success: false, error: 'Veri dışa aktarma başarısız.' }
    }
  }

  async vacuumDatabase(): Promise<ApiResponse<null>> {
    try {
      await prisma.$executeRawUnsafe('VACUUM')

      await logService.createLog('VACUUM', undefined, 'Veritabanı optimize edildi')

      return { success: true, data: null }
    } catch (error) {
      logger.error('MaintenanceService.vacuumDatabase', error)
      return { success: false, error: 'Veritabanı optimizasyonu başarısız.' }
    }
  }

  async backupDatabase(): Promise<ApiResponse<{ backupPath: string }>> {
    try {
      const isDev = process.env.NODE_ENV === 'development'
      const baseDir = isDev ? process.cwd() : app.getPath('userData')
      const backupDir = path.join(baseDir, 'backups')
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = path.join(backupDir, `backup_${timestamp}.db`)

      fs.copyFileSync(dbPath, backupPath)

      await logService.createLog('BACKUP_DATABASE', undefined, `Yedek oluşturuldu: ${backupPath}`)

      return { success: true, data: { backupPath } }
    } catch (error) {
      logger.error('MaintenanceService.backupDatabase', error)
      return { success: false, error: 'Yedekleme başarısız.' }
    }
  }

  async backupWithRotation(
    maxBackups: number = 30
  ): Promise<ApiResponse<{ backupPath: string; deletedCount: number; totalBackups: number }>> {
    try {
      const isDev = process.env.NODE_ENV === 'development'
      const baseDir = isDev ? process.cwd() : app.getPath('userData')
      const backupDir = path.join(baseDir, 'backups')
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }

      // Create new backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = path.join(backupDir, `backup_${timestamp}.db`)
      fs.copyFileSync(dbPath, backupPath)

      // Get all backup files and sort by modification time (oldest first)
      const backupFiles = fs
        .readdirSync(backupDir)
        .filter((f) => f.startsWith('backup_') && f.endsWith('.db'))
        .map((f) => ({
          name: f,
          path: path.join(backupDir, f),
          mtime: fs.statSync(path.join(backupDir, f)).mtime.getTime()
        }))
        .sort((a, b) => a.mtime - b.mtime)

      // Delete old backups if we exceed maxBackups
      const toDelete = backupFiles.slice(0, Math.max(0, backupFiles.length - maxBackups))
      for (const file of toDelete) {
        fs.unlinkSync(file.path)
      }

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
      logger.error('MaintenanceService.backupWithRotation', error)
      return { success: false, error: 'Yedekleme başarısız.' }
    }
  }

  async endOfDayCheck(): Promise<
    ApiResponse<{ canProceed: boolean; openTables: Array<{ tableId: string; tableName: string }> }>
  > {
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

      return {
        success: true,
        data: {
          canProceed: openTables.length === 0,
          openTables
        }
      }
    } catch (error) {
      logger.error('MaintenanceService.endOfDayCheck', error)
      return { success: false, error: 'Gün sonu kontrolü başarısız.' }
    }
  }

  async seedDatabase(): Promise<ApiResponse<null>> {
    try {
      // Clear existing data in correct order
      await prisma.$transaction([
        prisma.transaction.deleteMany(),
        prisma.orderItem.deleteMany(),
        prisma.order.deleteMany(),
        prisma.product.deleteMany(),
        prisma.category.deleteMany(),
        prisma.table.deleteMany()
      ])

      // Seed Categories
      await prisma.category.createMany({
        data: [
          { id: 'cat-sicak', name: 'Sıcak İçecekler', icon: 'coffee' },
          { id: 'cat-soguk', name: 'Soğuk İçecekler', icon: 'wine' },
          { id: 'cat-yiyecek', name: 'Yiyecekler', icon: 'utensils' },
          { id: 'cat-tatli', name: 'Tatlılar', icon: 'cake' }
        ]
      })

      // Seed Products with generated IDs
      const products = [
        { name: 'Türk Kahvesi', price: 6000, categoryId: 'cat-sicak', isFavorite: true },
        { name: 'Double Türk Kahvesi', price: 8000, categoryId: 'cat-sicak', isFavorite: false },
        { name: 'Espresso', price: 5500, categoryId: 'cat-sicak', isFavorite: true },
        { name: 'Double Espresso', price: 7000, categoryId: 'cat-sicak', isFavorite: false },
        { name: 'Americano', price: 6500, categoryId: 'cat-sicak', isFavorite: false },
        { name: 'Latte', price: 7500, categoryId: 'cat-sicak', isFavorite: true },
        { name: 'Cappuccino', price: 7500, categoryId: 'cat-sicak', isFavorite: true },
        { name: 'Flat White', price: 7500, categoryId: 'cat-sicak', isFavorite: false },
        { name: 'Caramel Macchiato', price: 8500, categoryId: 'cat-sicak', isFavorite: false },
        { name: 'Filtre Kahve', price: 6000, categoryId: 'cat-sicak', isFavorite: false },
        { name: 'Çay', price: 2500, categoryId: 'cat-sicak', isFavorite: true },
        { name: 'Fincan Çay', price: 3500, categoryId: 'cat-sicak', isFavorite: false },
        {
          name: 'Bitki Çayı (Yeşil/Ihlamur)',
          price: 5000,
          categoryId: 'cat-sicak',
          isFavorite: false
        },
        { name: 'Sıcak Çikolata', price: 8000, categoryId: 'cat-sicak', isFavorite: false },
        { name: 'Salep', price: 8000, categoryId: 'cat-sicak', isFavorite: false },
        { name: 'Ice Latte', price: 8000, categoryId: 'cat-soguk', isFavorite: true },
        { name: 'Ice Americano', price: 7000, categoryId: 'cat-soguk', isFavorite: false },
        { name: 'Ice Caramel Macchiato', price: 9000, categoryId: 'cat-soguk', isFavorite: false },
        { name: 'House Frappe', price: 9500, categoryId: 'cat-soguk', isFavorite: true },
        {
          name: 'Milkshake (Çil/Muz/Özel)',
          price: 9500,
          categoryId: 'cat-soguk',
          isFavorite: false
        },
        { name: 'Ev Yapımı Limonata', price: 6000, categoryId: 'cat-soguk', isFavorite: true },
        { name: 'Churchill', price: 5000, categoryId: 'cat-soguk', isFavorite: false },
        { name: 'Taze Portakal Suyu', price: 8000, categoryId: 'cat-soguk', isFavorite: false },
        { name: 'Su (33cl)', price: 1500, categoryId: 'cat-soguk', isFavorite: false },
        { name: 'Soda', price: 2500, categoryId: 'cat-soguk', isFavorite: false },
        { name: 'Kaşarlı Tost', price: 8000, categoryId: 'cat-yiyecek', isFavorite: true },
        { name: 'Karışık Tost', price: 9500, categoryId: 'cat-yiyecek', isFavorite: true },
        { name: 'Soğuk Sandviç', price: 8500, categoryId: 'cat-yiyecek', isFavorite: false },
        { name: 'Patates Cips', price: 7000, categoryId: 'cat-yiyecek', isFavorite: true },
        { name: 'Sigara Böreği (6 lı)', price: 8000, categoryId: 'cat-yiyecek', isFavorite: false },
        {
          name: 'San Sebastian Cheesecake',
          price: 14000,
          categoryId: 'cat-tatli',
          isFavorite: true
        },
        { name: 'Limonlu Cheesecake', price: 13000, categoryId: 'cat-tatli', isFavorite: false },
        {
          name: 'Belçika Çikolatalı Brownie',
          price: 11000,
          categoryId: 'cat-tatli',
          isFavorite: true
        },
        { name: 'Çilekli Magnolia', price: 9000, categoryId: 'cat-tatli', isFavorite: false },
        { name: 'Tiramisu', price: 11000, categoryId: 'cat-tatli', isFavorite: true },
        { name: 'Waffle', price: 15000, categoryId: 'cat-tatli', isFavorite: false }
      ]

      for (const product of products) {
        await prisma.product.create({
          data: {
            id: `prod-${product.name
              .toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-')}`,
            ...product
          }
        })
      }

      // Seed Tables
      for (let i = 1; i <= 12; i++) {
        await prisma.table.create({
          data: { id: `table-${i}`, name: `Masa ${i}` }
        })
      }

      await logService.createLog(
        'SEED_DATABASE',
        undefined,
        'Demo verileri yüklendi (12 masa, 4 kategori, 40+ ürün)'
      )

      return { success: true, data: null }
    } catch (error) {
      logger.error('MaintenanceService.seedDatabase', error)
      return { success: false, error: 'Demo veri yükleme başarısız oldu.' }
    }
  }
}

export const maintenanceService = new MaintenanceService()
