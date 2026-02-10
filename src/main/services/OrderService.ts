import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'
import { logService } from './LogService'
import { BrowserWindow } from 'electron'
import { ApiResponse, Order } from '../../shared/types'

export class OrderService {
  private broadcastDashboardUpdate(): void {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('dashboard:update')
    })
  }

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

      this.broadcastDashboardUpdate()
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

      // Log activity
      const product = await prisma.product.findUnique({ where: { id: productId } })
      const table = await prisma.table.findUnique({ where: { id: updatedOrder.tableId } })
      await logService.createLog(
        'ADD_ITEM',
        table?.name,
        `${quantity}x ${product?.name || 'Ürün'} eklendi`
      )

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
        where: { id: itemId },
        include: { product: true, order: { include: { table: true } } }
      })
      const updatedOrder = await this.recalculateOrderTotal(item.orderId)

      // Log activity
      await logService.createLog(
        'REMOVE_ITEM',
        item.order?.table?.name,
        `${item.quantity}x ${item.product?.name || 'Ürün'} çıkarıldı`
      )

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

      this.broadcastDashboardUpdate()
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
        data: data as { status?: 'OPEN' | 'CLOSED'; totalAmount?: number; isLocked?: boolean },
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
      const result = await prisma.$transaction(async (tx) => {
        // 1. Read order with payments atomically
        const order = (await tx.order.findUnique({
          where: { id: orderId },
          include: { payments: true }
        })) as unknown as Order | null

        if (!order) throw new Error('Order not found')

        // 2. Create payment transaction
        await tx.transaction.create({
          data: {
            orderId,
            amount,
            paymentMethod: method
          }
        })

        // 3. Check totals (based on existing payments + new amount)
        const totalPaid = order.payments!.reduce((sum, p) => sum + p.amount, 0) + amount
        const remaining = order.totalAmount - totalPaid

        // 4. Close if fully paid
        if (remaining <= 0) {
          await tx.orderItem.updateMany({
            where: { orderId },
            data: { isPaid: true }
          })

          const closedOrder = (await tx.order.update({
            where: { id: orderId },
            data: { status: 'CLOSED' },
            include: { items: { include: { product: true } }, payments: true, table: true }
          })) as unknown as Order

          return { order: closedOrder, completed: true }
        }

        // 5. Partial payment — return updated order
        const updatedOrder = (await tx.order.findUnique({
          where: { id: orderId },
          include: { items: { include: { product: true } }, payments: true, table: true }
        })) as unknown as Order

        return { order: updatedOrder!, completed: false }
      })

      // Log outside transaction (non-critical)
      await logService.createLog(
        method === 'CASH' ? 'PAYMENT_CASH' : 'PAYMENT_CARD',
        result.order.table?.name,
        `₺${(amount / 100).toFixed(2)} ${method === 'CASH' ? 'nakit' : 'kart'} ödeme alındı`
      )

      if (result.completed) {
        await logService.createLog('CLOSE_TABLE', result.order.table?.name, 'Adisyon kapatıldı')
      }

      this.broadcastDashboardUpdate()
      return { success: true, data: result }
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
        select: {
          id: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          table: {
            select: { name: true }
          },
          items: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              product: {
                select: { name: true }
              }
            }
          }
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

  async getOrderDetails(orderId: string): Promise<ApiResponse<Order>> {
    try {
      const order = (await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          table: true,
          items: {
            include: { product: true }
          },
          payments: true
        }
      })) as unknown as Order

      if (!order) {
        return { success: false, error: 'Sipariş bulunamadı.' }
      }

      return { success: true, data: order }
    } catch (error) {
      logger.error('OrderService.getOrderDetails', error)
      return { success: false, error: 'Sipariş detayları alınamadı.' }
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
  async transferTable(orderId: string, targetTableId: string): Promise<ApiResponse<Order>> {
    try {
      // 1. Check if target table is empty
      const targetOrder = await prisma.order.findFirst({
        where: { tableId: targetTableId, status: 'OPEN' }
      })

      if (targetOrder) {
        return {
          success: false,
          error: 'Hedef masada açık adisyon var. Lütfen birleştirme işlemini kullanın.'
        }
      }

      // 2. Get source order (for logging)
      const sourceOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { table: true }
      })

      if (!sourceOrder) {
        return { success: false, error: 'Taşınacak adisyon bulunamadı.' }
      }

      // 3. Update order tableId
      const updatedOrder = (await prisma.order.update({
        where: { id: orderId },
        data: { tableId: targetTableId },
        include: {
          items: { include: { product: true } },
          payments: true,
          table: true
        }
      })) as unknown as Order

      // Log activity
      const toTable = await prisma.table.findUnique({ where: { id: targetTableId } })

      await logService.createLog(
        'TRANSFER_TABLE',
        undefined,
        `${sourceOrder.table?.name || 'Masa'} -> ${toTable?.name} taşındı`
      )

      return { success: true, data: updatedOrder }
    } catch (error) {
      logger.error('OrderService.transferTable', error)
      return { success: false, error: 'Masa taşıma işlemi başarısız.' }
    }
  }

  async mergeTables(sourceOrderId: string, targetOrderId: string): Promise<ApiResponse<Order>> {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // 1. Get items from source order
          const sourceItems = await tx.orderItem.findMany({
            where: { orderId: sourceOrderId }
          })

          if (!sourceItems.length) {
            throw new Error('Kaynak adisyonda ürün bulunamadı.')
          }

          // 2. Get items from target order to check duplicates
          const targetItems = await tx.orderItem.findMany({
            where: { orderId: targetOrderId }
          })

          // 3. Move items logic with quantity merging
          for (const sourceItem of sourceItems) {
            const existingItem = targetItems.find(
              (t) => t.productId === sourceItem.productId && !t.isPaid && !sourceItem.isPaid
            )

            if (existingItem) {
              // Update quantity of existing item
              await tx.orderItem.update({
                where: { id: existingItem.id },
                data: { quantity: existingItem.quantity + sourceItem.quantity }
              })
              // Delete source item since it's merged
              await tx.orderItem.delete({ where: { id: sourceItem.id } })
            } else {
              // Move item to target order (just update orderId)
              await tx.orderItem.update({
                where: { id: sourceItem.id },
                data: { orderId: targetOrderId }
              })
            }
          }

          // 4. Move payments
          await tx.transaction.updateMany({
            where: { orderId: sourceOrderId },
            data: { orderId: targetOrderId }
          })

          // 5. Delete source order
          await tx.order.delete({ where: { id: sourceOrderId } })

          // 6. Recalculate target order total
          const allTargetItems = await tx.orderItem.findMany({
            where: { orderId: targetOrderId }
          })
          const totalAmount = allTargetItems.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
          )

          const updatedOrder = (await tx.order.update({
            where: { id: targetOrderId },
            data: { totalAmount },
            include: {
              items: { include: { product: true } },
              payments: true,
              table: true
            }
          })) as unknown as Order

          return updatedOrder
        },
        {
          timeout: 20000 // Increase timeout to 20s
        }
      )

      // Log outside transaction
      await logService.createLog(
        'MERGE_TABLES',
        result.table?.name,
        `Adisyonlar birleştirildi (Toplam: ₺${(result.totalAmount / 100).toFixed(2)})`
      )

      return { success: true as const, data: result }
    } catch (error) {
      logger.error('OrderService.mergeTables', error)
      return { success: false as const, error: String(error) }
    }
  }
}

export const orderService = new OrderService()
