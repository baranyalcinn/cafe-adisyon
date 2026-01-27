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
  admin: adminService.auth,
  maintenance: adminService.maintenance,
  seed: adminService.seed,
  system: adminService.system,

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
