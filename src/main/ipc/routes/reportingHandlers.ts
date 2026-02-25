import { z } from 'zod'
import { reportSchemas } from '../../../shared/ipc-schemas'
import { IPC_CHANNELS } from '../../../shared/types'
import { reportingService } from '../../services/ReportingService'
import { createSimpleHandler, createValidatedHandler } from '../utils/ipcWrapper'

// ============================================================================
// Local Schemas (Eğer ipc-schema.ts içinde yoksa burada tanımlayabiliriz)
// ============================================================================

const revenueTrendSchema = z.object({
  days: z.number().int().positive().default(7)
})

const zReportHistorySchema = reportSchemas.zReportHistory.extend({
  startDate: z.string().optional(),
  endDate: z.string().optional()
})

// ============================================================================
// Handlers
// ============================================================================

export function registerReportingHandlers(): void {
  // 1. EXTENDED STATS (No payload)
  createSimpleHandler(
    IPC_CHANNELS.DASHBOARD_GET_EXTENDED_STATS,
    () => reportingService.getExtendedDashboardStats(),
    'Dashboard verileri alınamadı.'
  )

  // 2. DASHBOARD BUNDLE (Orchestration)
  // Karmaşık işlemi de createSimpleHandler içine alarak standart hata yönetimine (try-catch, loglama) dahil ediyoruz.
  createSimpleHandler(
    IPC_CHANNELS.DASHBOARD_GET_BUNDLE,
    async () => {
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
    },
    'Dashboard paketi oluşturulamadı.'
  )

  // 3. REVENUE TREND
  createValidatedHandler(
    IPC_CHANNELS.DASHBOARD_GET_REVENUE_TREND,
    revenueTrendSchema,
    (data) => reportingService.getRevenueTrend(data.days),
    'Gelir trendi hesaplanamadı.'
  )

  // 4. GENERATE Z-REPORT
  createValidatedHandler(
    IPC_CHANNELS.ZREPORT_GENERATE,
    reportSchemas.zReportGenerate,
    (data) => reportingService.generateZReport(data.actualCash),
    'Z-Raporu oluşturulamadı.'
  )

  // 5. GET Z-REPORT HISTORY
  createValidatedHandler(
    IPC_CHANNELS.ZREPORT_GET_HISTORY,
    zReportHistorySchema,
    (data) => reportingService.getReportsHistory(data.limit, data.startDate, data.endDate),
    'Rapor geçmişi alınamadı.'
  )

  // 6. GET MONTHLY REPORTS
  createValidatedHandler(
    IPC_CHANNELS.REPORTS_GET_MONTHLY,
    reportSchemas.getMonthly,
    (data) => reportingService.getMonthlyReports(data.limit),
    'Aylık raporlar alınamadı.'
  )
}
