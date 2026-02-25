import { formatCurrency } from '@shared/utils/currency'
import { getBusinessDayStart } from '@shared/utils/date'
import { subDays } from 'date-fns'
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

// ============================================================================
// System Configuration
// ============================================================================

const CONFIG = {
  VAT_RATE: 0.1,
  DEFAULT_TREND_DAYS: 7,
  DEFAULT_HISTORY_LIMIT: 30,
  DEFAULT_MONTHLY_LIMIT: 12
} as const

// ============================================================================
// Service Class
// ============================================================================

interface BaseStats {
  today: Date
  dailyRevenue: number
  totalOrders: number
  paymentMethodBreakdown: { cash: number; card: number }
  topProducts: { productId: string; productName: string; quantity: number }[]
  categoryBreakdown: { categoryName: string; revenue: number; quantity: number; icon?: string }[]
}

export class ReportingService {
  // --- Private Utility Methods ---

  private handleError<T = null>(
    methodName: string,
    error: unknown,
    defaultMessage: string
  ): ApiResponse<T> {
    logger.error(`ReportingService.${methodName}`, error)
    if (
      error instanceof Error &&
      !error.message.includes('prisma') &&
      !error.message.includes('Database')
    ) {
      return { success: false, error: error.message }
    }
    return { success: false, error: defaultMessage }
  }

  /**
   * Ayın ilk gününü temsil eden, timezone sorunlarından arındırılmış UTC string üretir.
   */
  private getStableMonthDate(dateInput: Date | string): Date {
    const d = new Date(dateInput)
    const year = d.getFullYear()
    const monthStr = String(d.getMonth() + 1).padStart(2, '0')
    return new Date(`${year}-${monthStr}-01T00:00:00.000Z`)
  }

  /**
   * Gelen değerin geçerli bir Date nesnesine dönüşüp dönüşemeyeceğini kontrol eder.
   */
  private parseSafeDate(val?: Date | string): Date | undefined {
    if (!val) return undefined
    const parsed = new Date(val)
    return !isNaN(parsed.getTime()) ? parsed : undefined
  }

  // --- Public Methods ---

