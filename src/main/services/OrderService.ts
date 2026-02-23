import { EventEmitter } from 'events'
import { ApiResponse, Order, ORDER_STATUS, OrderStatus } from '../../shared/types'
import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'
import { toPlain } from '../lib/toPlain'
import { logService } from './LogService'

const ORDER_ITEM_SELECT = {
  id: true,
  orderId: true,
  productId: true,
  quantity: true,
  unitPrice: true,
  isPaid: true,
  product: {
    select: {
      id: true,
      name: true,
      price: true,
      categoryId: true
    }
  }
}

const ORDER_SELECT = {
  id: true,
  tableId: true,
  status: true,
  totalAmount: true,
  isLocked: true,
  createdAt: true,
  updatedAt: true,
  table: {
    select: {
      id: true,
      name: true
    }
  },
  items: {
    select: ORDER_ITEM_SELECT
  },
  payments: true
}

export class OrderService extends EventEmitter {
  private dashboardUpdateTimer: NodeJS.Timeout | null = null

  private broadcastDashboardUpdate(): void {
    if (this.dashboardUpdateTimer) {
      clearTimeout(this.dashboardUpdateTimer)
    }

    this.dashboardUpdateTimer = setTimeout(() => {
      this.emit('order:updated')
    }, 500)
  }

  async getOpenOrderForTable(tableId: string): Promise<ApiResponse<Order | null>> {
    try {
      const order = await prisma.order.findFirst({
        where: {
          tableId: tableId,
          status: ORDER_STATUS.OPEN
        },
        select: ORDER_SELECT
      })
      return { success: true, data: order as unknown as Order }
    } catch (error) {
      logger.error('OrderService.getOpenOrderForTable', error)
      return { success: false, error: 'Sipariş bulunamadı.' }
    }
  }

  async createOrder(tableId: string): Promise<ApiResponse<Order>> {
    try {
      // Check existing
      const existing = await prisma.order.findFirst({
        where: { tableId, status: ORDER_STATUS.OPEN }
      })
      if (existing) return { success: true, data: toPlain<Order>(existing) }

      const order = await prisma.order.create({
        data: {
          tableId,
          status: ORDER_STATUS.OPEN,
          totalAmount: 0
        },
        select: ORDER_SELECT
      })

      this.broadcastDashboardUpdate()
      return { success: true, data: order as unknown as Order }
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

        // Atomically increment the totalAmount based on added items
        const diff = quantity * unitPrice

        const [updatedOrder, product] = await Promise.all([
          tx.order.update({
            where: { id: orderId },
            data: { totalAmount: { increment: diff } },
            select: ORDER_SELECT
          }),
          tx.product.findUnique({ where: { id: productId }, select: { name: true } })
        ])

        const orderResult = updatedOrder as unknown as Order
        return {
          updatedOrder: orderResult,
          productName: product?.name || 'Ürün',
          tableName: orderResult.table?.name
        }
      })

      // Log activity
      await logService.createLog(
        'ADD_ITEM',
        txResult.tableName,
        `${quantity}x ${txResult.productName} eklendi`
      )

      return { success: true, data: txResult.updatedOrder }
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

      const txResult = await prisma.$transaction(async (tx) => {
        const oldItem = await tx.orderItem.findUnique({ where: { id: itemId } })
        if (!oldItem) throw new Error('Item not found')

        const diff = (quantity - oldItem.quantity) * oldItem.unitPrice

        const item = await tx.orderItem.update({
          where: { id: itemId },
          data: { quantity }
        })

        const updated = await tx.order.update({
          where: { id: item.orderId },
          data: { totalAmount: { increment: diff } },
          select: ORDER_SELECT
        })

        // Check if fully paid and should be closed
        const agg = await tx.transaction.aggregate({
          where: { orderId: item.orderId },
          _sum: { amount: true }
        })
        const totalPaid = agg._sum.amount || 0

        if (totalPaid > 0 && (updated as unknown as Order).totalAmount <= totalPaid) {
          await tx.orderItem.updateMany({
            where: { orderId: item.orderId, isPaid: false },
            data: { isPaid: true }
          })

          const closedOrder = await tx.order.update({
            where: { id: item.orderId },
            data: { status: ORDER_STATUS.CLOSED },
            select: ORDER_SELECT
          })

          this.broadcastDashboardUpdate()
          return closedOrder as unknown as Order
        }

        return updated as unknown as Order
      })

