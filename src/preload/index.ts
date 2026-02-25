import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'
import type { OrderStatus, PaymentMethod } from '../shared/types'
import {
  ActivityLog,
  ApiResponse,
  BootBundle,
  Category,
  DailySummary,
  DashboardBundle,
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

// ============================================================================
// IPC Communication Helpers (DRY Prensibi)
// ============================================================================

/** Standart ApiResponse dönen tüm invoke işlemleri için tip güvenli kısaltıcı */
const invoke = <T>(channel: string, ...args: unknown[]): Promise<ApiResponse<T>> =>
  ipcRenderer.invoke(channel, ...args)

/** Yanıt dönmeyen (Fire-and-forget) send işlemleri için kısaltıcı */
const send = (channel: string, ...args: unknown[]): void => ipcRenderer.send(channel, ...args)

// ============================================================================
// API Object
// ============================================================================

const api = {
  // --- Tables ---
  tables: {
    getAll: (): Promise<ApiResponse<Table[]>> => invoke<Table[]>(IPC_CHANNELS.TABLES_GET_ALL),
    getWithStatus: (): Promise<ApiResponse<(Table & { hasOpenOrder: boolean })[]>> =>
      invoke<(Table & { hasOpenOrder: boolean })[]>(IPC_CHANNELS.TABLES_GET_WITH_STATUS),
    create: (name: string): Promise<ApiResponse<Table>> =>
      invoke<Table>(IPC_CHANNELS.TABLES_CREATE, { name }),
    delete: (id: string): Promise<ApiResponse<null>> =>
      invoke<null>(IPC_CHANNELS.TABLES_DELETE, { id }),
    transfer: (sourceId: string, targetId: string): Promise<ApiResponse<Order>> =>
      invoke<Order>(IPC_CHANNELS.TABLES_TRANSFER, { sourceId, targetId }),
    merge: (sourceId: string, targetId: string): Promise<ApiResponse<Order>> =>
      invoke<Order>(IPC_CHANNELS.TABLES_MERGE, { sourceId, targetId })
  },

  // --- Categories ---
  categories: {
    getAll: (): Promise<ApiResponse<Category[]>> =>
      invoke<Category[]>(IPC_CHANNELS.CATEGORIES_GET_ALL),
    create: (name: string): Promise<ApiResponse<Category>> =>
      invoke<Category>(IPC_CHANNELS.CATEGORIES_CREATE, { name }),
    update: (id: string, data: { name?: string; icon?: string }): Promise<ApiResponse<Category>> =>
      invoke<Category>(IPC_CHANNELS.CATEGORIES_UPDATE, { id, data }),
    delete: (id: string): Promise<ApiResponse<null>> =>
      invoke<null>(IPC_CHANNELS.CATEGORIES_DELETE, { id })
  },

  // --- Products ---
  products: {
    getAll: (): Promise<ApiResponse<Product[]>> => invoke<Product[]>(IPC_CHANNELS.PRODUCTS_GET_ALL),
    getByCategory: (categoryId: string): Promise<ApiResponse<Product[]>> =>
      invoke<Product[]>(IPC_CHANNELS.PRODUCTS_GET_BY_CATEGORY, { categoryId }),
    getFavorites: (): Promise<ApiResponse<Product[]>> =>
      invoke<Product[]>(IPC_CHANNELS.PRODUCTS_GET_FAVORITES),
    search: (query: string): Promise<ApiResponse<Product[]>> =>
      invoke<Product[]>(IPC_CHANNELS.PRODUCTS_SEARCH, { query }),
    create: (data: {
      name: string
      price: number
      categoryId: string
      isFavorite: boolean
    }): Promise<ApiResponse<Product>> => invoke<Product>(IPC_CHANNELS.PRODUCTS_CREATE, data),
    update: (
      id: string,
      data: { name?: string; price?: number; isFavorite?: boolean }
    ): Promise<ApiResponse<Product>> => invoke<Product>(IPC_CHANNELS.PRODUCTS_UPDATE, { id, data }),
    delete: (id: string): Promise<ApiResponse<null>> =>
      invoke<null>(IPC_CHANNELS.PRODUCTS_DELETE, { id })
  },

  // --- Orders ---
  orders: {
    getOpenByTable: (tableId: string): Promise<ApiResponse<Order | null>> =>
      invoke<Order | null>(IPC_CHANNELS.ORDERS_GET_OPEN_BY_TABLE, { tableId }),
    create: (tableId: string): Promise<ApiResponse<Order>> =>
      invoke<Order>(IPC_CHANNELS.ORDERS_CREATE, { tableId }),
    update: (
      orderId: string,
      data: { status?: OrderStatus; totalAmount?: number; isLocked?: boolean }
    ): Promise<ApiResponse<Order>> => invoke<Order>(IPC_CHANNELS.ORDERS_UPDATE, { orderId, data }),
    addItem: (
      orderId: string,
      productId: string,
      quantity: number,
      unitPrice: number
    ): Promise<ApiResponse<Order>> =>
      invoke<Order>(IPC_CHANNELS.ORDERS_ADD_ITEM, { orderId, productId, quantity, unitPrice }),
    updateItem: (orderItemId: string, quantity: number): Promise<ApiResponse<Order>> =>
      invoke<Order>(IPC_CHANNELS.ORDERS_UPDATE_ITEM, { orderItemId, quantity }),
    removeItem: (orderItemId: string): Promise<ApiResponse<Order>> =>
      invoke<Order>(IPC_CHANNELS.ORDERS_REMOVE_ITEM, { orderItemId }),
    delete: (orderId: string): Promise<ApiResponse<null>> =>
      invoke<null>(IPC_CHANNELS.ORDERS_DELETE, { orderId }),
    transfer: (orderId: string, targetTableId: string): Promise<ApiResponse<Order>> =>
      invoke<Order>(IPC_CHANNELS.ORDERS_TRANSFER, { orderId, targetTableId }),
    merge: (sourceOrderId: string, targetOrderId: string): Promise<ApiResponse<Order>> =>
      invoke<Order>(IPC_CHANNELS.ORDERS_MERGE, { sourceOrderId, targetOrderId }),
    markItemsPaid: (
      items: { id: string; quantity: number }[],
      paymentDetails?: { amount: number; method: string }
    ): Promise<ApiResponse<Order>> =>
      invoke<Order>(IPC_CHANNELS.ORDERS_MARK_ITEMS_PAID, { items, paymentDetails }),
    getHistory: (options?: {
      date?: string
      limit?: number
      offset?: number
    }): Promise<ApiResponse<{ orders: Order[]; totalCount: number; hasMore: boolean }>> =>
      invoke<{ orders: Order[]; totalCount: number; hasMore: boolean }>(
        IPC_CHANNELS.ORDERS_GET_HISTORY,
        options
      ),
    getDetails: (orderId: string): Promise<ApiResponse<Order>> =>
      invoke<Order>(IPC_CHANNELS.ORDERS_GET_DETAILS, { orderId })
  },

  // --- Payments ---
  payments: {
    create: (
      orderId: string,
      amount: number,
      paymentMethod: PaymentMethod,
      options?: { skipLog?: boolean }
    ): Promise<ApiResponse<{ order: Order; completed: boolean }>> =>
      invoke<{ order: Order; completed: boolean }>(IPC_CHANNELS.PAYMENTS_CREATE, {
        orderId,
        amount,
        paymentMethod,
        options
      }),
    getByOrder: (orderId: string): Promise<ApiResponse<Transaction[]>> =>
      invoke<Transaction[]>(IPC_CHANNELS.PAYMENTS_GET_BY_ORDER, orderId)
  },

  // --- Dashboard ---
  dashboard: {
    getExtendedStats: (): Promise<ApiResponse<ExtendedDashboardStats>> =>
      invoke<ExtendedDashboardStats>(IPC_CHANNELS.DASHBOARD_GET_EXTENDED_STATS),
    getRevenueTrend: (days: number = 7): Promise<ApiResponse<RevenueTrendItem[]>> =>
      invoke<RevenueTrendItem[]>(IPC_CHANNELS.DASHBOARD_GET_REVENUE_TREND, { days }),
    getBundle: (): Promise<ApiResponse<DashboardBundle>> =>
      invoke<DashboardBundle>(IPC_CHANNELS.DASHBOARD_GET_BUNDLE)
  },

  // --- Admin ---
  admin: {
    verifyPin: (pin: string): Promise<ApiResponse<{ valid: boolean; required: boolean }>> =>
      invoke<{ valid: boolean; required: boolean }>(IPC_CHANNELS.ADMIN_VERIFY_PIN, { pin }),
    checkStatus: (): Promise<ApiResponse<{ required: boolean }>> =>
      invoke<{ required: boolean }>(IPC_CHANNELS.ADMIN_CHECK_STATUS),
    changePin: (currentPin: string, newPin: string): Promise<ApiResponse<null>> =>
      invoke<null>(IPC_CHANNELS.ADMIN_CHANGE_PIN, { currentPin, newPin }),
    setRecovery: (
      currentPin: string,
      question: string,
      answer: string
    ): Promise<ApiResponse<null>> =>
      invoke<null>(IPC_CHANNELS.ADMIN_SET_RECOVERY, { currentPin, question, answer }),
    getRecoveryQuestion: (): Promise<ApiResponse<string | null>> =>
      invoke<string | null>(IPC_CHANNELS.ADMIN_GET_RECOVERY_QUESTION),
    resetPin: (answer: string): Promise<ApiResponse<null>> =>
      invoke<null>(IPC_CHANNELS.ADMIN_RESET_PIN, { answer })
  },

  // --- Z-Report ---
  zReport: {
    generate: (actualCash?: number): Promise<ApiResponse<DailySummary>> =>
      invoke<DailySummary>(IPC_CHANNELS.ZREPORT_GENERATE, { actualCash }),
    getHistory: (options?: {
      limit?: number
      startDate?: string
      endDate?: string
    }): Promise<ApiResponse<DailySummary[]>> =>
      invoke<DailySummary[]>(IPC_CHANNELS.ZREPORT_GET_HISTORY, options ?? {})
  },

  // --- Logs ---
  logs: {
    getRecent: (
      limit: number = 100,
      startDate?: string,
      endDate?: string,
      offset: number = 0,
      search?: string,
      category?: string
    ): Promise<ApiResponse<ActivityLog[]>> =>
      invoke<ActivityLog[]>(IPC_CHANNELS.LOGS_GET_RECENT, {
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
      invoke<ActivityLog>(IPC_CHANNELS.LOGS_CREATE, { action, tableName, userName, details }),
    getStatsToday: (): Promise<ApiResponse<{ total: number; sys: number; ops: number }>> =>
      invoke<{ total: number; sys: number; ops: number }>(IPC_CHANNELS.LOGS_GET_STATS_TODAY)
  },

  // --- Maintenance ---
  maintenance: {
    archiveOldData: (): Promise<
      ApiResponse<{
        deletedOrders: number
        deletedItems: number
        deletedTransactions: number
        deletedExpenses: number
        deletedSummaries: number
      }>
    > => invoke(IPC_CHANNELS.MAINTENANCE_ARCHIVE_OLD_DATA),
    exportData: (
      format: 'json' | 'csv' = 'json'
    ): Promise<ApiResponse<{ filepath: string; count: number }>> =>
      invoke<{ filepath: string; count: number }>(IPC_CHANNELS.MAINTENANCE_EXPORT_DATA, format),
    vacuum: (): Promise<ApiResponse<null>> => invoke<null>(IPC_CHANNELS.MAINTENANCE_VACUUM),
    backup: (): Promise<ApiResponse<{ backupPath: string }>> =>
      invoke<{ backupPath: string }>(IPC_CHANNELS.MAINTENANCE_BACKUP),
    backupWithRotation: (
      maxBackups: number = 30
    ): Promise<ApiResponse<{ backupPath: string; deletedCount: number; totalBackups: number }>> =>
      invoke<{ backupPath: string; deletedCount: number; totalBackups: number }>(
        IPC_CHANNELS.MAINTENANCE_BACKUP_WITH_ROTATION,
        maxBackups
      )
  },

  // --- Expenses ---
  expenses: {
    create: (data: {
      description: string
      amount: number
      category?: string
      paymentMethod?: string
    }): Promise<ApiResponse<Expense>> => invoke<Expense>(IPC_CHANNELS.EXPENSES_CREATE, data),
    getAll: (options?: {
      limit?: number
      offset?: number
      search?: string
      category?: string
      startDate?: string
      endDate?: string
    }): Promise<ApiResponse<{ expenses: Expense[]; totalCount: number; hasMore: boolean }>> =>
      invoke<{ expenses: Expense[]; totalCount: number; hasMore: boolean }>(
        IPC_CHANNELS.EXPENSES_GET_ALL,
        options
      ),
    getStats: (options?: {
      search?: string
      category?: string
      startDate?: string
      endDate?: string
    }): Promise<ApiResponse<ExpenseStats>> =>
      invoke<ExpenseStats>(IPC_CHANNELS.EXPENSES_GET_STATS, options),
    update: (
      id: string,
      data: { description?: string; amount?: number; category?: string; paymentMethod?: string }
    ): Promise<ApiResponse<Expense>> => invoke<Expense>(IPC_CHANNELS.EXPENSES_UPDATE, { id, data }),
    delete: (id: string): Promise<ApiResponse<null>> =>
      invoke<null>(IPC_CHANNELS.EXPENSES_DELETE, { id })
  },

  // --- End of Day ---
  endOfDay: {
    check: (): Promise<
      ApiResponse<{
        canProceed: boolean
        openTables: { tableId: string; tableName: string; orderId: string; totalAmount: number }[]
      }>
    > => invoke(IPC_CHANNELS.END_OF_DAY_CHECK),
    execute: (
      actualCash?: number
    ): Promise<
      ApiResponse<{
        zReport: DailySummary
        backupPath: string
        deletedBackups: number
        vacuumCompleted: boolean
      }>
    > => invoke(IPC_CHANNELS.END_OF_DAY_EXECUTE, actualCash)
  },

  // --- System & Reports & Others ---
  seed: {
    database: (): Promise<ApiResponse<{ categories: number; products: number; tables: number }>> =>
      invoke<{ categories: number; products: number; tables: number }>(IPC_CHANNELS.SEED_DATABASE)
  },
  system: {
    check: (): Promise<ApiResponse<{ dbPath: string; connection: boolean; tableCount: number }>> =>
      invoke<{ dbPath: string; connection: boolean; tableCount: number }>(
        IPC_CHANNELS.SYSTEM_CHECK
      ),
    checkUpdate: (): Promise<
      ApiResponse<{ available: boolean; version?: string; currentVersion?: string }>
    > => invoke(IPC_CHANNELS.SYSTEM_CHECK_UPDATE),
    downloadUpdate: (): void => send(IPC_CHANNELS.SYSTEM_DOWNLOAD_UPDATE), // <--- Send kullanıldı
    getVersion: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_VERSION), // <--- ApiResponse dönmediği için istisna!
    restart: (): void => send(IPC_CHANNELS.SYSTEM_RESTART), // <--- Send kullanıldı
    getBootBundle: (): Promise<ApiResponse<BootBundle>> =>
      invoke<BootBundle>(IPC_CHANNELS.SYSTEM_GET_BOOT_BUNDLE)
  },
  reports: {
    getMonthly: (limit: number = 12): Promise<ApiResponse<MonthlyReport[]>> =>
      invoke<MonthlyReport[]>(IPC_CHANNELS.REPORTS_GET_MONTHLY, { limit })
  },
  window: {
    minimize: (): void => send(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: (): void => send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: (): void => send(IPC_CHANNELS.WINDOW_CLOSE)
  },

  // --- Main Event Listener ---
  on: (
    channel: (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS] | 'dashboard:update',
    callback: (...args: unknown[]) => void
  ): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void =>
      callback(...args)
    ipcRenderer.on(channel, subscription)
    return (): void => {
      ipcRenderer.removeListener(channel, subscription)
    }
  }
}

// Export API type for renderer
export type ApiType = typeof api

// Expose API
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose APIs in contextBridge:', error)
  }
} else {
  // @ts-ignore - Define window globals for development/non-isolated mode
  window.electron = electronAPI
  // @ts-ignore - Define window globals for development/non-isolated mode
  window.api = api
}
