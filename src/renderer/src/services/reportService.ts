import { ActivityLog, DailySummary, MonthlyReport } from '../../../shared/types'
import { resolveApi } from './apiClient'

const api = window.api

export const reportService = {
  // Z-Report
  zReport: {
    generate: (actualCash?: number): Promise<DailySummary> =>
      resolveApi(api.zReport.generate(actualCash)),

    getHistory: (options?: {
      limit?: number
      startDate?: Date
      endDate?: Date
    }): Promise<DailySummary[]> => {
      const limit = options?.limit ?? 30
      // Serialize dates to strings to ensure safe IPC transmission
      const startDate = options?.startDate?.toISOString()
      const endDate = options?.endDate?.toISOString()

      return resolveApi(api.zReport.getHistory({ limit, startDate, endDate }))
    }
  },

  // Activity Logs
  logs: {
    getRecent: async (
      limit: number = 100,
      startDate?: string,
      endDate?: string,
      offset: number = 0,
      search?: string,
      category?: 'all' | 'system' | 'operation'
    ): Promise<ActivityLog[]> => {
      const data = await resolveApi(
        api.logs.getRecent(limit, startDate, endDate, offset, search, category)
      )
      return data!
    },

    create: (
      action: string,
      tableName?: string,
      userName?: string,
      details?: string
    ): Promise<ActivityLog> => resolveApi(api.logs.create(action, tableName, userName, details)),

    getStatsToday: (): Promise<{ total: number; sys: number; ops: number }> =>
      resolveApi(api.logs.getStatsToday())
  },

  // End of Day
  endOfDay: {
    check: (): Promise<{
      canProceed: boolean
      openTables: { tableId: string; tableName: string; orderId: string; totalAmount: number }[]
    }> => resolveApi(api.endOfDay.check()),

    execute: (
      actualCash?: number
    ): Promise<{
      zReport: DailySummary
      backupPath: string
      deletedBackups: number
      vacuumCompleted: boolean
    }> => resolveApi(api.endOfDay.execute(actualCash))
  },

  // Monthly Reports
  monthly: {
    get: (limit: number = 12): Promise<MonthlyReport[]> => resolveApi(api.reports.getMonthly(limit))
  }
}
