import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'
import { logService } from './LogService'
import {
  ApiResponse,
  DailySummary,
  DashboardStats,
  ExtendedDashboardStats,
  MonthlyReport,
  RevenueTrendItem
} from '../../shared/types'

export class ReportingService {
  /**
   * Generates a Z-Report for the current shift.
   * Logic: Revenue is based on TRANSACTIONS (Payments) collected since last report.
   * Orders count is based on CLOSED orders.
   * Handles midnight shifts by smart-dating < 5AM to yesterday.
   */
  async generateZReport(actualCash?: number): Promise<ApiResponse<DailySummary>> {
    try {
      const now = new Date()
      const currentHour = now.getHours()

      // Smart Dating: If before 05:00 AM, assume it belongs to the previous day (Shift logic)
      const reportDate = new Date(now)
      if (currentHour < 5) {
        reportDate.setDate(reportDate.getDate() - 1)
      }
      reportDate.setHours(0, 0, 0, 0)

      // Find the Last Z-Report taken BEFORE this report date
      const lastReport = await prisma.dailySummary.findFirst({
        where: {
          date: { lt: reportDate }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      const startDate = lastReport ? lastReport.createdAt : new Date(0)

      // Get ALL closed orders since the last Z-Report (For Order Count)
      const periodicOrdersCount = await prisma.order.count({
        where: {
          status: 'CLOSED',
          createdAt: {
            gt: startDate,
            lte: now
          }
        }
      })

      // Get ALL transactions (payments) since the last Z-Report (For Revenue)
      const periodicTransactions = await prisma.transaction.findMany({
        where: {
          createdAt: {
            gt: startDate,
            lte: now
          }
        }
      })

      // Get expenses in the same period
      const periodicExpenses = await prisma.expense.findMany({
        where: {
          createdAt: {
            gt: startDate,
            lte: now
          }
        }
      })

      // Calculate totals from TRANSACTIONS
      const totalCash = periodicTransactions
        .filter((t) => t.paymentMethod === 'CASH')
        .reduce((sum, t) => sum + t.amount, 0)

      const totalCard = periodicTransactions
        .filter((t) => t.paymentMethod === 'CARD')
        .reduce((sum, t) => sum + t.amount, 0)

      const totalRevenue = totalCash + totalCard

      const totalExpenses = periodicExpenses.reduce((sum, e) => sum + e.amount, 0)
      const netProfit = totalRevenue - totalExpenses
      const totalVat = Math.round(totalRevenue * 0.1)

      // Upsert summary
      const summary = await prisma.dailySummary.upsert({
        where: { date: reportDate },
        create: {
          date: reportDate,
          totalCash,
          actualCash: actualCash ?? totalCash,
          totalCard,
          totalExpenses,
          netProfit,
          cancelCount: 0,
          totalVat,
          orderCount: periodicOrdersCount,
          totalRevenue
        },
        update: {
          totalCash,
          actualCash: actualCash ?? totalCash,
          totalCard,
          totalExpenses,
          netProfit,
          totalVat,
          orderCount: periodicOrdersCount,
          totalRevenue,
          createdAt: now
        }
      })

      await this.updateMonthlyReport(reportDate)

      // Log activity
      await logService.createLog(
        'GENERATE_ZREPORT',
        undefined,
        `Gün sonu Z-Raporu oluşturuldu: ₺${(totalRevenue / 100).toFixed(2)}`
      )

      return { success: true, data: summary }
    } catch (error) {
      logger.error('ReportingService.generateZReport', error)
      return { success: false, error: 'Z-Raporu oluşturulamadı.' }
    }
  }

  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    try {
      const now = new Date()
      const currentHour = now.getHours()

      const today = new Date(now)
      if (currentHour < 5) {
        today.setDate(today.getDate() - 1)
      }
      today.setHours(0, 0, 0, 0)

      // For Order Count
      const todayOrdersCount = await prisma.order.count({
        where: {
          status: 'CLOSED',
          createdAt: { gte: today }
        }
      })

      // For Revenue (Transactions)
      const todayTransactions = await prisma.transaction.findMany({
        where: {
          createdAt: { gte: today }
        }
      })

      const dailyRevenue = todayTransactions.reduce((sum, t) => sum + t.amount, 0)

      const paymentMethodBreakdown = {
        cash: todayTransactions
          .filter((p) => p.paymentMethod === 'CASH')
          .reduce((sum, p) => sum + p.amount, 0),
        card: todayTransactions
          .filter((p) => p.paymentMethod === 'CARD')
          .reduce((sum, p) => sum + p.amount, 0)
      }

      const todayItems = await prisma.orderItem.findMany({
        where: {
          order: {
            status: 'CLOSED',
            createdAt: { gte: today }
          }
        },
        include: { product: true }
      })

      const productCounts = new Map<string, { name: string; quantity: number }>()
      todayItems.forEach((item) => {
        const existing = productCounts.get(item.productId)
        if (existing) {
          existing.quantity += item.quantity
        } else {
          productCounts.set(item.productId, {
            name: item.product.name,
            quantity: item.quantity
          })
        }
      })

      const topProducts = Array.from(productCounts.entries())
        .map(([productId, data]) => ({
          productId,
          productName: data.name,
          quantity: data.quantity
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

      return {
        success: true,
        data: {
          dailyRevenue,
          totalOrders: todayOrdersCount,
          paymentMethodBreakdown,
          topProducts
        }
      }
    } catch (error) {
      logger.error('ReportingService.getDashboardStats', error)
      return { success: false, error: String(error) }
    }
  }

  async getExtendedDashboardStats(): Promise<ApiResponse<ExtendedDashboardStats>> {
    try {
      const now = new Date()
      const currentHour = now.getHours()

      const today = new Date(now)
      if (currentHour < 5) {
        today.setDate(today.getDate() - 1)
      }
      today.setHours(0, 0, 0, 0)

      // For Order Count & Hourly Activity (Orders based)
      const todayOrders = await prisma.order.findMany({
        where: {
          status: 'CLOSED',
          createdAt: { gte: today }
        }
      })

      // For Revenue (Transactions)
      const todayTransactions = await prisma.transaction.findMany({
        where: {
          createdAt: { gte: today }
        }
      })

      const dailyRevenue = todayTransactions.reduce((sum, t) => sum + t.amount, 0)

      const paymentMethodBreakdown = {
        cash: todayTransactions
          .filter((p) => p.paymentMethod === 'CASH')
          .reduce((sum, p) => sum + p.amount, 0),
        card: todayTransactions
          .filter((p) => p.paymentMethod === 'CARD')
          .reduce((sum, p) => sum + p.amount, 0)
      }

      const todayItems = await prisma.orderItem.findMany({
        where: {
          order: {
            status: 'CLOSED',
            createdAt: { gte: today }
          }
        },
        include: { product: true }
      })

      const productCounts = new Map<string, { name: string; quantity: number }>()
      todayItems.forEach((item) => {
        const existing = productCounts.get(item.productId)
        if (existing) {
          existing.quantity += item.quantity
        } else {
          productCounts.set(item.productId, {
            name: item.product.name,
            quantity: item.quantity
          })
        }
      })

      const topProducts = Array.from(productCounts.entries())
        .map(([productId, data]) => ({
          productId,
          productName: data.name,
          quantity: data.quantity
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)

      const openTables = await prisma.table.count({
        where: {
          orders: {
            some: { status: 'OPEN' }
          }
        }
      })

      const pendingOrders = await prisma.order.count({
        where: {
          status: 'OPEN',
          items: { some: {} }
        }
      })

      // Calculate Hourly Activity
      // NOTE: Activity is simpler to map to Orders because Transactions can be multiple per order.
      // But for consistency with revenue, we should probably stick to Order closes for "Activity"
      // or change activity to "Transactions"?
      // Let's keep "Activity" as "Orders Closed" count, but maybe Revenue part of activity derived from transactions?
      // For simplicity and alignment with chart, using Orders for hourly distribution is safer for now
      // unless user wants strict hourly cash flow.
      // Existing logic uses `todayOrders` (now without payments included).
      const hourlyStats = new Map<number, { revenue: number; count: number }>()

      // Initialize all hours with 0
      for (let i = 0; i < 24; i++) {
        hourlyStats.set(i, { revenue: 0, count: 0 })
      }

      todayOrders.forEach((order) => {
        const hour = order.createdAt.getHours()
        const current = hourlyStats.get(hour) || { revenue: 0, count: 0 }
        hourlyStats.set(hour, {
          revenue: current.revenue + order.totalAmount, // This is still Order Total, might vary from actual cash collected if partials exist.
          // Ideally this should merge with transaction times.
          // But strict "When was it busy?" is answered by Order Close Time.
          // While "When did we get money?" is Transaction Time.
          // Let's leave this on Order Time for now to match the "Order Count" visual.
          // Changing this to transaction time would mismatch Order Count.
          count: current.count + 1
        })
      })

      const hourlyActivity = Array.from(hourlyStats.entries())
        .map(([hour, stats]) => ({
          hour: `${hour.toString().padStart(2, '0')}:00`,
          revenue: stats.revenue,
          orderCount: stats.count
        }))
        .sort((a, b) => a.hour.localeCompare(b.hour))

      return {
        success: true,
        data: {
          dailyRevenue,
          totalOrders: todayOrders.length,
          paymentMethodBreakdown,
          topProducts,
          openTables,
          pendingOrders,
          hourlyActivity
        }
      }
    } catch (error) {
      logger.error('ReportingService.getExtendedDashboardStats', error)
      return { success: false, error: String(error) }
    }
  }

  async getRevenueTrend(days: number = 7): Promise<ApiResponse<RevenueTrendItem[]>> {
    try {
      const result: { date: string; revenue: number; orderCount: number }[] = []

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setHours(0, 0, 0, 0)
        date.setDate(date.getDate() - i)

        const nextDay = new Date(date)
        nextDay.setDate(nextDay.getDate() + 1)

        // 1. Get Revenue (Transactions)
        const revenueAgg = await prisma.transaction.aggregate({
          where: {
            createdAt: { gte: date, lt: nextDay }
          },
          _sum: { amount: true }
        })

        // 2. Get Order Count (Closed Orders)
        const orderCount = await prisma.order.count({
          where: {
            status: 'CLOSED',
            createdAt: { gte: date, lt: nextDay }
          }
        })

        const revenue = revenueAgg._sum.amount || 0

        result.push({
          date: date.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' }),
          revenue,
          orderCount: orderCount
        })
      }

      return { success: true, data: result }
    } catch (error) {
      logger.error('ReportingService.getRevenueTrend', error)
      return { success: false, error: String(error) }
    }
  }

  async updateMonthlyReport(date: Date): Promise<void> {
    try {
      // Normalize to UTC start of the month to prevent timezone-shift-induced separate records
      const startOfMonth = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1))
      const endOfMonth = new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59))

      // 1. Get Revenue (Transactions)
      const revenueAgg = await prisma.transaction.aggregate({
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth }
        },
        _sum: { amount: true }
      })

      // 2. Get Order Count
      const orderCount = await prisma.order.count({
        where: {
          status: 'CLOSED',
          createdAt: { gte: startOfMonth, lte: endOfMonth }
        }
      })

      const monthExpenses = await prisma.expense.findMany({
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth }
        }
      })

