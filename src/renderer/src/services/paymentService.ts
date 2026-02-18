import { commands } from '../lib/bindings'
import { Order, PaymentMethod, Transaction } from '@shared/types'
import { unwrap } from '../lib/utils'
import { mapTransaction, mapOrder } from '../lib/mappers'

export const paymentService = {
  async create(
    orderId: string,
    amount: number,
    paymentMethod: PaymentMethod
  ): Promise<{ order: Order; completed: boolean }> {
    const res = await commands.createPayment(orderId, amount, paymentMethod)
    const data = unwrap(res)
    return {
      order: mapOrder(data.order),
      completed: data.completed
    }
  },

  async getByOrder(orderId: string): Promise<Transaction[]> {
    const res = await commands.getPaymentsByOrder(orderId)
    return unwrap(res).map(mapTransaction)
  }
}
