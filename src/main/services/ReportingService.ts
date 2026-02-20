import {
  ApiResponse,
  DailySummary,
  ExtendedDashboardStats,
  MonthlyReport,
  RevenueTrendItem
} from '../../shared/types'
import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'
import { logService } from './LogService'

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

      // 1. Get ALL closed orders count since last report
      const periodicOrdersCount = await prisma.order.count({
        where: {
          status: 'CLOSED',
          createdAt: { gt: startDate, lte: now }
        }
      })

      // 2. Get Revenue & Payment Breakdown using Aggregation
      const [transactionAgg, paymentMethodAgg] = await Promise.all([
        // Total revenue from all transactions
        prisma.transaction.aggregate({
          where: { createdAt: { gt: startDate, lte: now } },
          _sum: { amount: true }
        }),
        // Breakdown by payment method
        prisma.transaction.groupBy({
          by: ['paymentMethod'],
          where: { createdAt: { gt: startDate, lte: now } },
          _sum: { amount: true }
        })
      ])

      const totalRevenue = transactionAgg._sum.amount || 0

      // Extract cash/card totals from groupBy result
      const totalCash = paymentMethodAgg.find((p) => p.paymentMethod === 'CASH')?._sum.amount || 0
      const totalCard = paymentMethodAgg.find((p) => p.paymentMethod === 'CARD')?._sum.amount || 0

      // 3. Get Total Expenses using Aggregation
      const expenseAgg = await prisma.expense.aggregate({
        where: { createdAt: { gt: startDate, lte: now } },
        _sum: { amount: true }
      })
      const totalExpenses = expenseAgg._sum.amount || 0

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
        `Gün sonu Z-Raporu oluşturuldu: ₺${totalRevenue / 100}`
      )

      return { success: true, data: summary }
    } catch (error) {
      logger.error('ReportingService.generateZReport', error)
      return { success: false, error: 'Z-Raporu oluşturulamadı.' }
    }
  }

  /**
   * Shared base stats calculation used by both getDashboardStats and getExtendedDashboardStats.
   * Avoids duplicating the common queries for transactions, items, and top products.
   */
  private async getBaseStats(topProductLimit: number = 5): Promise<{
    today: Date
    dailyRevenue: number
    totalOrders: number
    paymentMethodBreakdown: { cash: number; card: number }
    topProducts: { productId: string; productName: string; quantity: number }[]
    bottomProducts: { productId: string; productName: string; quantity: number }[]
    categoryBreakdown: { categoryName: string; revenue: number; quantity: number }[]
    todayOrders: { id: string; totalAmount: number; createdAt: Date }[]
  }> {
    const now = new Date()
    const currentHour = now.getHours()

    const today = new Date(now)
    if (currentHour < 5) {
      today.setDate(today.getDate() - 1)
    }
    today.setHours(0, 0, 0, 0)

    // Parallel fetch: transactions, order items, and orders
    const [todayTransactions, todayItems, todayOrders] = await Promise.all([
      prisma.transaction.findMany({ where: { createdAt: { gte: today } } }),
      prisma.orderItem.findMany({
        where: { order: { status: 'CLOSED', createdAt: { gte: today } } },
        include: { product: { include: { category: true } } }
      }),
      prisma.order.findMany({ where: { status: 'CLOSED', createdAt: { gte: today } } })
    ])

    const dailyRevenue = todayTransactions.reduce((sum, t) => sum + t.amount, 0)

    const paymentMethodBreakdown = {
      cash: todayTransactions
        .filter((p) => p.paymentMethod === 'CASH')
        .reduce((sum, p) => sum + p.amount, 0),
      card: todayTransactions
        .filter((p) => p.paymentMethod === 'CARD')
        .reduce((sum, p) => sum + p.amount, 0)
    }

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

    const allProducts = Array.from(productCounts.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantity: data.quantity
      }))
      .sort((a, b) => b.quantity - a.quantity)

    const topProducts = allProducts.slice(0, topProductLimit)
    const bottomProducts =
      allProducts.length > topProductLimit ? [...allProducts].reverse().slice(0, 5) : []

    // Category breakdown
    const categoryMap = new Map<string, { revenue: number; quantity: number; icon?: string }>()
    todayItems.forEach((item) => {
      const catName =
        (item.product as unknown as { category?: { name: string } }).category?.name || 'Diğer'
      const catIcon = (item.product as unknown as { category?: { icon?: string } }).category?.icon
      const existing = categoryMap.get(catName) || { revenue: 0, quantity: 0 }
      categoryMap.set(catName, {
        revenue: existing.revenue + item.quantity * item.unitPrice,
        quantity: existing.quantity + item.quantity,
        icon: catIcon
      })
    })
    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([categoryName, data]) => ({ categoryName, ...data }))
      .sort((a, b) => b.revenue - a.revenue)

    return {
      today,
      dailyRevenue,
      totalOrders: todayOrders.length,
      paymentMethodBreakdown,
      topProducts,
      bottomProducts,
      categoryBreakdown,
      todayOrders
    }
  }

  // NOTE: getDashboardStats removed — only getExtendedDashboardStats is used by the frontend.

  async getExtendedDashboardStats(): Promise<ApiResponse<ExtendedDashboardStats>> {
    try {
      const {
        dailyRevenue,
        totalOrders,
        paymentMethodBreakdown,
        topProducts,
        bottomProducts,
        categoryBreakdown,
        todayOrders,
        today
      } = await this.getBaseStats(10)

      const [openTables, pendingOrders, expensesAggregate] = await Promise.all([
        prisma.table.count({ where: { orders: { some: { status: 'OPEN' } } } }),
        prisma.order.count({ where: { status: 'OPEN', items: { some: {} } } }),
        prisma.expense.aggregate({ where: { createdAt: { gte: today } }, _sum: { amount: true } })
      ])

      const dailyExpenses = expensesAggregate._sum.amount || 0

      // Calculate Hourly Activity from closed orders
      const hourlyStats = new Map<number, { revenue: number; count: number }>()
      for (let i = 0; i < 24; i++) {
        hourlyStats.set(i, { revenue: 0, count: 0 })
      }

      todayOrders.forEach((order) => {
        const hour = order.createdAt.getHours()
        const current = hourlyStats.get(hour) || { revenue: 0, count: 0 }
        hourlyStats.set(hour, {
          revenue: current.revenue + order.totalAmount,
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
          totalOrders,
          paymentMethodBreakdown,
          topProducts,
          bottomProducts,
          categoryBreakdown,
          dailyExpenses,
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
      const result: RevenueTrendItem[] = []
      const promises: Promise<void>[] = []

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setHours(0, 0, 0, 0)
        date.setDate(date.getDate() - i)

        const nextDay = new Date(date)
        nextDay.setDate(nextDay.getDate() + 1)

        const promise = (async () => {
          const [revenueAgg, orderCount] = await Promise.all([
            prisma.transaction.aggregate({
              where: { createdAt: { gte: date, lt: nextDay } },
              _sum: { amount: true }
            }),
            prisma.order.count({
              where: { status: 'CLOSED', createdAt: { gte: date, lt: nextDay } }
            })
          ])

          result.push({
            date: date.toISOString(),
            revenue: revenueAgg._sum.amount || 0,
            orderCount
          })
        })()

        promises.push(promise)
      }

      await Promise.all(promises)
      // Sort result by date to ensure chronological order after async parallel execution
      result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

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

      // Parallel fetch: 3 queries at once instead of sequential
      const [revenueAgg, orderCount, expenseAgg] = await Promise.all([
        prisma.transaction.aggregate({
          where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
          _sum: { amount: true }
        }),
        prisma.order.count({
          where: {
            status: 'CLOSED',
            createdAt: { gte: startOfMonth, lte: endOfMonth }
          }
        }),
        prisma.expense.aggregate({
          where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
          _sum: { amount: true }
        })
      ])

      const totalRevenue = revenueAgg._sum.amount || 0
      const totalExpenses = expenseAgg._sum.amount || 0
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
