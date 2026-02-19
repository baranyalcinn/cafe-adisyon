import { Prisma } from '../../generated/prisma/client'
import { ApiResponse, Expense } from '../../shared/types'
import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'

export class ExpenseService {
  async createExpense(data: {
    description: string
    amount: number
    category?: string
    paymentMethod?: string
  }): Promise<ApiResponse<Expense>> {
    try {
      const expense = await prisma.expense.create({
        data: {
          ...data,
          paymentMethod: data.paymentMethod || 'CASH',
          amount: Math.round(data.amount * 100) // Convert to cents
        }
      })

      return {
        success: true,
        data: {
          ...expense,
          category: expense.category || undefined,
          paymentMethod: (expense.paymentMethod as 'CASH' | 'CARD') || 'CASH'
        }
      }
    } catch (error) {
      logger.error('Error creating expense:', error)
      return { success: false, error: 'Failed to create expense' }
    }
  }

  async updateExpense(
    id: string,
    data: { description?: string; amount?: number; category?: string; paymentMethod?: string }
  ): Promise<ApiResponse<Expense>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = { ...data }
      if (data.amount !== undefined) {
        updateData.amount = Math.round(data.amount * 100) // Convert to cents
      }

      const expense = await prisma.expense.update({
        where: { id },
        data: updateData
      })

      return {
        success: true,
        data: {
          ...expense,
          category: expense.category || undefined,
          paymentMethod: (expense.paymentMethod as 'CASH' | 'CARD') || 'CASH'
        }
      }
    } catch (error) {
      logger.error('Error updating expense:', error)
      return { success: false, error: 'Failed to update expense' }
    }
  }

  async getAllExpenses(options?: {
    limit?: number
    offset?: number
    search?: string
    category?: string
    startDate?: string
    endDate?: string
  }): Promise<ApiResponse<{ expenses: Expense[]; totalCount: number; hasMore: boolean }>> {
    try {
      const { limit = 500, offset = 0, search, category, startDate, endDate } = options || {}

      const where: Prisma.ExpenseWhereInput = {}

      if (search) {
        where.description = { contains: search }
      }

      if (category && category !== 'all') {
        where.category = category
      }

      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = new Date(startDate)
        if (endDate) where.createdAt.lte = new Date(endDate)
      }

      const [expenses, totalCount] = await Promise.all([
        prisma.expense.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.expense.count({ where })
      ])

      return {
        success: true,
        data: {
          expenses: expenses.map((e) => ({
            ...e,
            category: e.category || undefined,
            paymentMethod: (e.paymentMethod as 'CASH' | 'CARD') || 'CASH'
          })),
          totalCount,
          hasMore: offset + expenses.length < totalCount
        }
      }
    } catch (error) {
      logger.error('Error getting expenses:', error)
      return { success: false, error: 'Failed to get expenses' }
    }
  }

  async getExpenseStats(options?: {
    search?: string
    category?: string
    startDate?: string
    endDate?: string
  }): Promise<
    ApiResponse<{
      todayTotal: number
      monthTotal: number
      topCategory?: { name: string; total: number }
    }>
  > {
    try {
      const { search, category, startDate, endDate } = options || {}
      const where: Prisma.ExpenseWhereInput = {}

      if (search) where.description = { contains: search }
      if (category && category !== 'all') where.category = category
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = new Date(startDate)
        if (endDate) where.createdAt.lte = new Date(endDate)
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

      // Calculate totals based on the SAME filter context, OR global context?
      // Usually "Today's Total" in the sidebar should reflect global stats OR filtered stats?
      // The user complained about stats being wrong because of "100 limit".
      // Usually sidebar stats are "Global" context, but if user filters by "Food", maybe they want "Food Expenses" stats?
      // Let's assume global stats for "Today/Month" unless explicitly filtered?
      // Actually, standard dashboards usually show "Global" stats in summary cards, and filtered list below.
      // But if I want to support "Dynamic Scroll", I simply need "Global" stats to be correct regardless of scroll.
      // Let's compute GLOBAL stats for the cards (ignoring list filters usually, or maybe respecting them if desired).
      // Re-reading user request: "giderler sekmesinde dynamic scroll var mı? çünkü sabit kalıyor"
      // The stats issue was implied by me in the plan ("Sorun: Ayın toplamını hesaplarken sadece bu 100 kaydı topluyor").
      // So the stats in the sidebar MUST be accurate for the WHOLE period, not just loaded items.
      // I will implement GLOBAL stats (ignoring search/pagination) for the standard cards "Today" & "Month".
      // If the user wants filtered stats, that's a different feature.
      // BUT current frontend implementation calculates stats from `expenses` array which IS filtered by the frontend logic!
      // The frontend logic `filteredExpenses` depends on `expenses`.
      // `stats` depends on `expenses`.
      // So currently stats ARE filtered by whatever is loaded.
      // I should probably return GLOBAL stats for the sidebar cards "Today" and "Month" regardless of the list filter,
      // as that's usually what those cards represent (Business overview).

      const [todayAgg, monthAgg, categoryAgg] = await Promise.all([
        prisma.expense.aggregate({
          where: { createdAt: { gte: today } },
          _sum: { amount: true }
        }),
        prisma.expense.aggregate({
          where: { createdAt: { gte: firstDayOfMonth } },
          _sum: { amount: true }
        }),
        prisma.expense.groupBy({
          by: ['category'],
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 1
        })
      ])

      const topCategory = categoryAgg[0]
        ? { name: categoryAgg[0].category || 'Diğer', total: categoryAgg[0]._sum.amount || 0 }
        : undefined

      return {
        success: true,
        data: {
          todayTotal: todayAgg._sum.amount || 0,
          monthTotal: monthAgg._sum.amount || 0,
          topCategory
        }
      }
    } catch (error) {
      logger.error('Error getting expense stats:', error)
      return { success: false, error: 'Failed to get expense stats' }
    }
  }

  async deleteExpense(id: string): Promise<ApiResponse<null>> {
    try {
      await prisma.expense.delete({ where: { id } })
      return { success: true, data: null }
    } catch (error) {
      logger.error('ExpenseService.deleteExpense', error)
      return { success: false, error: 'Gider silinemedi.' }
    }
  }
}

export const expenseService = new ExpenseService()
