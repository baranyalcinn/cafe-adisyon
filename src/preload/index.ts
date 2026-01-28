import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '../shared/types'
import type { OrderStatus, PaymentMethod } from '../shared/types'

// Type-safe API for renderer process
const api = {
  // Tables
  tables: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.TABLES_GET_ALL),
    getWithStatus: () => ipcRenderer.invoke(IPC_CHANNELS.TABLES_GET_WITH_STATUS),
    create: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.TABLES_CREATE, name),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TABLES_DELETE, id)
  },

  // Categories
  categories: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_GET_ALL),
    create: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_CREATE, name),
    update: (id: string, data: { name?: string; icon?: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_DELETE, id)
  },

  // Products
  products: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_GET_ALL),
    getByCategory: (categoryId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_GET_BY_CATEGORY, categoryId),
    getFavorites: () => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_GET_FAVORITES),
    search: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_SEARCH, query),
    create: (data: { name: string; price: number; categoryId: string; isFavorite: boolean }) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_CREATE, data),
    update: (id: string, data: { name?: string; price?: number; isFavorite?: boolean }) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_DELETE, id)
  },

  // Orders
  orders: {
    getByTable: (tableId: string) => ipcRenderer.invoke(IPC_CHANNELS.ORDERS_GET_BY_TABLE, tableId),
    getOpenByTable: (tableId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_GET_OPEN_BY_TABLE, tableId),
    create: (tableId: string) => ipcRenderer.invoke(IPC_CHANNELS.ORDERS_CREATE, tableId),
    update: (
      orderId: string,
      data: { status?: OrderStatus; totalAmount?: number; isLocked?: boolean }
    ) => ipcRenderer.invoke(IPC_CHANNELS.ORDERS_UPDATE, orderId, data),
    addItem: (orderId: string, productId: string, quantity: number, unitPrice: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_ADD_ITEM, orderId, productId, quantity, unitPrice),
    updateItem: (orderItemId: string, quantity: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_UPDATE_ITEM, orderItemId, quantity),
    removeItem: (orderItemId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_REMOVE_ITEM, orderItemId),
    delete: (orderId: string) => ipcRenderer.invoke(IPC_CHANNELS.ORDERS_DELETE, orderId),
    transfer: (orderId: string, targetTableId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_TRANSFER, orderId, targetTableId),
    merge: (sourceOrderId: string, targetOrderId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_MERGE, sourceOrderId, targetOrderId),
    markItemsPaid: (items: { id: string; quantity: number }[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_MARK_ITEMS_PAID, items),
    getHistory: (options?: { date?: string; limit?: number; offset?: number }) =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDERS_GET_HISTORY, options)
  },

  // Payments
  payments: {
    create: (orderId: string, amount: number, paymentMethod: PaymentMethod) =>
      ipcRenderer.invoke(IPC_CHANNELS.PAYMENTS_CREATE, orderId, amount, paymentMethod),
    getByOrder: (orderId: string) => ipcRenderer.invoke(IPC_CHANNELS.PAYMENTS_GET_BY_ORDER, orderId)
  },

  // Dashboard
  dashboard: {
    getStats: () => ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_GET_STATS),
    getExtendedStats: () => ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_GET_EXTENDED_STATS),
    getRevenueTrend: (days: number = 7) =>
      ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_GET_REVENUE_TREND, days)
  },

  // Admin
  admin: {
    verifyPin: (pin: string) => ipcRenderer.invoke(IPC_CHANNELS.ADMIN_VERIFY_PIN, pin),
    checkStatus: () => ipcRenderer.invoke(IPC_CHANNELS.ADMIN_CHECK_STATUS),
    changePin: (currentPin: string, newPin: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ADMIN_CHANGE_PIN, currentPin, newPin),
    setRecovery: (currentPin: string, question: string, answer: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ADMIN_SET_RECOVERY, currentPin, question, answer),
    getRecoveryQuestion: () => ipcRenderer.invoke(IPC_CHANNELS.ADMIN_GET_RECOVERY_QUESTION),
    resetPin: (answer: string) => ipcRenderer.invoke(IPC_CHANNELS.ADMIN_RESET_PIN, answer)
  },

  // Z-Report
  zReport: {
    generate: (actualCash?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.ZREPORT_GENERATE, actualCash),
    getHistory: (limit: number = 30) => ipcRenderer.invoke(IPC_CHANNELS.ZREPORT_GET_HISTORY, limit)
  },

  // Activity Logs
  logs: {
    getRecent: (limit: number = 100) => ipcRenderer.invoke(IPC_CHANNELS.LOGS_GET_RECENT, limit),
    create: (action: string, tableName?: string, userName?: string, details?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.LOGS_CREATE, action, tableName, userName, details)
  },

  // Maintenance
  maintenance: {
    archiveOldData: () => ipcRenderer.invoke(IPC_CHANNELS.MAINTENANCE_ARCHIVE_OLD_DATA),
    exportData: (format: 'json' | 'csv' = 'json') =>
      ipcRenderer.invoke(IPC_CHANNELS.MAINTENANCE_EXPORT_DATA, format),
    vacuum: () => ipcRenderer.invoke(IPC_CHANNELS.MAINTENANCE_VACUUM),
    backup: () => ipcRenderer.invoke(IPC_CHANNELS.MAINTENANCE_BACKUP),
    backupWithRotation: (maxBackups: number = 30) =>
      ipcRenderer.invoke(IPC_CHANNELS.MAINTENANCE_BACKUP_WITH_ROTATION, maxBackups)
  },

  // Expenses
  expenses: {
    create: (data: { description: string; amount: number; category?: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPENSES_CREATE, data),
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.EXPENSES_GET_ALL),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.EXPENSES_DELETE, id)
  },

  // End of Day
  endOfDay: {
    check: () => ipcRenderer.invoke(IPC_CHANNELS.END_OF_DAY_CHECK),
    execute: (actualCash?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.END_OF_DAY_EXECUTE, actualCash)
  },

  // Seed
  seed: {
    database: () => ipcRenderer.invoke(IPC_CHANNELS.SEED_DATABASE)
  },

  // System
  system: {
    check: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_CHECK)
  },
  // Reports
  reports: {
    getMonthly: (limit: number = 12) => ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_MONTHLY, limit)
  },

  // Window Controls
  window: {
    minimize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE)
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
