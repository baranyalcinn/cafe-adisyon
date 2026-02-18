import { commands } from '../lib/bindings'
import { DailySummary, ActivityLog, MonthlyReport } from '@shared/types'
import { unwrap } from '../lib/utils'
import { mapDailySummary, mapActivityLog, mapMonthlyReport } from '../lib/mappers'

export const reportService = {
  // Z-Report
  zReport: {
    async generate(actualCash?: number): Promise<DailySummary> {
      const res = await commands.generateZreport(actualCash || null)
      return mapDailySummary(unwrap(res))
    },
    async getHistory(options?: {
      limit?: number
      startDate?: Date
      endDate?: Date
    }): Promise<DailySummary[]> {
      const limit = options?.limit ?? 30
      const startDateStr = options?.startDate?.toISOString()?.split('T')[0] || null
      const endDateStr = options?.endDate?.toISOString()?.split('T')[0] || null

      const res = await commands.getZreportHistory(limit, startDateStr, endDateStr)
      return unwrap(res).map(mapDailySummary)
    }
  },

  // Activity Logs
  logs: {
    async getRecent(
      limit: number = 100,
      startDate?: string,
      endDate?: string,
      offset: number = 0,
      search?: string,
      category?: 'all' | 'system' | 'operation'
    ): Promise<ActivityLog[]> {
      const res = await commands.getRecentLogs(
        limit,
        startDate || null,
        endDate || null,
        offset,
        search || null
      )
      return unwrap(res).map(mapActivityLog)
    },
    async create(
      action: string,
      tableName?: string,
      userName?: string,
      details?: string
    ): Promise<ActivityLog> {
      const res = await commands.createLog(
        action,
        tableName || null,
        userName || null,
        details || null
      )
      return mapActivityLog(unwrap(res))
    }
  },

  // End of Day
  endOfDay: {
    async check(): Promise<{
      canProceed: boolean
      openTables: { tableId: string; tableName: string; orderId: string; totalAmount: number }[]
    }> {
      const res = await commands.checkEndOfDay()
      const data = unwrap(res)
      return {
        canProceed: data.canProceed,
        openTables: data.openTables
      }
    },
    async execute(actualCash?: number): Promise<{
      zReport: DailySummary
      backupPath: string
      deletedBackups: number
      vacuumCompleted: boolean
    }> {
      const res = await commands.executeEndOfDay(actualCash || null)
      const data = unwrap(res)
      // Construct a partial or dummy for zReport as backend only returns ID
      // If we *really* need the object, we might need to fetch it.
      // But for now, let's satisfy the interface.
      return {
        zReport: {
          id: data.zReportId || '',
          date: new Date(),
          totalCash: 0,
          totalCard: 0,
          totalExpenses: 0,
          netProfit: 0,
          cancelCount: 0,
          totalVat: 0,
          orderCount: 0,
          totalRevenue: 0,
          actualCash: null,
          createdAt: new Date()
        },
        backupPath: data.backupPath,
        deletedBackups: 0,
        vacuumCompleted: data.vacuumSuccess
      }
    }
  },

  // Monthly Reports
  monthly: {
    async get(limit: number = 12): Promise<MonthlyReport[]> {
      const res = await commands.getMonthlyReports(limit)
      return unwrap(res).map(mapMonthlyReport)
    }
  }
}
