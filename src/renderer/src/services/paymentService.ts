import { Transaction, Order, PaymentMethod } from '../../../shared/types'

const api = window.api

export const paymentService = {
  async create(
    orderId: string,
    amount: number,
    paymentMethod: PaymentMethod
  ): Promise<{ payment: Transaction; order: Order }> {
    const result = await api.payments.create(orderId, amount, paymentMethod)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async getByOrder(orderId: string): Promise<Transaction[]> {
    const result = await api.payments.getByOrder(orderId)
    if (!result.success) throw new Error(result.error)
    return result.data
  }
}