  async generateZReport(actualCash?: number): Promise<ApiResponse<DailySummary>> {
    try {
      const now = new Date()
      const reportDate = getBusinessDayStart(now)

      const lastReport = await prisma.dailySummary.findFirst({
        where: { date: { lt: reportDate } },
        orderBy: { createdAt: 'desc' }
      })

      const startDate = lastReport ? lastReport.createdAt : new Date(0)
      const dateFilter = { gt: startDate, lte: now }

      const [periodicOrdersCount, transactionAgg, paymentMethodAgg, expenseAgg] = await Promise.all(
        [
          prisma.order.count({ where: { status: 'CLOSED', createdAt: dateFilter } }),
          prisma.transaction.aggregate({
            where: { createdAt: dateFilter },
            _sum: { amount: true }
          }),
          prisma.transaction.groupBy({
            by: ['paymentMethod'],
            where: { createdAt: dateFilter },
            _sum: { amount: true }
          }),
          prisma.expense.aggregate({ where: { createdAt: dateFilter }, _sum: { amount: true } })
        ]
      )

      const totalRevenue = transactionAgg._sum.amount || 0
      const totalCash = paymentMethodAgg.find((p) => p.paymentMethod === 'CASH')?._sum.amount || 0
      const totalCard = paymentMethodAgg.find((p) => p.paymentMethod === 'CARD')?._sum.amount || 0
      const totalExpenses = expenseAgg._sum.amount || 0

      const netProfit = totalRevenue - totalExpenses
      const totalVat = Math.round(totalRevenue * CONFIG.VAT_RATE)

      const summaryPayload = {
        totalCash,
        actualCash: actualCash ?? totalCash,
        totalCard,
        totalExpenses,
        netProfit,
        totalVat,
        orderCount: periodicOrdersCount,
        totalRevenue
      }

      const summary = await prisma.dailySummary.upsert({
        where: { date: reportDate },
        create: { date: reportDate, cancelCount: 0, ...summaryPayload },
        update: { ...summaryPayload, createdAt: now }
      })

      await this.incrementMonthlyReport(
        reportDate,
        totalRevenue,
        totalExpenses,
        netProfit,
        periodicOrdersCount
      )
      await logService.createLog(
        'GENERATE_ZREPORT',
        undefined,
        `Gün sonu Z-Raporu oluşturuldu: ${formatCurrency(totalRevenue)}`
      )

      // WAL Checkpoint
      try {
        await prisma.$executeRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)')
      } catch (walError) {
        logger.error('ReportingService.walCheckpoint', walError)
      }

      return { success: true, data: summary }
    } catch (error) {
      return this.handleError('generateZReport', error, 'Z-Raporu oluşturulamadı.')
    }
  }

  private async getBaseStats(topProductLimit: number = 5): Promise<BaseStats> {
    const today = getBusinessDayStart(new Date())

    const [totalOrders, transactionAgg, paymentMethods, orderItemGroups] = await Promise.all([
      prisma.order.count({ where: { status: 'CLOSED', createdAt: { gte: today } } }),
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

    const productIds = Array.from(new Set(orderItemGroups.map((g) => g.productId)))
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, category: { select: { name: true, icon: true } } }
    })

    const productCounts = new Map<string, { name: string; quantity: number }>()
    const categoryMap = new Map<string, { revenue: number; quantity: number; icon?: string }>()

    orderItemGroups.forEach((group) => {
      const quantity = group._sum.quantity || 0
      const product = products.find((p) => p.id === group.productId)
      const productName = product?.name || 'Ürün'

      const existingProd = productCounts.get(group.productId)
      if (existingProd) existingProd.quantity += quantity
      else productCounts.set(group.productId, { name: productName, quantity })

      const catName = product?.category?.name || 'Diğer'
      const existingCat = categoryMap.get(catName) || {
        revenue: 0,
        quantity: 0,
        icon: product?.category?.icon
      }
      categoryMap.set(catName, {
        revenue: existingCat.revenue + quantity * group.unitPrice,
        quantity: existingCat.quantity + quantity,
        icon: existingCat.icon
      })
    })

    const topProducts = Array.from(productCounts.entries())
      .map(([productId, data]) => ({ productId, productName: data.name, quantity: data.quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, topProductLimit)

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

  async getExtendedDashboardStats(): Promise<ApiResponse<ExtendedDashboardStats>> {
    try {
      const baseStats = await this.getBaseStats(10)

      const [openTables, pendingOrders, expensesAggregate, hourlyAgg] = await Promise.all([
        prisma.table.count({ where: { orders: { some: { status: 'OPEN' } } } }),
        prisma.order.count({ where: { status: 'OPEN', items: { some: {} } } }),
        prisma.expense.aggregate({
          where: { createdAt: { gte: baseStats.today } },
          _sum: { amount: true }
        }),
        prisma.$queryRaw<{ hour: string; revenue: number | bigint; count: number | bigint }[]>`
          SELECT strftime('%H', "createdAt", 'localtime') as hour, SUM("totalAmount") as revenue, COUNT(id) as count
          FROM "Order" WHERE "status" = 'CLOSED' AND "createdAt" >= ${baseStats.today.toISOString()} GROUP BY hour
        `
      ])

      const hourlyStats = new Map<string, { revenue: number; count: number }>()
      for (let i = 0; i < 24; i++)
        hourlyStats.set(String(i).padStart(2, '0'), { revenue: 0, count: 0 })

      for (const row of hourlyAgg) {
        if (!row.hour) continue
        const current = hourlyStats.get(row.hour) || { revenue: 0, count: 0 }
        hourlyStats.set(row.hour, {
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
          ...baseStats,
          dailyExpenses: expensesAggregate._sum.amount || 0,
          openTables,
          pendingOrders,
          hourlyActivity
        }
      }
    } catch (error) {
      return this.handleError('getExtendedDashboardStats', error, 'Dashboard verileri alınamadı.')
    }
  }

  async getRevenueTrend(
    days: number = CONFIG.DEFAULT_TREND_DAYS
  ): Promise<ApiResponse<RevenueTrendItem[]>> {
    try {
      const result: RevenueTrendItem[] = []
      const today = getBusinessDayStart(new Date())
      const startDate = subDays(today, days - 1)

      const [pastSummaries, currentAgg, currentOrderCount] = await Promise.all([
        prisma.dailySummary.findMany({
          where: { date: { gte: startDate, lt: today } },
          orderBy: { date: 'asc' }
        }),
        prisma.transaction.aggregate({
          where: { createdAt: { gte: today } },
          _sum: { amount: true }
        }),
        prisma.order.count({ where: { status: 'CLOSED', createdAt: { gte: today } } })
      ])

      const liveRevenue = currentAgg._sum.amount || 0
      const summaryMap = new Map(pastSummaries.map((s) => [s.date.toISOString().split('T')[0], s]))

      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(today, i)
        const dateKey = date.toISOString().split('T')[0]

        let revenue = 0
        let orderCount = 0

        if (i === 0) {
          revenue = liveRevenue
          orderCount = currentOrderCount
        } else {
          const bucket = summaryMap.get(dateKey)
          if (bucket) {
            revenue = bucket.totalRevenue
            orderCount = bucket.orderCount || 0
          }
        }
        result.push({ date: date.toISOString(), revenue, orderCount })
      }

      return { success: true, data: result }
    } catch (error) {
      return this.handleError('getRevenueTrend', error, 'Gelir trendi hesaplanamadı.')
    }
  }

  async incrementMonthlyReport(
    date: Date,
    revenue: number,
    expenses: number,
    profit: number,
    ordersCount: number
  ): Promise<void> {
    try {
      const stableMonthDate = this.getStableMonthDate(date)

      await prisma.monthlyReport.upsert({
        where: { monthDate: stableMonthDate },
        update: {
          totalRevenue: { increment: revenue },
          totalExpenses: { increment: expenses },
          netProfit: { increment: profit },
          orderCount: { increment: ordersCount }
        },
        create: {
          monthDate: stableMonthDate,
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

  async mergeDuplicateMonthlyReports(): Promise<void> {
    try {
      const allReports = await prisma.monthlyReport.findMany({ orderBy: { monthDate: 'asc' } })

      const grouped = new Map<string, typeof allReports>()
      for (const report of allReports) {
        const formatKey = this.getStableMonthDate(report.monthDate).toISOString()
        const arr = grouped.get(formatKey) || []
        arr.push(report)
        grouped.set(formatKey, arr)
      }

      for (const [key, records] of grouped.entries()) {
        if (records.length <= 1) continue

        const [primary, ...duplicates] = records
        let { totalRevenue, totalExpenses, netProfit, orderCount } = primary
        const idsToDelete: string[] = []

        for (const dup of duplicates) {
          totalRevenue += dup.totalRevenue
          totalExpenses += dup.totalExpenses
          netProfit += dup.netProfit
          orderCount += dup.orderCount
          idsToDelete.push(dup.id)
        }

        await prisma.$transaction(async (tx) => {
          await tx.monthlyReport.deleteMany({ where: { id: { in: idsToDelete } } })
          await tx.monthlyReport.update({
            where: { id: primary.id },
            data: { totalRevenue, totalExpenses, netProfit, orderCount, monthDate: new Date(key) }
          })
        })
      }
    } catch (error) {
      logger.error('ReportingService.mergeDuplicateMonthlyReports', error)
    }
  }

  async getReportsHistory(
    limit: number = CONFIG.DEFAULT_HISTORY_LIMIT,
    startDate?: Date | string,
    endDate?: Date | string
  ): Promise<ApiResponse<DailySummary[]>> {
    try {
      const start = this.parseSafeDate(startDate)
      const end = this.parseSafeDate(endDate)

      // Temiz where filtresi
      const dateFilter: { gte?: Date; lte?: Date } = {}
      if (start) dateFilter.gte = start
      if (end) dateFilter.lte = end

      const reports = await prisma.dailySummary.findMany({
        where: Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {},
        orderBy: { date: 'desc' },
        take: limit
      })

      return { success: true, data: reports }
    } catch (error) {
      return this.handleError('getReportsHistory', error, 'Rapor geçmişi alınamadı.')
    }
  }

  async getMonthlyReports(
    limit: number = CONFIG.DEFAULT_MONTHLY_LIMIT
  ): Promise<ApiResponse<MonthlyReport[]>> {
    try {
      const reports = await prisma.monthlyReport.findMany({
        orderBy: { monthDate: 'desc' },
        take: limit
      })
      return { success: true, data: reports }
    } catch (error) {
      return this.handleError('getMonthlyReports', error, 'Aylık raporlar alınamadı.')
    }
  }
}

export const reportingService = new ReportingService()
