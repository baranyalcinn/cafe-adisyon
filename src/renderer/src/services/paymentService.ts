import { Order, PaymentMethod, Transaction } from '../../../shared/types'
import { resolveApi } from './apiClient'

// ============================================================================
// Payment Service
// ============================================================================

export const paymentService = {
  create: (
    orderId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    options?: { skipLog?: boolean; itemsToMarkPaid?: { id: string; quantity: number }[] }
  ): Promise<{ order: Order; completed: boolean }> =>
    resolveApi(window.api.payments.create(orderId, amount, paymentMethod, options)),

  getByOrder: (orderId: string): Promise<Transaction[]> =>
    resolveApi(window.api.payments.getByOrder(orderId))
}
