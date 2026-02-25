import { Order, OrderStatus, PaymentMethod } from '../../../shared/types'
import { resolveApi } from './apiClient'

const api = window.api

// ============================================================================
// Order Service
// ============================================================================

export const orderService = {
  getOpenByTable: (tableId: string): Promise<Order | null> =>
    resolveApi(api.orders.getOpenByTable(tableId)),

  create: (tableId: string): Promise<Order> => resolveApi(api.orders.create(tableId)),

  update: (
    orderId: string,
    data: { status?: OrderStatus; totalAmount?: number; isLocked?: boolean }
  ): Promise<Order> => resolveApi(api.orders.update(orderId, data)),

  addItem: (
    orderId: string,
    productId: string,
    quantity: number,
    unitPrice: number
  ): Promise<Order> => resolveApi(api.orders.addItem(orderId, productId, quantity, unitPrice)),

  updateItem: (orderItemId: string, quantity: number): Promise<Order> =>
    resolveApi(api.orders.updateItem(orderItemId, quantity)),

  removeItem: (orderItemId: string): Promise<Order> =>
    resolveApi(api.orders.removeItem(orderItemId)),

  delete: async (orderId: string): Promise<void> => {
    // Veri dönmeyen void işlemler için resolveApi'yi kullanıp dönüşü yoksayıyoruz
    await resolveApi(api.orders.delete(orderId))
  },

  transfer: (orderId: string, targetTableId: string): Promise<Order> =>
    resolveApi(api.orders.transfer(orderId, targetTableId)),

  merge: (sourceOrderId: string, targetOrderId: string): Promise<Order> =>
    resolveApi(api.orders.merge(sourceOrderId, targetOrderId)),

  processPayment: (
    orderId: string,
    data: { amount: number; method: PaymentMethod; options?: { skipLog?: boolean } }
  ): Promise<{ order: Order; completed: boolean }> =>
    resolveApi(api.payments.create(orderId, data.amount, data.method, data.options)),

  markItemsPaid: (
    items: { id: string; quantity: number }[],
    paymentDetails?: { amount: number; method: string }
  ): Promise<Order> => resolveApi(api.orders.markItemsPaid(items, paymentDetails)),

  getHistory: (options?: {
    date?: string
    limit?: number
    offset?: number
  }): Promise<{ orders: Order[]; totalCount: number; hasMore: boolean }> =>
    resolveApi(api.orders.getHistory(options)),

  getDetails: (orderId: string): Promise<Order> => resolveApi(api.orders.getDetails(orderId))
}
