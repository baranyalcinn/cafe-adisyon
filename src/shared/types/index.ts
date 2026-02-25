// Shared TypeScript types used by both main and renderer processes

// Database entity types
export interface Product {
  id: string
  name: string
  price: number
  categoryId: string
  isFavorite: boolean
  isDeleted: boolean
  category?: Category
}

export interface Category {
  id: string
  name: string
  icon?: string
  products?: Product[]
}

export interface Table {
  id: string
  name: string
  orders?: Order[]
  // Computed property for UI
  hasOpenOrder?: boolean
  isLocked?: boolean
}

export interface Order {
  id: string
  tableId: string
  status: OrderStatus
  totalAmount: number
  isLocked: boolean
  createdAt: Date
  updatedAt?: Date
  table?: Table
  items?: OrderItem[]
  payments?: Transaction[]
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  quantity: number
  unitPrice: number
  isPaid?: boolean
  product?: Product
}

export interface Transaction {
  id: string
  orderId: string
  amount: number
  paymentMethod: PaymentMethod
  createdAt: Date
}

// Enums
export const ORDER_STATUS = { OPEN: 'OPEN', CLOSED: 'CLOSED' } as const
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]
export type PaymentMethod = 'CASH' | 'CARD'

// Cart types for Zustand store
export interface CartItem {
  productId: string
  product: Product
  quantity: number
  unitPrice: number
}

// API response types — Discriminated union for type-safe narrowing
export type ApiResponse<T> = { success: true; data: T } | { success: false; error: string }

// Dashboard statistics
export interface DashboardStats {
  dailyRevenue: number
  totalOrders: number
  paymentMethodBreakdown: {
    cash: number
    card: number
  }
  topProducts: {
    productId: string
    productName: string
    quantity: number
  }[]
}

// Extended Dashboard statistics with real-time KPIs
export interface ExtendedDashboardStats extends DashboardStats {
  openTables: number
  pendingOrders: number
  hourlyActivity: HourlyActivityItem[]
  categoryBreakdown: { categoryName: string; revenue: number; quantity: number; icon?: string }[]
  dailyExpenses: number
}

export interface HourlyActivityItem {
  hour: string
  revenue: number
  orderCount: number
}

// Revenue trend data for charts
export interface RevenueTrendItem {
  date: string
  revenue: number
  orderCount: number
}

// Daily Summary (Z-Report)
export interface DailySummary {
  id: string
  date: Date
  totalCash: number
  actualCash: number | null
  totalCard: number
  totalExpenses: number
  netProfit: number
  cancelCount: number
  totalVat: number
  orderCount: number
  totalRevenue: number
  createdAt: Date
}

// Activity Log
export interface ActivityLog {
  id: string
  action: string
  tableName?: string
  userName?: string
  details?: string
  createdAt: Date
}

// Activity Log Action Types
export type ActivityAction =
  | 'OPEN_TABLE'
  | 'CLOSE_ORDER'
  | 'CLOSE_TABLE'
  | 'CANCEL_ITEM'
  | 'CHANGE_PRICE'
  | 'ADD_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'ADD_ITEM'
  | 'REMOVE_ITEM'
  | 'UPDATE_ITEM'
  | 'TRANSFER_TABLE'
  | 'MERGE_TABLES'
  | 'TOGGLE_LOCK'
  | 'GENERATE_ZREPORT'
  | 'ARCHIVE_DATA'
  | 'ARCHIVE_EXPENSES'
  | 'ARCHIVE_SUMMARIES'
  | 'BACKUP_DATABASE'
  | 'VACUUM'
  | 'SEED_DATABASE'
  | 'SECURITY_RESCUE'
  | 'SECURITY_CHANGE_PIN'
  | 'SECURITY_RESET_PIN'
  | 'PAYMENT'

// App Settings
export interface AppSettings {
  id: string
  adminPin: string
  securityQuestion?: string
  securityAnswer?: string
}

// Boot Bundle
export interface BootBundle {
  products: Product[]
  categories: Category[]
  tables: Table[]
}

// Expenses
export interface Expense {
  id: string
  description: string
  amount: number
  category?: string
  paymentMethod?: 'CASH' | 'CARD'
  createdAt: Date
}

export interface ExpenseStats {
  todayTotal: number
  monthTotal: number
  topCategory?: {
    name: string
    total: number
  }
}

// Dashboard Bundle
export interface DashboardBundle {
  stats: ExtendedDashboardStats
  revenueTrend: RevenueTrendItem[]
  monthlyReports: MonthlyReport[]
}

// Monthly Report
export interface MonthlyReport {
  id: string
  monthDate: Date
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  orderCount: number
  updatedAt: Date
}

// Maintenance & Cleanup
export interface ArchiveDataResult {
  deletedOrders: number
  deletedItems: number
  deletedTransactions: number
  deletedExpenses: number
  deletedSummaries: number
}

export interface EndOfDayCheckResult {
  canProceed: boolean
  openTables: Array<{
    tableId: string
    tableName: string
    orderId: string
    totalAmount: number
  }>
}

// Update Information
export interface UpdateInfo {
  version: string
  files: {
    url: string
    sha512: string
    size: number
  }[]
  path: string
  sha512: string
  releaseName?: string
  releaseNotes?: string | Array<string>
  releaseDate: string
  safeToUpdate?: boolean
}

