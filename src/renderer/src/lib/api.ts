import type {
  Table,
  Product,
  Category,
  Order,
  OrderItem,
  Transaction,
  ApiResponse,
  DashboardStats,
  ExtendedDashboardStats,
  RevenueTrendItem,
  DailySummary,
  ActivityLog,
  OrderStatus,
  PaymentMethod,
  Expense,
  MonthlyReport
} from '../../../shared/types'

// Get the API from the preload script
const api = window.api

// Re-export types for convenience
export type {
  Table,
  Product,
  Category,
  Order,
  OrderItem,
  Transaction,
  ApiResponse,
  DashboardStats,
  ExtendedDashboardStats,
  RevenueTrendItem,
  DailySummary,
  ActivityLog,
  OrderStatus,
  PaymentMethod,
  Expense,
  MonthlyReport
}

// Type-safe API wrapper with error handling
export const cafeApi = {
  // Tables
  tables: {
    async getAll(): Promise<Table[]> {
      const result = await api.tables.getAll()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async getWithStatus(): Promise<(Table & { hasOpenOrder: boolean })[]> {
      const result = await api.tables.getWithStatus()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async create(name: string): Promise<Table> {
      const result = await api.tables.create(name)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async delete(id: string): Promise<void> {
      const result = await api.tables.delete(id)
      if (!result.success) throw new Error(result.error)
    }
  },

  // Categories
  categories: {
    async getAll(): Promise<Category[]> {
      const result = await api.categories.getAll()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async create(name: string): Promise<Category> {
      const result = await api.categories.create(name)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async update(id: string, data: { name?: string; icon?: string }): Promise<Category> {
      const result = await api.categories.update(id, data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async delete(id: string): Promise<void> {
      const result = await api.categories.delete(id)
      if (!result.success) throw new Error(result.error)
    }
  },

  // Products
  products: {
    async getAll(): Promise<Product[]> {
      const result = await api.products.getAll()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async getByCategory(categoryId: string): Promise<Product[]> {
      const result = await api.products.getByCategory(categoryId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async getFavorites(): Promise<Product[]> {
      const result = await api.products.getFavorites()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async search(query: string): Promise<Product[]> {
      const result = await api.products.search(query)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async create(data: {
      name: string
      price: number
      categoryId: string
      isFavorite: boolean
    }): Promise<Product> {
      const result = await api.products.create(data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async update(
      id: string,
      data: { name?: string; price?: number; isFavorite?: boolean }
    ): Promise<Product> {
      const result = await api.products.update(id, data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async delete(id: string): Promise<void> {
      const result = await api.products.delete(id)
      if (!result.success) throw new Error(result.error)
    }
  },

  // Orders
  orders: {
    async getByTable(tableId: string): Promise<Order[]> {
      const result = await api.orders.getByTable(tableId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async getOpenByTable(tableId: string): Promise<Order | null> {
      const result = await api.orders.getOpenByTable(tableId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async create(tableId: string): Promise<Order> {
      const result = await api.orders.create(tableId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async update(
      orderId: string,
      data: { status?: OrderStatus; totalAmount?: number; isLocked?: boolean }
    ): Promise<Order> {
      const result = await api.orders.update(orderId, data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async addItem(
      orderId: string,
      productId: string,
      quantity: number,
      unitPrice: number
    ): Promise<Order> {
      const result = await api.orders.addItem(orderId, productId, quantity, unitPrice)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async updateItem(orderItemId: string, quantity: number): Promise<Order> {
      const result = await api.orders.updateItem(orderItemId, quantity)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async removeItem(orderItemId: string): Promise<Order> {
      const result = await api.orders.removeItem(orderItemId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async delete(orderId: string): Promise<void> {
      const result = await api.orders.delete(orderId)
      if (!result.success) throw new Error(result.error)
    },
    async transfer(orderId: string, targetTableId: string): Promise<Order> {
      const result = await api.orders.transfer(orderId, targetTableId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async merge(sourceOrderId: string, targetOrderId: string): Promise<Order> {
      const result = await api.orders.merge(sourceOrderId, targetOrderId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async markItemsPaid(items: { id: string; quantity: number }[]): Promise<Order> {
      const result = await api.orders.markItemsPaid(items)
      if (!result.success) throw new Error(result.error)
      return result.data
    }
  },

  // Payments
  payments: {
    async create(
      orderId: string,
      amount: number,
      paymentMethod: PaymentMethod
    ): Promise<{ payment: Transaction; order: Order }> {
      const result = await api.payments.create(orderId, amount, paymentMethod)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async getByOrder(orderId: string): Promise<Transaction[]> {
      const result = await api.payments.getByOrder(orderId)
      if (!result.success) throw new Error(result.error)
      return result.data
    }
  },

  // Dashboard
  dashboard: {
    async getStats(): Promise<DashboardStats> {
      const result = await api.dashboard.getStats()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async getExtendedStats(): Promise<ExtendedDashboardStats> {
      const result = await api.dashboard.getExtendedStats()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async getRevenueTrend(days: number = 7): Promise<RevenueTrendItem[]> {
      const result = await api.dashboard.getRevenueTrend(days)
      if (!result.success) throw new Error(result.error)
      return result.data
    }
  },

  // Admin
  admin: {
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

  // Expenses
  expenses: {
    async create(data: {
      description: string
      amount: number
      category?: string
    }): Promise<Expense> {
      const result = await api.expenses.create(data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async getAll(): Promise<Expense[]> {
      const result = await api.expenses.getAll()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    async delete(id: string): Promise<void> {
      const result = await api.expenses.delete(id)
      if (!result.success) throw new Error(result.error)
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

  // Order History
  orderHistory: {
    async get(options?: {
      date?: string
      limit?: number
      offset?: number
    }): Promise<{ orders: Order[]; totalCount: number; hasMore: boolean }> {
      const result = await api.orders.getHistory(options)
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
  },
  // Reports
  reports: {
    async getMonthly(limit: number = 12): Promise<MonthlyReport[]> {
      const result = await api.reports.getMonthly(limit)
      if (!result.success) throw new Error(result.error)
      return result.data
    }
  }
}
