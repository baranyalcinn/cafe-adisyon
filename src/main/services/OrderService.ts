import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'
// PaymentMethod removed
import { ApiResponse, Order } from '../../shared/types'

export class OrderService {
  async getOpenOrderForTable(tableId: string): Promise<ApiResponse<Order | null>> {
    try {
      const order = (await prisma.order.findFirst({
        where: {
          tableId: tableId,
          status: 'OPEN'
        },
        include: {
          items: {
            include: { product: true }
          },
          payments: true
        }
      })) as unknown as Order | null
      return { success: true, data: order }
    } catch (error) {
      logger.error('OrderService.getOpenOrderForTable', error)
      return { success: false, error: 'Sipariş bulunamadı.' }
    }
  }

  async createOrder(tableId: string): Promise<ApiResponse<Order>> {
    try {
      // Check existing
      const existing = (await prisma.order.findFirst({
        where: { tableId, status: 'OPEN' }
      })) as unknown as Order
      if (existing) return { success: true, data: existing }

      const order = (await prisma.order.create({
        data: {
          tableId,
          status: 'OPEN'
        },
        include: { items: true, payments: true }
      })) as unknown as Order
      return { success: true, data: order }
    } catch (error) {
      logger.error('OrderService.createOrder', error)
      return { success: false, error: 'Sipariş oluşturulamadı.' }
    }
  }

