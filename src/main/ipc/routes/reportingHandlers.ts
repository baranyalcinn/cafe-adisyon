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
  createSimpleHandler(
    IPC_CHANNELS.DASHBOARD_GET_BUNDLE,
    async () => {
      // Promise.all kullanarak tekrar deneyelim ama hata fırlatmasını önleyelim
      const [statsResult, trendResult, monthlyResult] = await Promise.all([
        reportingService
          .getExtendedDashboardStats()
          .catch((err) => ({ success: false as const, error: String(err) })),
        reportingService
          .getRevenueTrend(7)
          .catch((err) => ({ success: false as const, error: String(err) })),
        reportingService
          .getMonthlyReports(12)
          .catch((err) => ({ success: false as const, error: String(err) }))
      ])

      // En azından baz istatistiklerin olması gerekir
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

      return {
        success: true,
        data: {
          stats: statsResult.value.data,
          revenueTrend:
            trendResult.status === 'fulfilled' && trendResult.value.success
              ? trendResult.value.data
              : [],
          monthlyReports:
            monthlyResult.status === 'fulfilled' && monthlyResult.value.success
              ? monthlyResult.value.data
              : []
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