// IPC Channel names
export const IPC_CHANNELS = {
  // Tables
  TABLES_GET_ALL: 'tables:getAll',
  TABLES_CREATE: 'tables:create',
  TABLES_DELETE: 'tables:delete',
  TABLES_GET_WITH_STATUS: 'tables:getWithStatus',
  TABLES_TRANSFER: 'tables:transfer',
  TABLES_MERGE: 'tables:merge',

  // Products
  PRODUCTS_GET_ALL: 'products:getAll',
  PRODUCTS_GET_BY_CATEGORY: 'products:getByCategory',
  PRODUCTS_GET_FAVORITES: 'products:getFavorites',
  PRODUCTS_SEARCH: 'products:search',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_DELETE: 'products:delete',

  // Categories
  CATEGORIES_GET_ALL: 'categories:getAll',
  CATEGORIES_CREATE: 'categories:create',
  CATEGORIES_UPDATE: 'categories:update',
  CATEGORIES_DELETE: 'categories:delete',

  // Orders
  ORDERS_CREATE: 'orders:create',
  ORDERS_UPDATE: 'orders:update',
  ORDERS_GET_OPEN_BY_TABLE: 'orders:getOpenByTable',
  ORDERS_ADD_ITEM: 'orders:addItem',
  ORDERS_REMOVE_ITEM: 'orders:removeItem',
  ORDERS_UPDATE_ITEM: 'orders:updateItem',
  ORDERS_DELETE: 'orders:delete',
  ORDERS_TRANSFER: 'orders:transfer',
  ORDERS_MERGE: 'orders:merge',
  ORDERS_TOGGLE_LOCK: 'orders:toggleLock',
  ORDERS_MARK_ITEMS_PAID: 'orders:markItemsPaid',

  // Payments
  PAYMENTS_CREATE: 'payments:create',
  PAYMENTS_GET_BY_ORDER: 'payments:getByOrder',

  // Dashboard
  DASHBOARD_GET_STATS: 'dashboard:getStats',
  DASHBOARD_GET_EXTENDED_STATS: 'dashboard:getExtendedStats',
  DASHBOARD_GET_REVENUE_TREND: 'dashboard:getRevenueTrend',
  DASHBOARD_GET_BUNDLE: 'dashboard:getBundle',

  // Expenses
  EXPENSES_CREATE: 'expenses:create',
  EXPENSES_GET_ALL: 'expenses:getAll',
  EXPENSES_GET_STATS: 'expenses:getStats',
  EXPENSES_UPDATE: 'expenses:update',
  EXPENSES_DELETE: 'expenses:delete',

  // Admin
  ADMIN_VERIFY_PIN: 'admin:verifyPin',
  ADMIN_CHECK_STATUS: 'admin:checkStatus',
  ADMIN_CHANGE_PIN: 'admin:changePin',
  ADMIN_SET_RECOVERY: 'admin:setRecovery',
  ADMIN_GET_RECOVERY_QUESTION: 'admin:getRecoveryQuestion',
  ADMIN_RESET_PIN: 'admin:resetPin',

  // Reports
  REPORTS_GET_MONTHLY: 'reports:getMonthly',

  // Z-Report
  ZREPORT_GENERATE: 'zreport:generate',
  ZREPORT_GET_HISTORY: 'zreport:getHistory',

  // Activity Logs
  LOGS_GET_RECENT: 'logs:getRecent',
  LOGS_CREATE: 'logs:create',
  LOGS_GET_STATS_TODAY: 'logs:getStatsToday',

  // Maintenance
  MAINTENANCE_ARCHIVE_OLD_DATA: 'maintenance:archiveOldData',
  MAINTENANCE_EXPORT_DATA: 'maintenance:exportData',
  MAINTENANCE_VACUUM: 'maintenance:vacuum',
  MAINTENANCE_BACKUP: 'maintenance:backup',
  MAINTENANCE_BACKUP_WITH_ROTATION: 'maintenance:backupWithRotation',

  // End of Day
  END_OF_DAY_CHECK: 'endOfDay:check',
  END_OF_DAY_EXECUTE: 'endOfDay:execute',

  // Order History
  ORDERS_GET_HISTORY: 'orders:getHistory',
  ORDERS_GET_DETAILS: 'orders:getDetails',

  // Seed
  SEED_DATABASE: 'seed:database',

  // System
  SYSTEM_CHECK: 'system:check',
  SYSTEM_CHECK_UPDATE: 'system:checkUpdate',
  SYSTEM_DOWNLOAD_UPDATE: 'system:downloadUpdate',
  SYSTEM_GET_VERSION: 'system:getVersion',
  SYSTEM_RESTART: 'system:restart',
  SYSTEM_GET_BOOT_BUNDLE: 'system:getBootBundle',

  // Window Controls
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',

  // Auto-Update Events (forwarded from main process)
  UPDATE_CHECKING: 'checking-for-update',
  UPDATE_AVAILABLE: 'update-available',
  UPDATE_NOT_AVAILABLE: 'update-not-available',
  UPDATE_DOWNLOAD_PROGRESS: 'download-progress',
  UPDATE_DOWNLOADED: 'update-downloaded',
  UPDATE_ERROR: 'update-error'
} as const
