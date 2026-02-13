import { Expense } from '../../../shared/types'

const api = window.api

export const expenseService = {
  create: async (data: {
    description: string
    amount: number
    category?: string
    paymentMethod?: string
  }): Promise<Expense> => {
    const response = await window.api.expenses.create(data)
    if (!response.success) throw new Error(response.error)
    return response.data
  },
  update: async (
    id: string,
    data: { description?: string; amount?: number; category?: string; paymentMethod?: string }
  ): Promise<Expense> => {
    const response = await window.api.expenses.update(id, data)
    if (!response.success) throw new Error(response.error)
    return response.data
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
