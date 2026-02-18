import { commands } from '../lib/bindings'
import { Expense } from '@shared/types'
import { unwrap } from '../lib/utils'
import { mapExpense } from '../lib/mappers'

export const expenseService = {
  async create(data: {
    description: string
    amount: number
    category?: string
    paymentMethod?: string
  }): Promise<Expense> {
    const res = await commands.createExpense({
      description: data.description,
      amount: data.amount,
      category: data.category || null,
      paymentMethod: data.paymentMethod || null
    })
    return mapExpense(unwrap(res))
  },

  async update(
    id: string,
    data: { description?: string; amount?: number; category?: string; paymentMethod?: string }
  ): Promise<Expense> {
    const res = await commands.updateExpense(id, {
      description: data.description || null,
      amount: data.amount || null,
      category: data.category || null,
      paymentMethod: data.paymentMethod || null
    })
    return mapExpense(unwrap(res))
  },

  async getAll(): Promise<Expense[]> {
    const res = await commands.getAllExpenses()
    return unwrap(res).map(mapExpense)
  },

  async delete(id: string): Promise<void> {
    const res = await commands.deleteExpense(id)
    unwrap(res)
  }
}
