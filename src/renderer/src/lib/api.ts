// Services
import { tableService } from '../services/tableService'
import { categoryService } from '../services/categoryService'
import { productService } from '../services/productService'
import { orderService } from '../services/orderService'
import { paymentService } from '../services/paymentService'
import { dashboardService } from '../services/dashboardService'
import { expenseService } from '../services/expenseService'
import { adminService } from '../services/adminService'
import { reportService } from '../services/reportService'

// Types
import type {
  Table,
  Product,
  Category,
  Order,
  OrderItem,
  Transaction,
  CartItem,
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

// Re-export types for convenience
export type {
  Table,
  Product,
  Category,
  Order,
  OrderItem,
  Transaction,
  CartItem,
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

// Type-safe API wrapper composed of modular services
export const cafeApi = {
  tables: tableService,
  categories: categoryService,
  products: productService,
  orders: orderService,
  payments: paymentService,
  dashboard: dashboardService,
  expenses: expenseService,

  // Admin & System
  // Admin & System
  admin: {
    verifyPin: adminService.verifyPin,
    checkAdminStatus: adminService.checkAdminStatus,
    changePin: adminService.changePin,
    setRecovery: adminService.setRecovery,
    getRecoveryQuestion: adminService.getRecoveryQuestion,
    resetPin: adminService.resetPin
  },
  maintenance: {
    vacuumDatabase: adminService.vacuumDatabase,
    backupDatabase: adminService.backupDatabase,
    archiveOldData: adminService.archiveOldData,
    exportData: adminService.exportDatabase,
    checkEndOfDay: reportService.endOfDay.check,
    executeEndOfDay: reportService.endOfDay.execute,
    importLegacyData: adminService.importLegacyData
  },
  seed: {
    seedDatabase: adminService.seedDatabase
  },
  system: {
    check: adminService.systemCheck
  },

  // Reporting
  zReport: reportService.zReport,
  logs: reportService.logs,
  endOfDay: reportService.endOfDay,

  reports: {
    getMonthly: reportService.monthly.get
  },

  // Legacy mappings adjustments if needed
  orderHistory: {
    get: orderService.getHistory
  }
}
