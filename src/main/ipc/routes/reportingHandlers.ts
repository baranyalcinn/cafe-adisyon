import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/types'
import { reportingService } from '../../services/ReportingService'

export function registerReportingHandlers() {
  ipcMain.handle(IPC_CHANNELS.DASHBOARD_GET_STATS, () => reportingService.getDashboardStats())

  ipcMain.handle(IPC_CHANNELS.DASHBOARD_GET_EXTENDED_STATS, () =>
    reportingService.getExtendedDashboardStats()
  )

  ipcMain.handle(IPC_CHANNELS.DASHBOARD_GET_REVENUE_TREND, (_, days) =>
    reportingService.getRevenueTrend(days)
  )

  ipcMain.handle(IPC_CHANNELS.ZREPORT_GENERATE, (_, actualCash) =>
    reportingService.generateZReport(actualCash)
  )

  ipcMain.handle(IPC_CHANNELS.ZREPORT_GET_HISTORY, (_, limit) =>
    reportingService.getReportsHistory(limit)
  )

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_MONTHLY, (_, limit) =>
    reportingService.getMonthlyReports(limit)
  )
}
