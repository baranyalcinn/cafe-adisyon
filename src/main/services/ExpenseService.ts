import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'
import { Prisma, Expense } from '../../generated/prisma/client'
import { ApiResponse } from '../../shared/types'

export class ExpenseService {
  async createExpense(data: {
    description: string
    amount: number
    category?: string
  }): Promise<ApiResponse<Expense>> {
    try {
      const expense = await prisma.expense.create({
        data: {
          ...data,
          amount: Math.round(data.amount * 100) // Convert to cents
        }
      })

      return { success: true, data: expense }
    } catch (error) {
      logger.error('ExpenseService.createExpense', error)
      return { success: false, error: 'Gider oluşturulamadı.' }
    }
  }

  async updateExpense(
    id: string,
    data: {
      description?: string
      amount?: number
      category?: string
    }
  ): Promise<ApiResponse<Expense>> {
    try {
      const updateData: Prisma.ExpenseUpdateInput = { ...data }
      if (data.amount !== undefined) {
        updateData.amount = Math.round(data.amount * 100) // Convert to cents
      }

      const expense = await prisma.expense.update({
        where: { id },
        data: updateData
      })

      return { success: true, data: expense }
    } catch (error) {
      logger.error('ExpenseService.updateExpense', error)
      return { success: false, error: 'Gider güncellenemedi.' }
    }
  }

  async getAllExpenses(): Promise<ApiResponse<Expense[]>> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const expenses = await prisma.expense.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'desc' }
      })
      return { success: true, data: expenses }
    } catch (error) {
      logger.error('ExpenseService.getAllExpenses', error)
      return { success: false, error: 'Giderler alınamadı.' }
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
