import { ApiResponse, Expense } from '../../../shared/types'
import { resolveApi } from './apiClient'

const api = window.api

export const expenseService = {
  create: (data: {
    description: string
    amount: number
    category?: string
    paymentMethod?: string
  }): Promise<Expense> => resolveApi(window.api.expenses.create(data)),

  update: (
    id: string,
    data: { description?: string; amount?: number; category?: string; paymentMethod?: string }
  ): Promise<Expense> => resolveApi(window.api.expenses.update(id, data)),

  getAll: async (): Promise<Expense[]> => {
    // API returns `{ expenses: Expense[] }`
    const data = await resolveApi(
      api.expenses.getAll() as Promise<ApiResponse<{ expenses: Expense[] }>>
    )
    return data.expenses || []
  },

  delete: async (id: string): Promise<void> => {
    await resolveApi(api.expenses.delete(id))
  }
}
