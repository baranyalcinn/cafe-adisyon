import { Expense } from '../../../shared/types'

const api = window.api

export const expenseService = {
  async create(data: { description: string; amount: number; category?: string }): Promise<Expense> {
    const result = await api.expenses.create(data)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async getAll(): Promise<Expense[]> {
    const result = await api.expenses.getAll()
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async delete(id: string): Promise<void> {
    const result = await api.expenses.delete(id)
    if (!result.success) throw new Error(result.error)
  }
}
