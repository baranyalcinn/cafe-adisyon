import { DailySummary, ActivityLog, MonthlyReport } from '../../../shared/types'

const api = window.api

export const reportService = {
  // Z-Report
  zReport: {
    async generate(actualCash?: number): Promise<DailySummary> {
      const result = await api.zReport.generate(actualCash)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async getHistory(limit: number = 30): Promise<DailySummary[]> {
      const result = await api.zReport.getHistory(limit)
      if (!result.success) throw new Error(result.error)
      return result.data
    }
  },

  // Activity Logs
  logs: {
    async getRecent(limit: number = 100): Promise<ActivityLog[]> {
      const result = await api.logs.getRecent(limit)
      if (!result.success) throw new Error(result.error)
      return result.data
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
