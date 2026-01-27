const api = window.api

export const adminService = {
  // Admin PIN & Recovery
  auth: {
    async verifyPin(pin: string): Promise<{ valid: boolean; required: boolean }> {
      const result = await api.admin.verifyPin(pin)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async checkStatus(): Promise<{ required: boolean }> {
      const result = await api.admin.checkStatus()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async changePin(currentPin: string, newPin: string): Promise<void> {
      const result = await api.admin.changePin(currentPin, newPin)
      if (!result.success) throw new Error(result.error)
    },
    async setRecovery(currentPin: string, question: string, answer: string): Promise<void> {
      const result = await api.admin.setRecovery(currentPin, question, answer)
      if (!result.success) throw new Error(result.error)
    },
    async getRecoveryQuestion(): Promise<string | null> {
      const result = await api.admin.getRecoveryQuestion()
      if (!result.success) throw new Error(result.error)
      return result.data || null
    },
    async resetPin(answer: string): Promise<void> {
      const result = await api.admin.resetPin(answer)
      if (!result.success) throw new Error(result.error)
    }
  },

  // Maintenance
  maintenance: {
    async archiveOldData(): Promise<{
      deletedOrders: number
      deletedItems: number
      deletedTransactions: number
    }> {
      const result = await api.maintenance.archiveOldData()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async exportData(
      format: 'json' | 'csv' = 'json'
    ): Promise<{ filepath: string; count: number }> {
      const result = await api.maintenance.exportData(format)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async vacuum(): Promise<void> {
      const result = await api.maintenance.vacuum()
      if (!result.success) throw new Error(result.error)
    },
    async backup(): Promise<{ backupPath: string }> {
      const result = await api.maintenance.backup()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async backupWithRotation(
      maxBackups: number = 30
    ): Promise<{ backupPath: string; deletedCount: number; totalBackups: number }> {
      const result = await api.maintenance.backupWithRotation(maxBackups)
      if (!result.success) throw new Error(result.error)
      return result.data
    }
  },

  // Seed
  seed: {
    async database(): Promise<{ categories: number; products: number; tables: number }> {
      const result = await api.seed.database()
      if (!result.success) throw new Error(result.error)
      return result.data
    }
  },

  // System
  system: {
    async check(): Promise<{ dbPath: string; connection: boolean; tableCount: number }> {
      const result = await api.system.check()
      if (!result.success) throw new Error(result.error)
      return result.data
    }
  }
}
