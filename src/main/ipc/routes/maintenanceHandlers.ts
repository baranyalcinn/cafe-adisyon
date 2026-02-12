import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/types'
import { maintenanceService } from '../../services/MaintenanceService'
import { reportingService } from '../../services/ReportingService'
import { prisma, dbPath } from '../../db/prisma'

export function registerMaintenanceHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.MAINTENANCE_ARCHIVE_OLD_DATA, () =>
    maintenanceService.archiveOldData()
  )

  ipcMain.handle(IPC_CHANNELS.MAINTENANCE_EXPORT_DATA, (_, format) =>
    maintenanceService.exportData(format)
  )

  ipcMain.handle(IPC_CHANNELS.MAINTENANCE_VACUUM, () => maintenanceService.vacuumDatabase())

  ipcMain.handle(IPC_CHANNELS.MAINTENANCE_BACKUP, () => maintenanceService.backupDatabase())

  ipcMain.handle(IPC_CHANNELS.MAINTENANCE_BACKUP_WITH_ROTATION, (_, max) =>
    maintenanceService.backupWithRotation(max)
  )

  ipcMain.handle(IPC_CHANNELS.END_OF_DAY_CHECK, () => maintenanceService.endOfDayCheck())

  ipcMain.handle(IPC_CHANNELS.END_OF_DAY_EXECUTE, async (_, actualCash) => {
    // 1. Check open tables (MaintenanceService)
    const checkResult = await maintenanceService.endOfDayCheck()
    if (!checkResult.success || !checkResult.data?.canProceed) {
      return { success: false, error: 'Açık masalar var.' }
    }

    // 2. Generate Z-Report (ReportingService)
    const zReportResult = await reportingService.generateZReport(actualCash)
    if (!zReportResult.success) return zReportResult

    // 3. Backup with rotation
    const backupResult = await maintenanceService.backupWithRotation(30)
    await maintenanceService.vacuumDatabase()

    // 4. Cleanup old logs (90 days)
    const logCleanupResult = await maintenanceService.cleanupOldLogs(90)

    // 5. Integrity check
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

  ipcMain.handle(IPC_CHANNELS.SYSTEM_CHECK, async () => {
    try {
      const tableCount = await prisma.table.count()
      return { success: true, data: { dbPath, connection: true, tableCount } }
    } catch {
      return { success: true, data: { dbPath, connection: false, tableCount: 0 } }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SEED_DATABASE, () => maintenanceService.seedDatabase())
}
