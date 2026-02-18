import { commands } from '../lib/bindings'
import { AppSettings, ActivityLog, DailySummary, MonthlyReport } from '@shared/types'
import { unwrap, mapDate, mapDateOpt } from '../lib/utils' // Import utils

export const adminService = {
  async verifyPin(pin: string): Promise<boolean> {
    const res = await commands.verifyPin(pin)
    const data = unwrap(res)
    return data.valid
  },

  async checkAdminStatus(): Promise<{ required: boolean }> {
    const res = await commands.checkAdminStatus()
    return unwrap(res)
  },

  async changePin(currentPin: string, newPin: string): Promise<void> {
    const res = await commands.changePin(currentPin, newPin)
    unwrap(res)
  },

  async setRecovery(currentPin: string, question: string, answer: string): Promise<void> {
    const res = await commands.setRecovery(currentPin, question, answer)
    unwrap(res)
  },

  async getRecoveryQuestion(): Promise<string | null> {
    const res = await commands.getRecoveryQuestion()
    return unwrap(res)
  },

  async resetPin(answer: string): Promise<void> {
    const res = await commands.resetPin(answer)
    unwrap(res)
  },

  async archiveOldData(): Promise<{
    deletedOrders: number
    deletedItems: number
    deletedTransactions: number
    deletedExpenses: number
    deletedSummaries: number
  }> {
    const res = await commands.archiveOldData()
    const data = unwrap(res)
    // Backend returns camelCase now, so it should match
    return data
  },

  async exportDatabase(): Promise<{ filepath: string; count: number }> {
    const res = await commands.exportDatabase()
    return unwrap(res)
  },

  async vacuumDatabase(): Promise<void> {
    const res = await commands.vacuumDatabase()
    unwrap(res)
  },

  async backupDatabase(): Promise<{ success: boolean; path: string }> {
    const res = await commands.backupDatabase()
    return unwrap(res)
  },

  async backupDatabaseWithRotation(
    maxBackups?: number
  ): Promise<{ success: boolean; path: string; totalBackups: number }> {
    const res = await commands.backupDatabaseWithRotation(maxBackups || 30)
    return unwrap(res)
  },

  async seedDatabase(): Promise<{ categories: number; products: number; tables: number }> {
    const res = await commands.seedDatabase()
    return unwrap(res)
  },

  async systemCheck(): Promise<{ dbConnected: boolean; tableCount: number; productCount: number }> {
    const res = await commands.systemCheck()
    const data = unwrap(res)
    return {
      dbConnected: data.dbConnected,
      tableCount: Number(data.tableCount), // Rust i64 -> TS number (safe for small counts)
      productCount: Number(data.productCount)
    }
  },

  async importLegacyData(filePath?: string | null): Promise<{
    success: boolean
    message: string
    tablesProcessed: number
    errors: string[]
  }> {
    // @ts-ignore - Command might not be in bindings yet if dev server hasn't reloaded
    const res = await commands.importLegacyData(filePath)
    return unwrap(res)
  }
}
