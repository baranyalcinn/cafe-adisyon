import { ApiResponse, Order, PaymentMethod, Transaction } from '../../../shared/types'

const api = window.api

// ============================================================================
// Global API Helper (Bunu 'src/lib/apiUtils.ts' gibi bir dosyaya taşıyabilirsin)
// ============================================================================
export function unwrapResponse<T>(result: ApiResponse<T>): T {
  if (!result.success) {
    throw new Error(result.error || 'Bilinmeyen bir API hatası oluştu.')
  }
  return result.data
}

// ============================================================================
// Payment Service
// ============================================================================

export const paymentService = {
  async create(
    orderId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    options?: { skipLog?: boolean; itemsToMarkPaid?: { id: string; quantity: number }[] }
  ): Promise<{ order: Order; completed: boolean }> {
    return unwrapResponse(await api.payments.create(orderId, amount, paymentMethod, options))
  },

  async getByOrder(orderId: string): Promise<Transaction[]> {
    return unwrapResponse(await api.payments.getByOrder(orderId))
  }
}
