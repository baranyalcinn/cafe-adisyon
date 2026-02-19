import { BrowserWindow } from 'electron'
import { ApiResponse, Order } from '../../shared/types'
import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'
import { toPlain } from '../lib/toPlain'
import { logService } from './LogService'

export class OrderService {
  private broadcastDashboardUpdate(): void {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('dashboard:update')
    })
  }

  async getOpenOrderForTable(tableId: string): Promise<ApiResponse<Order | null>> {
    try {
      const order = await prisma.order.findFirst({
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
      })
      return { success: true, data: toPlain<Order | null>(order) }
    } catch (error) {
      logger.error('OrderService.getOpenOrderForTable', error)
      return { success: false, error: 'Sipariş bulunamadı.' }
    }
  }

  async createOrder(tableId: string): Promise<ApiResponse<Order>> {
    try {
      // Check existing
      const existing = await prisma.order.findFirst({
        where: { tableId, status: 'OPEN' }
      })
      if (existing) return { success: true, data: toPlain<Order>(existing) }

      const order = await prisma.order.create({
        data: {
          tableId,
          status: 'OPEN'
        },
        include: { items: true, payments: true }
      })

      this.broadcastDashboardUpdate()
      return { success: true, data: toPlain<Order>(order) }
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
      // Use transaction to prevent race condition on concurrent adds of same product
      const txResult = await prisma.$transaction(async (tx) => {
        const existingItem = await tx.orderItem.findFirst({
          where: { orderId, productId, isPaid: false }
        })

        if (existingItem) {
          await tx.orderItem.update({
            where: { id: existingItem.id },
            data: { quantity: existingItem.quantity + quantity }
          })
        } else {
          await tx.orderItem.create({
            data: { orderId, productId, quantity, unitPrice }
          })
        }

        // Fetch product name and table name inside the transaction to avoid N+1
        const [product, order] = await Promise.all([
          tx.product.findUnique({ where: { id: productId }, select: { name: true } }),
          tx.order.findUnique({ where: { id: orderId }, include: { table: true } })
        ])

        return { productName: product?.name || 'Ürün', tableName: order?.table?.name }
      })

      const updatedOrder = await this.recalculateOrderTotal(orderId)

      // Log activity using data already fetched inside the transaction
      await logService.createLog(
        'ADD_ITEM',
        txResult.tableName,
        `${quantity}x ${txResult.productName} eklendi`
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
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          table: true,
          items: {
            include: { product: true }
          }
        }
      })
      await prisma.order.delete({ where: { id: orderId } })

      if (order) {
        const itemDetails = order.items
          .map((i) => `${i.quantity}x ${i.product?.name || 'Ürün'}`)
          .join(', ')

        await logService.createLog(
          'DELETE_ORDER',
          order.table?.name,
          `Masa boşaltıldı: ${itemDetails}`
        )
      }

      return { success: true, data: null }
    } catch (error) {
      logger.error('OrderService.deleteOrder', error)
      return { success: false, error: 'Sipariş silinemedi.' }
    }
  }

  async closeOrder(orderId: string): Promise<ApiResponse<Order>> {
    try {
      const order = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CLOSED' }
      })

      this.broadcastDashboardUpdate()
      return { success: true, data: toPlain<Order>(order) }
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
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: data as { status?: 'OPEN' | 'CLOSED'; totalAmount?: number; isLocked?: boolean },
        include: {
          items: { include: { product: true } },
          payments: true
        }
      })

      return { success: true, data: toPlain<Order>(updatedOrder) }
    } catch (error) {
      logger.error('OrderService.updateOrder', error)
      return { success: false, error: 'Sipariş güncellenemedi.' }
    }
  }

  async toggleLock(orderId: string, isLocked: boolean): Promise<ApiResponse<Order>> {
    try {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { isLocked },
        include: {
          items: { include: { product: true } },
          payments: true
        }
      })
      return { success: true, data: toPlain<Order>(updatedOrder) }
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
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { payments: true }
        })

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

          const closedOrder = await tx.order.update({
            where: { id: orderId },
            data: { status: 'CLOSED' },
            include: { items: { include: { product: true } }, payments: true, table: true }
          })

          return { order: toPlain<Order>(closedOrder), completed: true }
        }

        // 5. Partial payment — return updated order
        const updatedOrder = await tx.order.findUnique({
          where: { id: orderId },
          include: { items: { include: { product: true } }, payments: true, table: true }
        })

        return { order: toPlain<Order>(updatedOrder!), completed: false }
      })

      // Log outside transaction (non-critical)
      await logService.createLog(
        method === 'CASH' ? 'PAYMENT_CASH' : 'PAYMENT_CARD',
        result.order.table?.name,
        `₺${(amount / 100).toFixed(2)} ${method === 'CASH' ? 'nakit' : 'kart'} ödeme alındı`
      )

      if (result.completed) {
        // Find items that were unpaid before this closure (simplified: list all items as it's closed)
        // Or better: pass the originally unpaid items from the transaction result if possible.
        // Since we don't return them from transaction easily without refactor, we can list ALL items order had.
        // But user wants to know what was paid *now*.
        // In full payment, everything is paid.
        // Let's list all items concisely.
        const itemDetails = (result.order.items || [])
          .map((i) => `${i.quantity}x ${i.product?.name}`)
          .join(', ')

        await logService.createLog(
          'CLOSE_TABLE',
          result.order.table?.name,
          `Adisyon kapatıldı. Ödenenler: ${itemDetails}`
        )
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
      if (items.length === 0) return { success: true, data: null }

      // Wrap entire operation in a transaction for atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Batch fetch all items at once instead of N+1 individual queries
        const itemIds = items.map((i) => i.id)
        const orderItems = await tx.orderItem.findMany({
          where: { id: { in: itemIds } },
          include: { product: true }
        })

        const itemMap = new Map(orderItems.map((oi) => [oi.id, oi]))
        let resolvedOrderId: string | null = null
        const paidItemsLog: string[] = []

        for (const { id, quantity } of items) {
          const orderItem = itemMap.get(id)
          if (!orderItem) continue

          resolvedOrderId = orderItem.orderId
          const productName = orderItem.product?.name || 'Ürün'

          if (quantity >= orderItem.quantity) {
            // Pay full item
            await tx.orderItem.update({
              where: { id },
              data: { isPaid: true }
            })
            paidItemsLog.push(`${quantity}x ${productName}`)
          } else {
            // Split: decrement current, create new paid item
            await tx.orderItem.update({
              where: { id },
              data: { quantity: orderItem.quantity - quantity }
            })

            await tx.orderItem.create({
              data: {
                orderId: orderItem.orderId,
                productId: orderItem.productId,
                quantity,
                unitPrice: orderItem.unitPrice,
                isPaid: true
              }
            })
            paidItemsLog.push(`${quantity}x ${productName}`)
          }
        }

        return { orderId: resolvedOrderId, logs: paidItemsLog }
      })

      if (result.orderId) {
        const order = await prisma.order.findUnique({
          where: { id: result.orderId },
          include: { table: true }
        })
        if (result.logs.length > 0) {
          await logService.createLog(
            'ITEMS_PAID',
            order?.table?.name,
            `Ürün ödemesi alındı: ${result.logs.join(', ')}`
          )
        }

        const updated = await this.recalculateOrderTotal(result.orderId)
        return { success: true, data: updated }
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
      })) as Order[]

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
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          table: true,
          items: {
            include: { product: true }
          },
          payments: true
        }
      })

      if (!order) {
        return { success: false, error: 'Sipariş bulunamadı.' }
      }

      return { success: true, data: toPlain<Order>(order) }
    } catch (error) {
      logger.error('OrderService.getOrderDetails', error)
      return { success: false, error: 'Sipariş detayları alınamadı.' }
    }
  }

  // --- Private Helpers ---

  private async recalculateOrderTotal(orderId: string): Promise<Order> {
    // Use aggregate to calculate total without fetching all items
    const aggregate = await prisma.orderItem.findMany({
      where: { orderId },
      select: { quantity: true, unitPrice: true }
    })
    const total = aggregate.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { totalAmount: total },
      include: {
        items: { include: { product: true } },
        payments: true
      }
    })
    return toPlain<Order>(updated)
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
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { tableId: targetTableId },
        include: {
          items: { include: { product: true } },
          payments: true,
          table: true
        }
      })

      // Log activity — use updatedOrder.table (already fetched via include)
      await logService.createLog(
        'TRANSFER_TABLE',
        undefined,
        `${sourceOrder.table?.name || 'Masa'} -> ${updatedOrder.table?.name || 'Masa'} taşındı`
      )

      return { success: true, data: toPlain<Order>(updatedOrder) }
    } catch (error) {
      logger.error('OrderService.transferTable', error)
      return { success: false, error: 'Masa taşıma işlemi başarısız.' }
    }
  }

  async mergeTables(sourceOrderId: string, targetOrderId: string): Promise<ApiResponse<Order>> {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // 1. Get source items
          const sourceItems = await tx.orderItem.findMany({
            where: { orderId: sourceOrderId }
          })

          if (!sourceItems.length) {
            throw new Error('Kaynak adisyonda ürün bulunamadı.')
          }

          // 2. Get source and target order totals (for smart calculation)
          const [sourceOrder, targetOrder] = await Promise.all([
            tx.order.findUnique({ where: { id: sourceOrderId }, select: { totalAmount: true } }),
            tx.order.findUnique({
              where: { id: targetOrderId },
              select: { totalAmount: true }
              // We need target items only to check for duplicates, but we can do a targeted fetch
              // Optimization: We still need target items to match products.
            })
          ])

          const targetItems = await tx.orderItem.findMany({
            where: { orderId: targetOrderId }
          })

          // 3. Separate items into "Move" (unique) and "Merge" (duplicate)
          const itemsToMoveIds: string[] = []
          const itemsToMerge: { sourceId: string; targetId: string; quantity: number }[] = []

          for (const sourceItem of sourceItems) {
            const existingItem = targetItems.find(
              (t) =>
                t.productId === sourceItem.productId &&
                !t.isPaid &&
                !sourceItem.isPaid &&
                t.unitPrice === sourceItem.unitPrice
            )

            if (existingItem) {
              itemsToMerge.push({
                sourceId: sourceItem.id,
                targetId: existingItem.id,
                quantity: sourceItem.quantity
              })
            } else {
              itemsToMoveIds.push(sourceItem.id)
            }
          }

          // 4. Batch Move Unique Items
          if (itemsToMoveIds.length > 0) {
            await tx.orderItem.updateMany({
              where: { id: { in: itemsToMoveIds } },
              data: { orderId: targetOrderId }
            })
          }

          // 5. Update Duplicate Items (Increment Quantity)
          // Unfortunately, standard Prisma doesn't support "updateMany set quantity = quantity + specific_val"
          // for different values in one go without raw SQL. So we strictly loop updates for duplicates.
          // Yet, since we filtered out "Move" items, this loop is smaller.
          for (const item of itemsToMerge) {
            // Find current quantity of target item (it might have been updated in this loop if multiple source items match same target)
            // But usually unique constraint prevents multiple same-product lines.
            // Safe approach: Increment specific target item.
            // Optimization: We could use raw query, but let's stick to simple update for safety.
            await tx.orderItem.update({
              where: { id: item.targetId },
              data: { quantity: { increment: item.quantity } }
            })
          }

          // 6. Batch Delete Source Items (that were merged)
          if (itemsToMerge.length > 0) {
            await tx.orderItem.deleteMany({
              where: { id: { in: itemsToMerge.map((i) => i.sourceId) } }
            })
          }

          // 7. Move payments
          await tx.transaction.updateMany({
            where: { orderId: sourceOrderId },
            data: { orderId: targetOrderId }
          })

          // 8. Delete source order
          await tx.order.delete({ where: { id: sourceOrderId } })

          // 9. Calculate new total smartly (No extra findMany!)
          const newTotal = (sourceOrder?.totalAmount || 0) + (targetOrder?.totalAmount || 0)

          const updatedOrder = await tx.order.update({
            where: { id: targetOrderId },
            data: { totalAmount: newTotal },
            include: {
              items: { include: { product: true } },
              payments: true,
              table: true
            }
          })

          return toPlain<Order>(updatedOrder)
        },
        {
          timeout: 20000
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