      const totalRevenue = revenueAgg._sum.amount || 0
      const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0)
      const netProfit = totalRevenue - totalExpenses

      logger.info(
        'ReportingService.updateMonthlyReport',
        `Updating report for ${startOfMonth.toISOString()}: Revenue=${totalRevenue}, Expenses=${totalExpenses}, Profit=${netProfit}`
      )

      await prisma.monthlyReport.upsert({
        where: { monthDate: startOfMonth },
        update: {
          totalRevenue,
          totalExpenses,
          netProfit,
          orderCount: orderCount
        },
        create: {
          monthDate: startOfMonth,
          totalRevenue,
          totalExpenses,
          netProfit,
          orderCount: orderCount
        }
      })
    } catch (error) {
      logger.error('ReportingService.updateMonthlyReport', error)
    }
  }

  async getReportsHistory(
    limit: number = 30,
    startDate?: Date | string,
    endDate?: Date | string
  ): Promise<ApiResponse<DailySummary[]>> {
    try {
      // Explicitly convert to Date objects to ensure IPC reliability
      const start =
        startDate && !isNaN(new Date(startDate).getTime()) ? new Date(startDate) : undefined
      const end = endDate && !isNaN(new Date(endDate).getTime()) ? new Date(endDate) : undefined

      logger.info(
        'ReportingService.getReportsHistory',
        `Fetching reports: limit=${limit}, start=${start ? start.toISOString() : 'any'}, end=${end ? end.toISOString() : 'any'}`
      )

      const reports = await prisma.dailySummary.findMany({
        where: {
          ...(start || end
            ? {
                date: {
                  ...(start && { gte: start }),
                  ...(end && { lte: end })
                }
              }
            : {})
        },
        orderBy: { date: 'desc' },
        take: limit
      })

      logger.info('ReportingService.getReportsHistory', `Found ${reports.length} reports`)
      return { success: true, data: reports }
    } catch (error) {
      logger.error('ReportingService.getReportsHistory', error)
      return { success: false, error: String(error) }
    }
  }

  async getMonthlyReports(limit: number = 12): Promise<ApiResponse<MonthlyReport[]>> {
    try {
      const reports = await prisma.monthlyReport.findMany({
        orderBy: { monthDate: 'desc' },
        take: limit
      })
      return { success: true, data: reports }
    } catch (error) {
      logger.error('ReportingService.getMonthlyReports', error)
      return { success: false, error: 'Aylık raporlar alınamadı.' }
    }
  }
}

export const reportingService = new ReportingService()
