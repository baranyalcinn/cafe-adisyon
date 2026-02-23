import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'
import type { OrderStatus, PaymentMethod } from '../shared/types'
import {
  ActivityLog,
  ApiResponse,
  Category,
  DailySummary,
  Expense,
  ExpenseStats,
  ExtendedDashboardStats,
  IPC_CHANNELS,
  MonthlyReport,
  Order,
  Product,
  RevenueTrendItem,
  Table,
  Transaction
} from '../shared/types'

// Type-safe API for renderer process
const api = {
  // Tables
  tables: {
    getAll: (): Promise<ApiResponse<Table[]>> => ipcRenderer.invoke(IPC_CHANNELS.TABLES_GET_ALL),
    getWithStatus: (): Promise<ApiResponse<(Table & { hasOpenOrder: boolean })[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.TABLES_GET_WITH_STATUS),
    create: (name: string): Promise<ApiResponse<Table>> =>
      ipcRenderer.invoke(IPC_CHANNELS.TABLES_CREATE, { name }),
    delete: (id: string): Promise<ApiResponse<null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.TABLES_DELETE, { id })
  },

  // Categories
  categories: {
    getAll: (): Promise<ApiResponse<Category[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_GET_ALL),
    create: (name: string): Promise<ApiResponse<Category>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_CREATE, { name }),
    update: (id: string, data: { name?: string; icon?: string }): Promise<ApiResponse<Category>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_UPDATE, { id, data }),
    delete: (id: string): Promise<ApiResponse<null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_DELETE, { id })
  },

  // Products
  products: {
    getAll: (): Promise<ApiResponse<Product[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_GET_ALL),
    getByCategory: (categoryId: string): Promise<ApiResponse<Product[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_GET_BY_CATEGORY, { categoryId }),
    getFavorites: (): Promise<ApiResponse<Product[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_GET_FAVORITES),
    search: (query: string): Promise<ApiResponse<Product[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_SEARCH, { query }),
    create: (data: {
      name: string
      price: number
      categoryId: string
      isFavorite: boolean
    }): Promise<ApiResponse<Product>> => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_CREATE, data),
    update: (
      id: string,
      data: { name?: string; price?: number; isFavorite?: boolean }
    ): Promise<ApiResponse<Product>> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_UPDATE, { id, data }),
    delete: (id: string): Promise<ApiResponse<null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_DELETE, { id })
  },

  // Orders
  orders: {
    getOpenByTable: (tableId: string): Promise<ApiResponse<Order | null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_GET_OPEN_BY_TABLE, { tableId }),
    create: (tableId: string): Promise<ApiResponse<Order>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_CREATE, { tableId }),
    update: (
      orderId: string,
      data: { status?: OrderStatus; totalAmount?: number; isLocked?: boolean }
    ): Promise<ApiResponse<Order>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_UPDATE, { orderId, data }),
    addItem: (
      orderId: string,
      productId: string,
      quantity: number,
      unitPrice: number
    ): Promise<ApiResponse<Order>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_ADD_ITEM, { orderId, productId, quantity, unitPrice }),
    updateItem: (orderItemId: string, quantity: number): Promise<ApiResponse<Order>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_UPDATE_ITEM, { orderItemId, quantity }),
    removeItem: (orderItemId: string): Promise<ApiResponse<Order>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_REMOVE_ITEM, { orderItemId }),
    delete: (orderId: string): Promise<ApiResponse<null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_DELETE, { orderId }),
    transfer: (orderId: string, targetTableId: string): Promise<ApiResponse<Order>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_TRANSFER, { orderId, targetTableId }),
    merge: (sourceOrderId: string, targetOrderId: string): Promise<ApiResponse<Order>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_MERGE, { sourceOrderId, targetOrderId }),
    markItemsPaid: (
      items: { id: string; quantity: number }[],
      paymentDetails?: { amount: number; method: string }
    ): Promise<ApiResponse<Order>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_MARK_ITEMS_PAID, { items, paymentDetails }),
    getHistory: (options?: {
      date?: string
      limit?: number
      offset?: number
    }): Promise<ApiResponse<{ orders: Order[]; totalCount: number; hasMore: boolean }>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_GET_HISTORY, options),
    getDetails: (orderId: string): Promise<ApiResponse<Order>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_GET_DETAILS, { orderId })
  },

  // Payments
  payments: {
    create: (
      orderId: string,
      amount: number,
      paymentMethod: PaymentMethod,
      options?: { skipLog?: boolean }
    ): Promise<ApiResponse<{ order: Order; completed: boolean }>> =>
      ipcRenderer.invoke(IPC_CHANNELS.PAYMENTS_CREATE, { orderId, amount, paymentMethod, options }),
    getByOrder: (orderId: string): Promise<ApiResponse<Transaction[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.PAYMENTS_GET_BY_ORDER, orderId)
  },

  // Dashboard
  dashboard: {
    getExtendedStats: (): Promise<ApiResponse<ExtendedDashboardStats>> =>
      ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_GET_EXTENDED_STATS),
    getRevenueTrend: (days: number = 7): Promise<ApiResponse<RevenueTrendItem[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_GET_REVENUE_TREND, days),
    getBundle: (): Promise<ApiResponse<import('../shared/types').DashboardBundle>> =>
      ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_GET_BUNDLE)
  },

  // Admin
  admin: {
    verifyPin: (pin: string): Promise<ApiResponse<{ valid: boolean; required: boolean }>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ADMIN_VERIFY_PIN, { pin }),
    checkStatus: (): Promise<ApiResponse<{ required: boolean }>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ADMIN_CHECK_STATUS),
    changePin: (currentPin: string, newPin: string): Promise<ApiResponse<null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ADMIN_CHANGE_PIN, { currentPin, newPin }),
    setRecovery: (
      currentPin: string,
      question: string,
      answer: string
    ): Promise<ApiResponse<null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ADMIN_SET_RECOVERY, { currentPin, question, answer }),
    getRecoveryQuestion: (): Promise<ApiResponse<string | null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ADMIN_GET_RECOVERY_QUESTION),
    resetPin: (answer: string): Promise<ApiResponse<null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ADMIN_RESET_PIN, { answer })
  },

  // Z-Report
  zReport: {
    generate: (actualCash?: number): Promise<ApiResponse<DailySummary>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ZREPORT_GENERATE, actualCash),
    getHistory: (
      limit: number,
      startDate?: string,
      endDate?: string
    ): Promise<ApiResponse<DailySummary[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ZREPORT_GET_HISTORY, limit, startDate, endDate)
  },

  // Activity Logs
  logs: {
    getRecent: (
      limit: number = 100,
      startDate?: string,
      endDate?: string,
      offset: number = 0,
      search?: string,
      category?: string
    ): Promise<ApiResponse<ActivityLog[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.LOGS_GET_RECENT, {
        limit,
        startDate,
        endDate,
        offset,
        search,
        category
      }),
    create: (
      action: string,
      tableName?: string,
      userName?: string,
      details?: string
    ): Promise<ApiResponse<ActivityLog>> =>
      ipcRenderer.invoke(IPC_CHANNELS.LOGS_CREATE, { action, tableName, userName, details }),
    getStatsToday: (): Promise<ApiResponse<{ total: number; sys: number; ops: number }>> =>
      ipcRenderer.invoke(IPC_CHANNELS.LOGS_GET_STATS_TODAY)
  },

  // Maintenance
  maintenance: {
    archiveOldData: (): Promise<
      ApiResponse<{
        deletedOrders: number
        deletedItems: number
        deletedTransactions: number
        deletedExpenses: number
        deletedSummaries: number
      }>
    > => ipcRenderer.invoke(IPC_CHANNELS.MAINTENANCE_ARCHIVE_OLD_DATA),
    exportData: (
      format: 'json' | 'csv' = 'json'
    ): Promise<ApiResponse<{ filepath: string; count: number }>> =>
      ipcRenderer.invoke(IPC_CHANNELS.MAINTENANCE_EXPORT_DATA, format),
    vacuum: (): Promise<ApiResponse<null>> => ipcRenderer.invoke(IPC_CHANNELS.MAINTENANCE_VACUUM),
    backup: (): Promise<ApiResponse<{ backupPath: string }>> =>
      ipcRenderer.invoke(IPC_CHANNELS.MAINTENANCE_BACKUP),
    backupWithRotation: (
      maxBackups: number = 30
    ): Promise<ApiResponse<{ backupPath: string; deletedCount: number; totalBackups: number }>> =>
      ipcRenderer.invoke(IPC_CHANNELS.MAINTENANCE_BACKUP_WITH_ROTATION, maxBackups)
  },

  // Expenses
  expenses: {
    create: (data: {
      description: string
      amount: number
      category?: string
      paymentMethod?: string
    }): Promise<ApiResponse<Expense>> => ipcRenderer.invoke(IPC_CHANNELS.EXPENSES_CREATE, data),
    getAll: (options?: {
      limit?: number
      offset?: number
      search?: string
      category?: string
      startDate?: string
      endDate?: string
    }): Promise<ApiResponse<{ expenses: Expense[]; totalCount: number; hasMore: boolean }>> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPENSES_GET_ALL, options),
    getStats: (options?: {
      search?: string
      category?: string
      startDate?: string
      endDate?: string
    }): Promise<ApiResponse<ExpenseStats>> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPENSES_GET_STATS, options),
    update: (
      id: string,
      data: { description?: string; amount?: number; category?: string; paymentMethod?: string }
    ): Promise<ApiResponse<Expense>> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPENSES_UPDATE, { id, data }),
    delete: (id: string): Promise<ApiResponse<null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPENSES_DELETE, { id })
  },

  // End of Day
  endOfDay: {
    check: (): Promise<
      ApiResponse<{
        canProceed: boolean
        openTables: {
          tableId: string
          tableName: string
          orderId: string
          totalAmount: number
        }[]
      }>
    > => ipcRenderer.invoke(IPC_CHANNELS.END_OF_DAY_CHECK),
    execute: (
      actualCash?: number
    ): Promise<
      ApiResponse<{
        zReport: DailySummary
        backupPath: string
        deletedBackups: number
        vacuumCompleted: boolean
      }>
    > => ipcRenderer.invoke(IPC_CHANNELS.END_OF_DAY_EXECUTE, actualCash)
  },

  // Seed
  seed: {
    database: (): Promise<ApiResponse<{ categories: number; products: number; tables: number }>> =>
      ipcRenderer.invoke(IPC_CHANNELS.SEED_DATABASE)
  },

  // System
  system: {
    check: (): Promise<ApiResponse<{ dbPath: string; connection: boolean; tableCount: number }>> =>
      ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_CHECK),
    checkUpdate: (): Promise<
      ApiResponse<{ available: boolean; version?: string; currentVersion?: string }>
    > => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_CHECK_UPDATE),
    downloadUpdate: (): void => ipcRenderer.send(IPC_CHANNELS.SYSTEM_DOWNLOAD_UPDATE),
    getVersion: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_VERSION),
    restart: (): void => ipcRenderer.send(IPC_CHANNELS.SYSTEM_RESTART),
    getBootBundle: (): Promise<ApiResponse<import('../shared/types').BootBundle>> =>
      ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_BOOT_BUNDLE)
  },

  // Reports
  reports: {
    getMonthly: (limit: number = 12): Promise<ApiResponse<MonthlyReport[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_MONTHLY, limit)
  },

  // Window Controls
  window: {
    minimize: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE)
  },

  // Events
  on: (
    channel: keyof typeof IPC_CHANNELS | 'dashboard:update',
    callback: (...args: unknown[]) => void
  ) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void =>
      callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  }
}

// Export API type for renderer
export type ApiType = typeof api

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
