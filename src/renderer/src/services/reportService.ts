import { DailySummary, ActivityLog, MonthlyReport, ApiResponse } from '../../../shared/types'

const api = window.api

export const reportService = {
  // Z-Report
  zReport: {
    async generate(actualCash?: number): Promise<DailySummary> {
      const result = await api.zReport.generate(actualCash)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async getHistory(options?: {
      limit?: number
      startDate?: Date
      endDate?: Date
    }): Promise<DailySummary[]> {
      const limit = options?.limit ?? 30
      // Serialize dates to strings to ensure safe IPC transmission
      const startDateStr = options?.startDate?.toISOString()
      const endDateStr = options?.endDate?.toISOString()

      const result = await api.zReport.getHistory(limit, startDateStr, endDateStr)
      if (!result.success) throw new Error(result.error)
      return result.data
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
      const result = await (
        api.logs as unknown as {
          getRecent(
            limit: number,
            start?: string,
            end?: string,
            offset?: number,
            search?: string,
            category?: string
          ): Promise<ApiResponse<ActivityLog[]>>
        }
      ).getRecent(limit, startDate, endDate, offset, search, category)
      if (!result.success) throw new Error(result.error)
      return result.data!
    },
    async create(
      action: string,
      tableName?: string,
      userName?: string,
      details?: string
    ): Promise<ActivityLog> {
      const result = await api.logs.create(action, tableName, userName, details)
      if (!result.success) throw new Error(result.error)
      return result.data
    }
  },

  // End of Day
  endOfDay: {
    async check(): Promise<{
      canProceed: boolean
      openTables: { tableId: string; tableName: string; orderId: string; totalAmount: number }[]
    }> {
      const result = await api.endOfDay.check()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async execute(actualCash?: number): Promise<{
      zReport: DailySummary
      backupPath: string
      deletedBackups: number
      vacuumCompleted: boolean
    }> {
      const result = await api.endOfDay.execute(actualCash)
      if (!result.success) throw new Error(result.error)
      return result.data
    }
  },

  // Monthly Reports
  monthly: {
    async get(limit: number = 12): Promise<MonthlyReport[]> {
      const result = await api.reports.getMonthly(limit)
      if (!result.success) throw new Error(result.error)
      return result.data
    }
  }
}
