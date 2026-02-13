import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'
import { ApiResponse, Expense } from '../../shared/types'

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

  async getAllExpenses(): Promise<ApiResponse<Expense[]>> {
    try {
      const expenses = await prisma.expense.findMany({
        orderBy: { createdAt: 'desc' }
      })
      return {
        success: true,
        data: expenses.map((e) => ({
          ...e,
          category: e.category || undefined,
          paymentMethod: (e.paymentMethod as 'CASH' | 'CARD') || 'CASH'
        }))
      }
    } catch (error) {
      logger.error('Error getting expenses:', error)
      return { success: false, error: 'Failed to get expenses' }
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
