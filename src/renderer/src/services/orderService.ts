import { Order, OrderStatus } from '../../../shared/types'

const api = window.api

export const orderService = {
  async getOpenByTable(tableId: string): Promise<Order | null> {
    const result = await api.orders.getOpenByTable(tableId)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async create(tableId: string): Promise<Order> {
    const result = await api.orders.create(tableId)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async update(
    orderId: string,
    data: { status?: OrderStatus; totalAmount?: number; isLocked?: boolean }
  ): Promise<Order> {
    const result = await api.orders.update(orderId, data)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async addItem(
    orderId: string,
    productId: string,
    quantity: number,
    unitPrice: number
  ): Promise<Order> {
    const result = await api.orders.addItem(orderId, productId, quantity, unitPrice)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async updateItem(orderItemId: string, quantity: number): Promise<Order> {
    const result = await api.orders.updateItem(orderItemId, quantity)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async removeItem(orderItemId: string): Promise<Order> {
    const result = await api.orders.removeItem(orderItemId)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async delete(orderId: string): Promise<void> {
    const result = await api.orders.delete(orderId)
    if (!result.success) throw new Error(result.error)
  },
  async transfer(orderId: string, targetTableId: string): Promise<Order> {
    const result = await api.orders.transfer(orderId, targetTableId)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async merge(sourceOrderId: string, targetOrderId: string): Promise<Order> {
    const result = await api.orders.merge(sourceOrderId, targetOrderId)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async markItemsPaid(items: { id: string; quantity: number }[]): Promise<Order> {
    const result = await api.orders.markItemsPaid(items)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async getHistory(options?: {
    date?: string
    limit?: number
    offset?: number
  }): Promise<{ orders: Order[]; totalCount: number; hasMore: boolean }> {
    const result = await api.orders.getHistory(options)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async getDetails(orderId: string): Promise<Order> {
    const result = await api.orders.getDetails(orderId)
    if (!result.success) throw new Error(result.error)
    return result.data
  }
}
