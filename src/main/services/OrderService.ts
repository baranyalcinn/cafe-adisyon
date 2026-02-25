import { getBusinessDayStart } from '@shared/utils/date'
import { EventEmitter } from 'events'
import { ApiResponse, Order } from '../../shared/types'
import { OrderCoreService } from './orders/OrderCoreService'
import { PaymentOperationService } from './orders/PaymentOperationService'
import { TableOperationService } from './orders/TableOperationService'
import { SYSTEM_CONFIG } from './orders/types'

export class OrderService extends EventEmitter {
  private core: OrderCoreService
  private tables: TableOperationService
  private payments: PaymentOperationService

  constructor() {
    super()
    this.core = new OrderCoreService()
    this.tables = new TableOperationService()
    this.payments = new PaymentOperationService()
  }

  // --- Internal Utils ---
  private broadcastUpdate(orderId: string): void {
    setTimeout(() => {
      this.emit(SYSTEM_CONFIG.EVENTS.ORDER_UPDATED, { orderId })
    }, SYSTEM_CONFIG.BROADCAST_DELAY_MS)
  }

  // --- Core CRUD ---
  async getOpenOrderForTable(tableId: string): Promise<ApiResponse<Order | null>> {
    return this.core.getOpenOrderForTable(tableId)
  }

  async createOrder(tableId: string): Promise<ApiResponse<Order>> {
    const res = await this.core.createOrder(tableId)
    if (res.success) this.broadcastUpdate(res.data.id)
    return res
  }

  async addItem(
    orderId: string,
    productId: string,
    quantity: number,
    unitPrice: number
  ): Promise<ApiResponse<Order>> {
    const res = await this.core.addItem(orderId, productId, quantity, unitPrice)
    if (res.success) this.broadcastUpdate(orderId)
    return res
  }

  async updateItem(itemId: string, quantity: number): Promise<ApiResponse<Order>> {
    const res = await this.core.updateItem(itemId, quantity)
    if (res.success && res.data) this.broadcastUpdate(res.data.id)
    return res
  }

  async removeItem(itemId: string): Promise<ApiResponse<Order>> {
    const res = await this.core.removeItem(itemId)
    if (res.success && res.data) this.broadcastUpdate(res.data.id)
    return res
  }

  async deleteOrder(orderId: string): Promise<ApiResponse<null>> {
    const res = await this.core.deleteOrder(orderId)
    if (res.success) this.emit(SYSTEM_CONFIG.EVENTS.ORDER_UPDATED, { orderId })
    return res
  }

  async closeOrder(orderId: string): Promise<ApiResponse<Order>> {
    const res = await this.core.closeOrder(orderId)
    if (res.success) this.broadcastUpdate(orderId)
    return res
  }

  async updateOrder(
    orderId: string,
    data: { status?: string; totalAmount?: number; isLocked?: boolean }
  ): Promise<ApiResponse<Order>> {
    const res = await this.core.updateOrder(orderId, data)
    if (res.success) this.broadcastUpdate(orderId)
    return res
  }

  async getOrderHistory(options: {
    date?: string
    limit?: number
    offset?: number
  }): Promise<ApiResponse<{ orders: Order[]; totalCount: number; hasMore: boolean }>> {
    const { date, limit, offset } = options
    let dateFilter: Record<string, unknown> = {}
    if (date) {
      const filterDate = getBusinessDayStart(new Date(date))
      const nextDay = new Date(filterDate)
      nextDay.setDate(nextDay.getDate() + 1)
      dateFilter = { createdAt: { gte: filterDate, lt: nextDay } }
    }
    return this.core.getOrderHistory({ limit, offset, dateFilter })
  }

  async getOrderDetails(orderId: string): Promise<ApiResponse<Order>> {
    return this.core.getOrderDetails(orderId)
  }

  // --- Table Operations ---
  async toggleLock(orderId: string, isLocked: boolean): Promise<ApiResponse<Order>> {
    const res = await this.tables.toggleLock(orderId, isLocked)
    if (res.success) this.broadcastUpdate(orderId)
    return res
  }

  async transferTable(orderId: string, targetTableId: string): Promise<ApiResponse<Order>> {
    const res = await this.tables.transferTable(orderId, targetTableId)
    if (res.success) {
      this.broadcastUpdate(orderId)
      this.broadcastUpdate(res.data.id)
    }
    return res
  }

  async mergeTables(sourceOrderId: string, targetOrderId: string): Promise<ApiResponse<Order>> {
    const res = await this.tables.mergeTables(sourceOrderId, targetOrderId)
    if (res.success) {
      this.emit(SYSTEM_CONFIG.EVENTS.ORDER_UPDATED, { orderId: sourceOrderId })
      this.broadcastUpdate(targetOrderId)
    }
    return res
  }

  // --- Payment Operations ---
  async processPayment(
    orderId: string,
    amount: number,
    method: string,
    options?: { skipLog?: boolean; itemsToMarkPaid?: { id: string; quantity: number }[] }
  ): Promise<ApiResponse<{ order: Order; completed: boolean }>> {
    const res = await this.payments.processPayment(orderId, amount, method, options)
    if (res.success) this.broadcastUpdate(orderId)
    return res
  }

  async markItemsPaid(
    items: { id: string; quantity: number }[],
    paymentDetails?: { amount: number; method: string }
  ): Promise<ApiResponse<Order | null>> {
    const res = await this.payments.markItemsPaid(items, paymentDetails)
    if (res.success && res.data) this.broadcastUpdate(res.data.id)
    return res
  }
}

export const orderService = new OrderService()
