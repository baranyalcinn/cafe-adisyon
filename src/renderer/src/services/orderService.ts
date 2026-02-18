import { commands } from '../lib/bindings'
import { Order, OrderStatus } from '@shared/types'
import { unwrap } from '../lib/utils'
import { mapOrder } from '../lib/mappers'

export const orderService = {
  async getOpenByTable(tableId: string): Promise<Order | null> {
    const res = await commands.getOpenOrderByTable(tableId)
    const data = unwrap(res)
    return data ? mapOrder(data) : null
  },

  async create(tableId: string): Promise<Order> {
    const res = await commands.createOrder(tableId)
    return mapOrder(unwrap(res))
  },

  async update(
    orderId: string,
    data: { status?: OrderStatus; totalAmount?: number; isLocked?: boolean }
  ): Promise<Order> {
    const res = await commands.updateOrder(orderId, {
      status: data.status || null,
      totalAmount: data.totalAmount || null,
      isLocked: data.isLocked === undefined ? null : data.isLocked
    })
    return mapOrder(unwrap(res))
  },

  async addItem(
    orderId: string,
    productId: string,
    quantity: number,
    unitPrice: number
  ): Promise<Order> {
    // Rust command signature: (orderId, productId, quantity, notes)
    // unitPrice is unused in the command now (it fetches from product in DB)?
    // Wait, let's check bindings.ts.
    // Bindings: addOrderItem(orderId, productId, quantity, notes)
    // OrderService.ts: addItem(..., unitPrice) -> The service method signature can stay the same if valid,
    // but the call to commands must match.
    // We pass null for notes.
    const res = await commands.addOrderItem(orderId, productId, quantity, null)
    return mapOrder(unwrap(res))
  },

  async updateItem(orderItemId: string, quantity: number): Promise<Order> {
    const res = await commands.updateOrderItem(orderItemId, quantity, null)
    return mapOrder(unwrap(res))
  },

  async removeItem(orderItemId: string): Promise<Order> {
    const res = await commands.removeOrderItem(orderItemId)
    return mapOrder(unwrap(res))
  },

  async delete(orderId: string): Promise<void> {
    const res = await commands.deleteOrder(orderId)
    unwrap(res)
  },

  async transfer(orderId: string, targetTableId: string): Promise<Order> {
    const res = await commands.transferOrder(orderId, targetTableId)
    return mapOrder(unwrap(res))
  },

  async merge(sourceOrderId: string, targetOrderId: string): Promise<Order> {
    const res = await commands.mergeOrders(sourceOrderId, targetOrderId)
    return mapOrder(unwrap(res))
  },

  async markItemsPaid(items: { id: string; quantity: number }[]): Promise<Order | null> {
    const res = await commands.markItemsPaid(items)
    const data = unwrap(res)
    return data ? mapOrder(data) : null
  },

  async getHistory(options?: {
    date?: string
    limit?: number
    offset?: number
  }): Promise<{ orders: Order[]; totalCount: number; hasMore: boolean }> {
    const res = await commands.getOrderHistory(
      options?.date || null,
      options?.limit || null,
      options?.offset || null
    )
    const data = unwrap(res)
    return {
      orders: data.orders.map(mapOrder),
      totalCount: data.totalCount,
      hasMore: data.hasMore
    }
  },

  async getDetails(orderId: string): Promise<Order> {
    const res = await commands.getOrderDetails(orderId)
    return mapOrder(unwrap(res))
  }
}
