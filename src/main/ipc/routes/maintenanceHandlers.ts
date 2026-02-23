import { ipcMain } from 'electron'
import { IPC_CHANNELS, Table } from '../../../shared/types'
import { dbPath, prisma } from '../../db/prisma'
import { toPlain } from '../../lib/toPlain'
import { maintenanceService } from '../../services/MaintenanceService'
import { productService } from '../../services/ProductService'
import { reportingService } from '../../services/ReportingService'
import { createSimpleHandler } from '../utils/ipcWrapper'

export function registerMaintenanceHandlers(): void {
  createSimpleHandler(
    IPC_CHANNELS.MAINTENANCE_ARCHIVE_OLD_DATA,
    () => maintenanceService.archiveOldData(),
    'Eski veriler arşivlenirken hata oluştu'
  )

  ipcMain.handle(IPC_CHANNELS.MAINTENANCE_EXPORT_DATA, (_, format) =>
    maintenanceService.exportData(format)
  )

  createSimpleHandler(
    IPC_CHANNELS.MAINTENANCE_VACUUM,
    () => maintenanceService.vacuumDatabase(),
    'Veritabanı temizlenirken hata oluştu'
  )

  createSimpleHandler(
    IPC_CHANNELS.MAINTENANCE_BACKUP,
    () => maintenanceService.backupDatabase(),
    'Yedekleme yapılırken hata oluştu'
  )

  ipcMain.handle(IPC_CHANNELS.MAINTENANCE_BACKUP_WITH_ROTATION, (_, max) =>
    maintenanceService.backupWithRotation(max)
  )

  createSimpleHandler(
    IPC_CHANNELS.END_OF_DAY_CHECK,
    () => maintenanceService.endOfDayCheck(),
    'Gün sonu kontrolü yapılırken hata oluştu'
  )

  // END_OF_DAY_EXECUTE is a complex orchestration - keep inline
  ipcMain.handle(IPC_CHANNELS.END_OF_DAY_EXECUTE, async (_, actualCash) => {
    const checkResult = await maintenanceService.endOfDayCheck()
    if (!checkResult.success || !checkResult.data?.canProceed) {
      return { success: false, error: 'Açık masalar var.' }
    }

    const zReportResult = await reportingService.generateZReport(actualCash)
    if (!zReportResult.success) return zReportResult

    const backupResult = await maintenanceService.backupWithRotation(30)
    await maintenanceService.vacuumDatabase()
    const logCleanupResult = await maintenanceService.cleanupOldLogs(90)
    const integrityResult = await maintenanceService.integrityCheck()

    return {
      success: true,
      data: {
        zReport: zReportResult.data,
        backupPath: backupResult.success ? backupResult.data.backupPath : undefined,
        deletedBackups: backupResult.success ? backupResult.data.deletedCount : 0,
        vacuumCompleted: true,
        deletedLogs: logCleanupResult.success ? logCleanupResult.data.deletedLogs : 0,
        dbHealthy: integrityResult.success ? integrityResult.data.isHealthy : true
      }
    }
  })

  // SYSTEM_CHECK returns raw data, no complex logic, keep as-is or wrap
  ipcMain.handle(IPC_CHANNELS.SYSTEM_CHECK, async () => {
    try {
      const tableCount = await prisma.table.count()
      return { success: true, data: { dbPath, connection: true, tableCount } }
    } catch {
      return { success: true, data: { dbPath, connection: false, tableCount: 0 } }
    }
  })

  // SYSTEM_GET_BOOT_BUNDLE returns custom wrapper format - keep inline
  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_BOOT_BUNDLE, async () => {
    try {
      const [productsRes, categoriesRes, tables, openOrders] = await Promise.all([
        productService.getAllProducts(),
        productService.getCategories(),
        prisma.table.findMany(),
        prisma.order.findMany({
          where: { status: 'OPEN' },
          select: { tableId: true, isLocked: true }
        })
      ])

      const openOrderMap = new Map<string, boolean>()
      for (const order of openOrders) {
        if (order.tableId) {
          openOrderMap.set(order.tableId, order.isLocked)
        }
      }

      tables.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      )

      const tablesWithStatus = tables.map((table) => {
        const hasOpen = openOrderMap.has(table.id)
        return {
          ...table,
          hasOpenOrder: hasOpen,
          isLocked: hasOpen ? openOrderMap.get(table.id) || false : false,
          orders: undefined
        }
      })

      return {
        success: true,
        data: {
          products: productsRes.success ? productsRes.data : [],
          categories: categoriesRes.success ? categoriesRes.data : [],
          tables: toPlain<Table[]>(tablesWithStatus as unknown as Table[])
        }
      }
    } catch {
      return { success: false, error: 'Açılış verileri alınamadı.' }
    }
  })

  createSimpleHandler(
    IPC_CHANNELS.SEED_DATABASE,
    () => maintenanceService.seedDatabase(),
    'Veritabanı dondurulurken hata oluştu'
  )
}
