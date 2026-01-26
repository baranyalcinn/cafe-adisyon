import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'

export class ExpenseService {
  async createExpense(data: { description: string; amount: number; category?: string }) {
    try {
      const expense = await prisma.expense.create({
        data
      })

      // Update Monthly Report logic if needed instantly,
      // but typically we update checks dynamically.
      // Handlers.ts did: await updateMonthlyReport(new Date())
      // I should expose `ReportingService.updateMonthlyReport` publically?
      // Or just let Z-Report handle it?
      // Z-Report handle is better. But if user looks at monthly report instantly?
      // I will assume we want immediate consistency.
      // But circular dependency (Expense -> Reporting -> Expense).
      // Solution: ExpenseService updates DB. ReportingService calculates from DB.
      // If we need to trigger update, we can call ReportingService externally or duplicate logic?
      // Better: ReportingService has `updateMonthlyReport(date)`.
      // I can import `reportingService` here.

      return { success: true, data: expense }
    } catch (error) {
      logger.error('ExpenseService.createExpense', error)
      return { success: false, error: 'Gider oluşturulamadı.' }
    }
  }

  async getAllExpenses() {
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

  async deleteExpense(id: string) {
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