      return { success: true, data: txResult }
    } catch (error) {
      logger.error('OrderService.updateItem', error)
      return { success: false, error: 'Ürün güncellenemedi.' }
    }
  }

  async removeItem(itemId: string): Promise<ApiResponse<Order>> {
    try {
      const txResult = await prisma.$transaction(async (tx) => {
        const item = await tx.orderItem.delete({
          where: { id: itemId },
          include: { product: true, order: { include: { table: true } } }
        })

        const diff = item.quantity * item.unitPrice

        const updatedOrder = await tx.order.update({
          where: { id: item.orderId },
          data: { totalAmount: { decrement: diff } },
          select: ORDER_SELECT
        })

        // Check if fully paid and should be closed
        const agg = await tx.transaction.aggregate({
          where: { orderId: item.orderId },
          _sum: { amount: true }
        })
        const totalPaid = agg._sum.amount || 0

        if (totalPaid > 0 && (updatedOrder as unknown as Order).totalAmount <= totalPaid) {
          await tx.orderItem.updateMany({
            where: { orderId: item.orderId, isPaid: false },
            data: { isPaid: true }
          })

          const closedOrder = await tx.order.update({
            where: { id: item.orderId },
            data: { status: ORDER_STATUS.CLOSED },
            select: ORDER_SELECT
          })

          this.broadcastDashboardUpdate()

          return {
            updatedOrder: closedOrder as unknown as Order,
            item
          }
        }

        return {
          updatedOrder: updatedOrder as unknown as Order,
          item
        }
      })

      // Log activity
      await logService.createLog(
        'REMOVE_ITEM',
        txResult.item.order?.table?.name,
        `${txResult.item.quantity}x ${txResult.item.product?.name || 'Ürün'} çıkarıldı`
      )

      return { success: true, data: txResult.updatedOrder }
    } catch (error) {
      logger.error('OrderService.removeItem', error)
      return { success: false, error: 'Ürün silinemedi.' }
    }
  }

  async deleteOrder(orderId: string): Promise<ApiResponse<null>> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          table: { select: { name: true } },
          items: {
            select: {
              quantity: true,
              product: { select: { name: true } }
            }
          },
          payments: {
            take: 1
          }
        }
      })

      if (!order) {
        return { success: false, error: 'Sipariş bulunamadı.' }
      }

      if (order.payments && order.payments.length > 0) {
        return {
          success: false,
          error: 'Ödeme alınmış bir sipariş silinemez. Lütfen iptal/iade işlemi yapın.'
        }
      }

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
        data: { status: ORDER_STATUS.CLOSED }
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
        data: data as { status?: OrderStatus; totalAmount?: number; isLocked?: boolean },
        select: ORDER_SELECT
      })

      return { success: true, data: updatedOrder as unknown as Order }
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
        select: ORDER_SELECT
      })
      return { success: true, data: updatedOrder as unknown as Order }
    } catch (error) {
      logger.error('OrderService.toggleLock', error)
      return { success: false, error: 'Kilit durumu değiştirilemedi.' }
    }
  }

  async processPayment(
    orderId: string,
    amount: number,
    method: string,
    options?: { skipLog?: boolean }
  ): Promise<ApiResponse<{ order: Order; completed: boolean }>> {
    try {
      if (amount <= 0) {
        throw new Error('Ödeme tutarı sıfırdan büyük olmalıdır')
      }
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create payment transaction
        await tx.transaction.create({
          data: {
            orderId,
            amount,
            paymentMethod: method
          }
        })

        // 2. Fetch the newly updated aggregate directly from DB to prevent race conditions
        const agg = await tx.transaction.aggregate({
          where: { orderId },
          _sum: { amount: true }
        })
        const totalPaid = agg._sum.amount || 0

        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: { totalAmount: true }
        })

        if (!order) throw new Error('Order not found')

        // 3. Check totals securely via DB aggregation
        const remaining = order.totalAmount - totalPaid

        // 4. Close if fully paid
        if (remaining <= 0) {
          await tx.orderItem.updateMany({
            where: { orderId },
            data: { isPaid: true }
          })

          const closedOrder = await tx.order.update({
            where: { id: orderId },
            data: { status: ORDER_STATUS.CLOSED },
            select: ORDER_SELECT
          })
          return { order: closedOrder as unknown as Order, completed: true }
        }

        // 5. Partial payment — return updated order
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {}, // Just to fetch the latest state cleanly if not closed
          select: ORDER_SELECT
        })

        return { order: updatedOrder as unknown as Order, completed: false }
      })

      // Log outside transaction (non-critical)
      const tableName = result.order.table?.name || 'Masa'

      if (result.completed) {
        // Completed -> Single combined log for Table Closure + Payment
        const itemDetails = (result.order.items || [])
          .map((i) => `${i.quantity}x ${i.product?.name}`)
          .join(', ')

        const methodStr = method === 'CASH' ? 'Nakit' : 'Kart'
        await logService.createLog(
          'CLOSE_TABLE',
          result.order.table?.name,
          `₺${amount / 100} ${methodStr} ile adisyon kapatıldı. Ödenenler: ${itemDetails}`
        )
      } else if (!options?.skipLog) {
        // Not completed and not skipped -> Standard Payment Log
        await logService.createLog(
          method === 'CASH' ? 'PAYMENT_CASH' : 'PAYMENT_CARD',
          tableName,
          `₺${amount / 100} ${method === 'CASH' ? 'nakit' : 'kart'} ödeme alındı`
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
    items: { id: string; quantity: number }[],
    paymentDetails?: { amount: number; method: string }
  ): Promise<ApiResponse<Order | null>> {
    try {
      if (items.length === 0) return { success: true, data: null }

      // Wrap entire operation in a transaction for atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Batch fetch all items at once instead of N+1 individual queries
        const itemIds = items.map((i) => i.id)
        const orderItems = await tx.orderItem.findMany({
          where: { id: { in: itemIds } },
          select: ORDER_ITEM_SELECT
        })

        const itemMap = new Map(orderItems.map((oi) => [oi.id, oi]))
        let resolvedOrderId: string | null = null
        const paidItemsLog: string[] = []

        const fullPayIds: string[] = []
        const splitPayments: {
          id: string
          quantity: number
          productName: string
          orderItem: { orderId: string; productId: string; unitPrice: number; quantity: number }
        }[] = []

        for (const { id, quantity } of items) {
          const orderItem = itemMap.get(id)
          if (!orderItem) continue

          resolvedOrderId = orderItem.orderId
          const productName = orderItem.product?.name || 'Ürün'

          if (quantity >= orderItem.quantity) {
            fullPayIds.push(id)
            paidItemsLog.push(`${quantity}x ${productName}`)
          } else {
            splitPayments.push({ id, quantity, productName, orderItem })
          }
        }

        if (fullPayIds.length > 0) {
          await tx.orderItem.updateMany({
            where: { id: { in: fullPayIds } },
            data: { isPaid: true }
          })
        }

        if (splitPayments.length > 0) {
          // 2. Create all newly split items in a single query
          const newItemsToInsert = splitPayments.map((split) => ({
            orderId: split.orderItem.orderId,
            productId: split.orderItem.productId,
            quantity: split.quantity,
            unitPrice: split.orderItem.unitPrice,
            isPaid: true
          }))

          await tx.orderItem.createMany({
            data: newItemsToInsert
          })

          // 3. Update all old item quantities in parallel
          await Promise.all(
            splitPayments.map((split) =>
              tx.orderItem.update({
                where: { id: split.id },
                data: { quantity: split.orderItem.quantity - split.quantity }
              })
            )
          )

          splitPayments.forEach((split) => {
            paidItemsLog.push(`${split.quantity}x ${split.productName}`)
          })
        }

        return { orderId: resolvedOrderId, logs: paidItemsLog }
      })

      if (result.orderId) {
        // The order totalAmount doesn't change when simply marking items paid or splitting them.
        // We can just fetch the updated order data to return it directly.
        const finalOrder = await prisma.order.findUnique({
          where: { id: result.orderId },
          select: ORDER_SELECT
        })

        if (!finalOrder) return { success: false, error: 'Sipariş bulunamadı' }

        if (result.logs.length > 0) {
          let logDetails = ''
          if (paymentDetails) {
            const methodStr = paymentDetails.method === 'CASH' ? 'Nakit' : 'Kart'
            const formattedAmount = (paymentDetails.amount / 100).toString()
            logDetails = `₺${formattedAmount} ${methodStr} ile Ürün ödemesi alındı: ${result.logs.join(', ')}`
          } else {
            logDetails = `Ürün ödemesi alındı: ${result.logs.join(', ')}`
          }
          await logService.createLog('ITEMS_PAID', finalOrder.table?.name, logDetails)
        }

        return { success: true, data: finalOrder as unknown as Order }
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
          status: ORDER_STATUS.CLOSED,
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
        where: { status: ORDER_STATUS.CLOSED, ...dateFilter }
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
        select: ORDER_SELECT
      })

      if (!order) {
        return { success: false, error: 'Sipariş bulunamadı.' }
      }

      return { success: true, data: order as unknown as Order }
    } catch (error) {
      logger.error('OrderService.getOrderDetails', error)
      return { success: false, error: 'Sipariş detayları alınamadı.' }
    }
  }

  // --- Private Helpers ---

  async transferTable(orderId: string, targetTableId: string): Promise<ApiResponse<Order>> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Check if target table is empty inside transaction
        const targetOrder = await tx.order.findFirst({
          where: { tableId: targetTableId, status: ORDER_STATUS.OPEN }
        })

        if (targetOrder) {
          throw new Error('Hedef masada açık adisyon var. Lütfen birleştirme işlemini kullanın.')
        }

        // 2. Get source order (for logging)
        const sourceOrder = await tx.order.findUnique({
          where: { id: orderId },
          include: { table: true }
        })

        if (!sourceOrder) {
          throw new Error('Taşınacak adisyon bulunamadı.')
        }

        // 3. Update order tableId
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { tableId: targetTableId },
          select: ORDER_SELECT
        })

        return { sourceOrder, updatedOrder: updatedOrder as unknown as Order }
      })

      // Log activity outside transaction
      await logService.createLog(
        'TRANSFER_TABLE',
        undefined,
        `${result.sourceOrder.table?.name || 'Masa'} -> ${result.updatedOrder.table?.name || 'Masa'} taşındı`
      )

      return { success: true, data: result.updatedOrder }
    } catch (error) {
      logger.error('OrderService.transferTable', error)
      if (
        error instanceof Error &&
        (error.message.includes('Hedef masada') || error.message.includes('Taşınacak adisyon'))
      ) {
        return { success: false, error: error.message }
      }
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

          // 5. Batch Update Duplicate Items (Increment Quantity in parallel)
          // Parallelize the DB await calls rather than sequential loop
          if (itemsToMerge.length > 0) {
            await Promise.all(
              itemsToMerge.map((item) =>
                tx.orderItem.update({
                  where: { id: item.targetId },
                  data: { quantity: { increment: item.quantity } }
                })
              )
            )
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
            select: ORDER_SELECT
          })

          return updatedOrder as unknown as Order
        },
        {
          timeout: 20000
        }
      )

      // Log outside transaction
      await logService.createLog(
        'MERGE_TABLES',
        result.table?.name,
        `Adisyonlar birleştirildi (Toplam: ₺${result.totalAmount / 100})`
      )

      return { success: true as const, data: result }
    } catch (error) {
      logger.error('OrderService.mergeTables', error)
      return { success: false as const, error: String(error) }
    }
  }
}

export const orderService = new OrderService()
