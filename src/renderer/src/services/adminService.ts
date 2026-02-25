import { type UpdateInfo } from '../../../shared/types'
import { resolveApi } from './apiClient'

const api = window.api

export const adminService = {
  // Admin PIN & Recovery
  auth: {
    verifyPin: (pin: string): Promise<{ valid: boolean; required: boolean }> =>
      resolveApi(api.admin.verifyPin(pin)),

    checkStatus: (): Promise<{ required: boolean }> => resolveApi(api.admin.checkStatus()),

    changePin: async (currentPin: string, newPin: string): Promise<void> => {
      await resolveApi(api.admin.changePin(currentPin, newPin))
    },

    setRecovery: async (currentPin: string, question: string, answer: string): Promise<void> => {
      await resolveApi(api.admin.setRecovery(currentPin, question, answer))
    },

    getRecoveryQuestion: async (): Promise<string | null> => {
      const data = await resolveApi(api.admin.getRecoveryQuestion())
      return data || null
    },

    resetPin: async (answer: string): Promise<void> => {
      await resolveApi(api.admin.resetPin(answer))
    }
  },

  // Maintenance
  maintenance: {
    archiveOldData: (): Promise<{
      deletedOrders: number
      deletedItems: number
      deletedTransactions: number
      deletedExpenses: number
      deletedSummaries: number
    }> => resolveApi(api.maintenance.archiveOldData()),

    exportData: (format: 'json' | 'csv' = 'json'): Promise<{ filepath: string; count: number }> =>
      resolveApi(api.maintenance.exportData(format)),

    vacuum: async (): Promise<void> => {
      await resolveApi(api.maintenance.vacuum())
    },

    backup: (): Promise<{ backupPath: string }> => resolveApi(api.maintenance.backup()),

    backupWithRotation: (
      maxBackups: number = 30
    ): Promise<{ backupPath: string; deletedCount: number; totalBackups: number }> =>
      resolveApi(api.maintenance.backupWithRotation(maxBackups))
  },

  // Seed
  seed: {
    database: (): Promise<{ categories: number; products: number; tables: number }> =>
      resolveApi(api.seed.database())
  },

  // System
  system: {
    check: (): Promise<{ dbPath: string; connection: boolean; tableCount: number }> =>
      resolveApi(api.system.check()),

    checkUpdate: (): Promise<{
      available: boolean
      version?: string
      currentVersion?: string
    }> => resolveApi(api.system.checkUpdate()),
    downloadUpdate(): void {
      api.system.downloadUpdate()
    },
    restart(): void {
      api.system.restart()
    },
    onUpdate(callback: (event: string, data: unknown) => void): void {
      api.on('checking-for-update', () => callback('checking', null))
      api.on('update-available', (info: unknown) => callback('available', info as UpdateInfo))
      api.on('update-not-available', () => callback('not-available', null))
      api.on('download-progress', (progress: unknown) => callback('progress', progress))
      api.on('update-downloaded', (info: unknown) => callback('downloaded', info as UpdateInfo))
      api.on('update-error', (err: unknown) => callback('error', err))
    }
  }
}