  async addItem(
    orderId: string,
    productId: string,
    quantity: number,
    unitPrice: number
  ): Promise<ApiResponse<Order>> {
    try {
      // Check if product exists in order already (merge logic)
      const existingItem = await prisma.orderItem.findFirst({
        where: { orderId, productId, isPaid: false }
      })

      if (existingItem) {
        await prisma.orderItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + quantity }
        })
      } else {
        await prisma.orderItem.create({
          data: {
            orderId,
            productId,
            quantity,
            unitPrice
          }
        })
      }

      const updatedOrder = await this.recalculateOrderTotal(orderId)
      return { success: true, data: updatedOrder }
    } catch (error) {
      logger.error('OrderService.addItem', error)
      return { success: false, error: 'Ürün eklenemedi.' }
    }
  }

  async updateItem(itemId: string, quantity: number): Promise<ApiResponse<Order>> {
    try {
      if (quantity <= 0) {
        return this.removeItem(itemId)
      }

      const item = await prisma.orderItem.update({
        where: { id: itemId },
        data: { quantity }
      })

      const updatedOrder = await this.recalculateOrderTotal(item.orderId)
      return { success: true, data: updatedOrder }
    } catch (error) {
      logger.error('OrderService.updateItem', error)
      return { success: false, error: 'Ürün güncellenemedi.' }
    }
  }

  async removeItem(itemId: string): Promise<ApiResponse<Order>> {
    try {
      const item = await prisma.orderItem.delete({
        where: { id: itemId }
      })
      const updatedOrder = await this.recalculateOrderTotal(item.orderId)
      return { success: true, data: updatedOrder }
    } catch (error) {
      logger.error('OrderService.removeItem', error)
      return { success: false, error: 'Ürün silinemedi.' }
    }
  }

  async deleteOrder(orderId: string): Promise<ApiResponse<null>> {
    try {
      await prisma.order.delete({ where: { id: orderId } })
      return { success: true, data: null }
    } catch (error) {
      logger.error('OrderService.deleteOrder', error)
      return { success: false, error: 'Sipariş silinemedi.' }
    }
  }

  async closeOrder(orderId: string): Promise<ApiResponse<Order>> {
    try {
      const order = (await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CLOSED' }
      })) as unknown as Order
      return { success: true, data: order }
    } catch (error) {
      logger.error('OrderService.closeOrder', error)
      return { success: false, error: 'Sipariş kapatılamadı.' }
    }
  }

  async updateOrder(
    orderId: string,
    data: { status?: string; totalAmount?: number; isLocked?: boolean }
  ): Promise<ApiResponse<Order>> {
    try {
      const updatedOrder = (await prisma.order.update({
        where: { id: orderId },
        // @ts-ignore status enum cast
        data,
        include: {
          items: { include: { product: true } },
          payments: true
        }
      })) as unknown as Order

      return { success: true, data: updatedOrder }
    } catch (error) {
      logger.error('OrderService.updateOrder', error)
      return { success: false, error: 'Sipariş güncellenemedi.' }
    }
  }

  async toggleLock(orderId: string, isLocked: boolean): Promise<ApiResponse<Order>> {
    try {
      const updatedOrder = (await prisma.order.update({
        where: { id: orderId },
        data: { isLocked },
        include: {
          items: { include: { product: true } },
          payments: true
        }
      })) as unknown as Order
      return { success: true, data: updatedOrder }
    } catch (error) {
      logger.error('OrderService.toggleLock', error)
      return { success: false, error: 'Kilit durumu değiştirilemedi.' }
    }
  }

  async processPayment(
    orderId: string,
    amount: number,
    method: string
  ): Promise<ApiResponse<{ order: Order; completed: boolean }>> {
    try {
      // 1. Create Transaction
      await prisma.transaction.create({
        data: {
          orderId,
          amount,
          paymentMethod: method
        }
      })

      // 2. Check totals
      const order = (await prisma.order.findUnique({
        where: { id: orderId },
        include: { payments: true }
      })) as unknown as Order | null

      if (!order) throw new Error('Order not found')

      const totalPaid = order.payments!.reduce((sum, p) => sum + p.amount, 0)
      const remaining = order.totalAmount - totalPaid

      // 3. Close if fully paid (allow small tolerance for float issues, though we use integers)
      if (remaining <= 0) {
        // Mark all items as paid
        await prisma.orderItem.updateMany({
          where: { orderId },
          data: { isPaid: true }
        })

        const closedOrder = (await prisma.order.update({
          where: { id: orderId },
          data: { status: 'CLOSED' },
          include: { items: { include: { product: true } }, payments: true }
        })) as unknown as Order
        return { success: true, data: { order: closedOrder, completed: true } }
      }

      // Return updated order
      const updatedOrder = (await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } }, payments: true }
      })) as unknown as Order
      return { success: true, data: { order: updatedOrder!, completed: false } }
    } catch (error) {
      logger.error('OrderService.processPayment', error)
      return { success: false, error: 'Ödeme alınamadı.' }
    }
  }

  async markItemsPaid(
    items: { id: string; quantity: number }[]
  ): Promise<ApiResponse<Order | null>> {
    try {
      // This is a complex logic: we might need to split order items if partial quantity is paid
      // But typically we mark specific OrderItems.
      // If we support quantity-based payment, we need logic.
      // Current implementation in handlers just assumed whole items or handled externally?
      // Let's implement robustly.

      // For each item to pay
      for (const { id, quantity } of items) {
        const orderItem = await prisma.orderItem.findUnique({ where: { id } })
        if (!orderItem) continue

        if (quantity >= orderItem.quantity) {
          // Pay full item
          await prisma.orderItem.update({
            where: { id },
            data: { isPaid: true }
          })
        } else {
          // Splitting item:
          // 1. Decrement current item quantity
          // 2. Create NEW paid item with `quantity`
          await prisma.orderItem.update({
            where: { id },
            data: { quantity: orderItem.quantity - quantity }
          })

          await prisma.orderItem.create({
            data: {
              orderId: orderItem.orderId,
              productId: orderItem.productId,
              quantity: quantity,
              unitPrice: orderItem.unitPrice,
              isPaid: true
            }
          })
        }
      }

      // Check if order is fully paid now?
      // We need to return the updated order
      // We assume the caller knows the order ID from one of the items?
      // Or we assume the frontend reloads.
      // Handlers return the UPADTED ORDER.

      // Let's get orderId from first item
      if (items.length > 0) {
        const firstItem = await prisma.orderItem.findUnique({ where: { id: items[0].id } })
        if (firstItem) {
          const updated = await this.recalculateOrderTotal(firstItem.orderId)
          return { success: true, data: updated }
        }
      }

      return { success: true, data: null }
    } catch (error) {
      logger.error('OrderService.markItemsPaid', error)
      return { success: false, error: 'Ürünler ödenemedi.' }
    }
  }

  async getOrderHistory(options: {
    date?: string
    limit?: number
    offset?: number
  }): Promise<ApiResponse<{ orders: Order[]; totalCount: number; hasMore: boolean }>> {
    try {
      const { date, limit = 50, offset = 0 } = options || {}

      let dateFilter = {}
      if (date) {
        const filterDate = new Date(date)
        filterDate.setHours(0, 0, 0, 0)
        const nextDay = new Date(filterDate)
        nextDay.setDate(nextDay.getDate() + 1)
        dateFilter = { createdAt: { gte: filterDate, lt: nextDay } }
      }

      const orders = (await prisma.order.findMany({
        where: {
          status: 'CLOSED',
          ...dateFilter
        },
        include: {
          table: true,
          items: {
            include: { product: true }
          },
          payments: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      })) as unknown as Order[]

      const totalCount = await prisma.order.count({
        where: { status: 'CLOSED', ...dateFilter }
      })

      return {
        success: true,
        data: {
          orders,
          totalCount,
          hasMore: offset + orders.length < totalCount
        }
      }
    } catch (error) {
      logger.error('OrderService.getOrderHistory', error)
      return { success: false, error: 'Sipariş geçmişi alınamadı.' }
    }
  }

  // --- Private Helpers ---

  private async recalculateOrderTotal(orderId: string): Promise<Order> {
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId }
    })

    const total = orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

    const updated = (await prisma.order.update({
      where: { id: orderId },
      data: { totalAmount: total },
      include: {
        items: { include: { product: true } },
        payments: true
      }
    })) as unknown as Order
    return updated
  }
}

export const orderService = new OrderService()
