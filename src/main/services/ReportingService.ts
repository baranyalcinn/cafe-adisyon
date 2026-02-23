import { startOfDay, startOfMonth, subDays } from 'date-fns'
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

const DEFAULT_VAT_RATE = 0.1

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

      // Smart Dating: If before 05:00 AM, assume it belongs to the previous day (Shift logic)
      let reportDate = startOfDay(now)
      if (now.getHours() < 5) {
        reportDate = subDays(reportDate, 1)
      }

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
      const totalVat = Math.round(totalRevenue * DEFAULT_VAT_RATE)

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

      await this.incrementMonthlyReport(
        reportDate,
        totalRevenue,
        totalExpenses,
        netProfit,
        periodicOrdersCount
      )

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
    categoryBreakdown: { categoryName: string; revenue: number; quantity: number }[]
  }> {
    const now = new Date()
    let today = startOfDay(now)
    if (now.getHours() < 5) {
      today = subDays(today, 1)
    }

    // Fetch Orders count directly
    const totalOrders = await prisma.order.count({
      where: { status: 'CLOSED', createdAt: { gte: today } }
    })

    // Parallel fetch: transaction sums and orderItem grouping
    const [transactionAgg, paymentMethods, orderItemGroups] = await Promise.all([
      prisma.transaction.aggregate({
        where: { createdAt: { gte: today } },
        _sum: { amount: true }
      }),
      prisma.transaction.groupBy({
        by: ['paymentMethod'],
        where: { createdAt: { gte: today } },
        _sum: { amount: true }
      }),
      prisma.orderItem.groupBy({
        by: ['productId', 'unitPrice'],
        where: { order: { status: 'CLOSED', createdAt: { gte: today } } },
        _sum: { quantity: true }
      })
    ])

    const dailyRevenue = transactionAgg._sum.amount || 0

    const paymentMethodBreakdown = {
      cash: paymentMethods.find((p) => p.paymentMethod === 'CASH')?._sum.amount || 0,
      card: paymentMethods.find((p) => p.paymentMethod === 'CARD')?._sum.amount || 0
    }

    // Since we can't join relations in Prisma groupBy, fetch product metadata for the grouped items
    const productIds = Array.from(new Set(orderItemGroups.map((g) => g.productId)))
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        category: {
          select: {
            name: true,
            icon: true
          }
        }
      }
    })

    const productCounts = new Map<string, { name: string; quantity: number }>()
    const categoryMap = new Map<string, { revenue: number; quantity: number; icon?: string }>()

    orderItemGroups.forEach((group) => {
      const quantity = group._sum.quantity || 0
      const productId = group.productId
      const unitPrice = group.unitPrice
      const product = products.find((p) => p.id === productId)

      const productName = product?.name || 'Ürün'

      // Accumulate Product quantities (ignoring unitPrice splits here, just total quantity per product)
      const existingProd = productCounts.get(productId)
      if (existingProd) {
        existingProd.quantity += quantity
      } else {
        productCounts.set(productId, { name: productName, quantity })
      }

      // Accumulate Category breakdowns
      const catName = product?.category?.name || 'Diğer'
      const catIcon = product?.category?.icon
      const existingCat = categoryMap.get(catName) || { revenue: 0, quantity: 0 }

      categoryMap.set(catName, {
        revenue: existingCat.revenue + quantity * unitPrice,
        quantity: existingCat.quantity + quantity,
        icon: catIcon
      })
    })

    const allProducts = Array.from(productCounts.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantity: data.quantity
      }))
      .sort((a, b) => b.quantity - a.quantity)

    const topProducts = allProducts.slice(0, topProductLimit)

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([categoryName, data]) => ({ categoryName, ...data }))
      .sort((a, b) => b.revenue - a.revenue)

    return {
      today,
      dailyRevenue,
      totalOrders,
      paymentMethodBreakdown,
      topProducts,
      categoryBreakdown
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
        categoryBreakdown,
        today
      } = await this.getBaseStats(10)

      const [openTables, pendingOrders, expensesAggregate, hourlyAgg] = await Promise.all([
        prisma.table.count({ where: { orders: { some: { status: 'OPEN' } } } }),
        prisma.order.count({ where: { status: 'OPEN', items: { some: {} } } }),
        prisma.expense.aggregate({ where: { createdAt: { gte: today } }, _sum: { amount: true } }),
        // Group by hour in SQL instead of Node to avoid memory bloat
        prisma.$queryRaw<{ hour: string; revenue: number | bigint; count: number | bigint }[]>`
          SELECT
            strftime('%H', "createdAt", 'localtime') as hour,
            SUM("totalAmount") as revenue,
            COUNT(id) as count
          FROM "Order"
          WHERE "status" = 'CLOSED' AND "createdAt" >= ${today.toISOString()}
          GROUP BY hour
        `
      ])

      const dailyExpenses = expensesAggregate._sum.amount || 0

      // Calculate Hourly Activity from closed orders aggregated in DB
      const hourlyStats = new Map<string, { revenue: number; count: number }>()
      for (let i = 0; i < 24; i++) {
        hourlyStats.set(i.toString().padStart(2, '0'), { revenue: 0, count: 0 })
      }

      for (const row of hourlyAgg) {
        if (!row.hour) continue
        const hourStr = row.hour
        const current = hourlyStats.get(hourStr) || { revenue: 0, count: 0 }
        hourlyStats.set(hourStr, {
          revenue: current.revenue + Number(row.revenue || 0),
          count: current.count + Number(row.count || 0)
        })
      }

      const hourlyActivity = Array.from(hourlyStats.entries())
        .map(([hour, stats]) => ({
          hour: `${hour}:00`,
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

      // 1. Calculate the start boundary
      const startDate = subDays(startOfDay(new Date()), days - 1)

      // 2. Fetch aggregated buckets via raw SQL instead of mapping in Node.js
      const [transactionsArr, ordersArr] = await Promise.all([
        prisma.$queryRaw<{ date: string; revenue: number | bigint }[]>`
          SELECT
            strftime('%Y-%m-%d', "createdAt", 'localtime') as date,
            SUM(amount) as revenue
          FROM "Transaction"
          WHERE "createdAt" >= ${startDate.toISOString()}
          GROUP BY date
        `,
        prisma.$queryRaw<{ date: string; count: number | bigint }[]>`
          SELECT
            strftime('%Y-%m-%d', "createdAt", 'localtime') as date,
            COUNT(id) as count
          FROM "Order"
          WHERE "status" = 'CLOSED' AND "createdAt" >= ${startDate.toISOString()}
          GROUP BY date
        `
      ])

      // 3. O(1) Bucket Map merge
      const buckets = new Map<string, { revenue: number; orderCount: number }>()

      for (const t of transactionsArr) {
        if (!t.date) continue
        const b = buckets.get(t.date) ?? { revenue: 0, orderCount: 0 }
        b.revenue += Number(t.revenue || 0)
        buckets.set(t.date, b)
      }

      for (const o of ordersArr) {
        if (!o.date) continue
        const b = buckets.get(o.date) ?? { revenue: 0, orderCount: 0 }
        b.orderCount += Number(o.count || 0)
        buckets.set(o.date, b)
      }

      const toDayKey = (d: Date): string => {
        // Enforcing local time breakdown since businesses operate on local dates, not UTC borders.
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      // 4. Extract into correctly ordered result list based on `days` window
      const todayStart = startOfDay(new Date())
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(todayStart, i)

        const k = toDayKey(date)
        const bucket = buckets.get(k) || { revenue: 0, orderCount: 0 }

        result.push({
          date: date.toISOString(), // Keep standard payload
          revenue: bucket.revenue,
          orderCount: bucket.orderCount
        })
      }

      return { success: true, data: result }
    } catch (error) {
      logger.error('ReportingService.getRevenueTrend', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Instead of fully recalculating the month on every Z-Report,
   * cleanly increment using the latest closed numbers to avoid heavy database load.
   */
  async incrementMonthlyReport(
    date: Date,
    revenue: number,
    expenses: number,
    profit: number,
    ordersCount: number
  ): Promise<void> {
    try {
      // Use local timezone start of month to maintain timezone consistency with Z-Reports
      const startOfMonthRecord = startOfMonth(date)

      logger.debug(
        'ReportingService.incrementMonthlyReport',
        `Incrementing report for ${startOfMonthRecord.toISOString()}: Revenue=+${revenue}, Expenses=+${expenses}, Profit=+${profit}`
      )

      await prisma.monthlyReport.upsert({
        where: { monthDate: startOfMonthRecord },
        update: {
          totalRevenue: { increment: revenue },
          totalExpenses: { increment: expenses },
          netProfit: { increment: profit },
          orderCount: { increment: ordersCount }
        },
        create: {
          monthDate: startOfMonthRecord,
          totalRevenue: revenue,
          totalExpenses: expenses,
          netProfit: profit,
          orderCount: ordersCount
        }
      })
    } catch (error) {
      logger.error('ReportingService.incrementMonthlyReport', error)
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

      logger.debug(
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

      logger.debug('ReportingService.getReportsHistory', `Found ${reports.length} reports`)
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
