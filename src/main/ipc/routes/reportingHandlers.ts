import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/types'
import { reportingService } from '../../services/ReportingService'

export function registerReportingHandlers(): void {
  // getDashboardStats removed — only getExtendedDashboardStats is used
  ipcMain.handle(IPC_CHANNELS.DASHBOARD_GET_EXTENDED_STATS, () =>
    reportingService.getExtendedDashboardStats()
  )

  ipcMain.handle(IPC_CHANNELS.DASHBOARD_GET_BUNDLE, async () => {
    const [statsResult, trendResult, monthlyResult] = await Promise.all([
      reportingService.getExtendedDashboardStats(),
      reportingService.getRevenueTrend(7),
      reportingService.getMonthlyReports(12)
    ])

    if (!statsResult.success) {
      return { success: false, error: statsResult.error || 'Dashboard verisi alınamadı.' }
    }

    return {
      success: true,
      data: {
        stats: statsResult.data,
        revenueTrend: trendResult.success ? trendResult.data : [],
        monthlyReports: monthlyResult.success ? monthlyResult.data : []
      }
    }
  })

  ipcMain.handle(IPC_CHANNELS.DASHBOARD_GET_REVENUE_TREND, (_, days) =>
    reportingService.getRevenueTrend(days)
  )

  ipcMain.handle(IPC_CHANNELS.ZREPORT_GENERATE, (_, actualCash) =>
    reportingService.generateZReport(actualCash)
  )

  ipcMain.handle(
    IPC_CHANNELS.ZREPORT_GET_HISTORY,
    (_, limit: number, startDate?: string, endDate?: string) =>
      reportingService.getReportsHistory(limit, startDate, endDate)
  )

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_MONTHLY, (_, limit) =>
    reportingService.getMonthlyReports(limit)
  )
}
