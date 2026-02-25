import { formatCurrency } from '@shared/utils/currency'
import { getBusinessDayStart } from '@shared/utils/date'
import { EventEmitter } from 'events'
import { Prisma } from '../../generated/prisma/client'
import { ApiResponse, Order, ORDER_STATUS, OrderStatus } from '../../shared/types'
import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'
import { toPlain } from '../lib/toPlain'
import { logService } from './LogService'

// ============================================================================
// System Configuration & Constants
// ============================================================================

const SYSTEM_CONFIG = {
  BROADCAST_DELAY_MS: 500,
  MERGE_TIMEOUT_MS: 20000,
  EVENTS: {
    ORDER_UPDATED: 'order:updated'
  }
} as const

type PrismaTransaction = Prisma.TransactionClient

interface SplitPayment {
  id: string
  quantity: number
  productName: string
  orderItem: {
    orderId: string
    productId: string
    quantity: number
    unitPrice: number
  }
}

const ORDER_ITEM_SELECT = {
  id: true,
  orderId: true,
  productId: true,
  quantity: true,
  unitPrice: true,
  isPaid: true,
  product: { select: { id: true, name: true, price: true, categoryId: true } }
}

const ORDER_SELECT = {
  id: true,
  tableId: true,
  status: true,
  totalAmount: true,
  isLocked: true,
  createdAt: true,
  updatedAt: true,
  table: { select: { id: true, name: true } },
  items: { select: ORDER_ITEM_SELECT },
  payments: true
}

type OrderWithRelations = Prisma.OrderGetPayload<{ select: typeof ORDER_SELECT }>

// ============================================================================
// Service Class
// ============================================================================

export class OrderService extends EventEmitter {
  private dashboardUpdateTimer: NodeJS.Timeout | null = null

  // --- Utility Methods ---

  private broadcastDashboardUpdate(): void {
    if (this.dashboardUpdateTimer) clearTimeout(this.dashboardUpdateTimer)
    this.dashboardUpdateTimer = setTimeout(() => {
      this.emit(SYSTEM_CONFIG.EVENTS.ORDER_UPDATED)
    }, SYSTEM_CONFIG.BROADCAST_DELAY_MS)
  }

  private formatOrder(order: OrderWithRelations | null): Order | null {
    if (!order) return null
    return order as unknown as Order
  }

  private handleError<T = null>(
    methodName: string,
    error: unknown,
    defaultMessage: string
  ): ApiResponse<T> {
    logger.error(`OrderService.${methodName}`, error)

    // Prisma/Database hataları haricindeki iş mantığı (business logic) hatalarını kullanıcıya göster
    if (
      error instanceof Error &&
      !error.message.includes('prisma') &&
      !error.message.includes('Database')
    ) {
      return { success: false, error: error.message }
    }
    return { success: false, error: defaultMessage }
  }

  // Özel yardımcı: Transaction içinde ürünleri "ödendi" işaretler ve log string'i döndürür
  private async applyItemsPaidStatus(
    tx: PrismaTransaction,
    items: { id: string; quantity: number }[]
  ): Promise<string[]> {
    const itemIds = items.map((i) => i.id)
    const orderItems = await tx.orderItem.findMany({
      where: { id: { in: itemIds } },
      select: ORDER_ITEM_SELECT
    })
    const itemMap = new Map(orderItems.map((oi) => [oi.id, oi]))

    const paidItemsLog: string[] = []
    const fullPayIds: string[] = []
    const splitPayments: SplitPayment[] = []

    for (const { id, quantity } of items) {
      const orderItem = itemMap.get(id)
      if (!orderItem) continue

      const productName = orderItem.product?.name || 'Ürün'

      if (quantity >= orderItem.quantity) {
        fullPayIds.push(id)
        paidItemsLog.push(`${quantity}x ${productName}`)
      } else {
        splitPayments.push({ id, quantity, productName, orderItem })
      }
    }

    if (fullPayIds.length > 0)
      await tx.orderItem.updateMany({ where: { id: { in: fullPayIds } }, data: { isPaid: true } })

    if (splitPayments.length > 0) {
      const newItemsToInsert = splitPayments.map((split) => ({
        orderId: split.orderItem.orderId,
        productId: split.orderItem.productId,
        quantity: split.quantity,
        unitPrice: split.orderItem.unitPrice,
        isPaid: true
      }))
      await tx.orderItem.createMany({ data: newItemsToInsert })

      await Promise.all(
        splitPayments.map((split) =>
          tx.orderItem.update({
            where: { id: split.id },
            data: { quantity: split.orderItem.quantity - split.quantity }
          })
        )
      )

      splitPayments.forEach((split) => paidItemsLog.push(`${split.quantity}x ${split.productName}`))
    }

    return paidItemsLog
  }

  // --- Public API ---

  async getOpenOrderForTable(tableId: string): Promise<ApiResponse<Order | null>> {
    try {
      const order = await prisma.order.findFirst({
        where: { tableId, status: ORDER_STATUS.OPEN },
        select: ORDER_SELECT
      })
      return { success: true, data: this.formatOrder(order) }
    } catch (error) {
      return this.handleError('getOpenOrderForTable', error, 'Sipariş bulunamadı.')
    }
  }

  async createOrder(tableId: string): Promise<ApiResponse<Order>> {
    try {
      const existing = await prisma.order.findFirst({
        where: { tableId, status: ORDER_STATUS.OPEN }
      })
      if (existing) return { success: true, data: toPlain<Order>(existing) }

      const order = await prisma.order.create({
        data: { tableId, status: ORDER_STATUS.OPEN, totalAmount: 0 },
        select: ORDER_SELECT
      })

      this.broadcastDashboardUpdate()
      return { success: true, data: this.formatOrder(order) as Order }
    } catch (error) {
      return this.handleError('createOrder', error, 'Sipariş oluşturulamadı.')
    }
  }

  async addItem(
    orderId: string,
    productId: string,
    quantity: number,
    unitPrice: number
  ): Promise<ApiResponse<Order>> {
    try {
      if (quantity <= 0 || !Number.isInteger(quantity))
        throw new Error('Miktar pozitif tam sayı olmalıdır.')
      if (unitPrice < 0 || !Number.isInteger(unitPrice))
        throw new Error('Birim fiyat negatif olamaz.')

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
          await tx.orderItem.create({ data: { orderId, productId, quantity, unitPrice } })
        }

        const [updatedOrder, product] = await Promise.all([
          tx.order.update({
            where: { id: orderId },
            data: { totalAmount: { increment: quantity * unitPrice } },
            select: ORDER_SELECT
          }),
          tx.product.findUnique({ where: { id: productId }, select: { name: true } })
        ])

        return {
          updatedOrder: this.formatOrder(updatedOrder) as Order,
          productName: product?.name || 'Ürün',
          tableName: updatedOrder.table?.name
        }
      })

      await logService.createLog(
        'ADD_ITEM',
        txResult.tableName,
        `${quantity}x ${txResult.productName} eklendi`
      )
      return { success: true, data: txResult.updatedOrder }
    } catch (error) {
      return this.handleError('addItem', error, 'Ürün eklenemedi.')
    }
  }

  async updateItem(itemId: string, quantity: number): Promise<ApiResponse<Order>> {
    try {
      if (quantity <= 0) return this.removeItem(itemId)

      const txResult = await prisma.$transaction(async (tx) => {
        const oldItem = await tx.orderItem.findUnique({ where: { id: itemId } })
        if (!oldItem) throw new Error('Ürün bulunamadı.')

        const diff = (quantity - oldItem.quantity) * oldItem.unitPrice
        const item = await tx.orderItem.update({ where: { id: itemId }, data: { quantity } })

        const updated = await tx.order.update({
          where: { id: item.orderId },
          data: { totalAmount: { increment: diff } },
          select: ORDER_SELECT
        })

        const agg = await tx.transaction.aggregate({
          where: { orderId: item.orderId },
          _sum: { amount: true }
        })
        const totalPaid = agg._sum.amount || 0

        if (totalPaid > 0 && (updated as OrderWithRelations).totalAmount <= totalPaid) {
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
          return this.formatOrder(closedOrder) as Order
        }

        return this.formatOrder(updated) as Order
      })

      return { success: true, data: txResult }
    } catch (error) {
      return this.handleError('updateItem', error, 'Ürün güncellenemedi.')
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

        const agg = await tx.transaction.aggregate({
          where: { orderId: item.orderId },
          _sum: { amount: true }
        })
        const totalPaid = agg._sum.amount || 0

        if (totalPaid > 0 && (updatedOrder as OrderWithRelations).totalAmount <= totalPaid) {
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
          return { updatedOrder: this.formatOrder(closedOrder) as Order, item }
        }

        return { updatedOrder: this.formatOrder(updatedOrder) as Order, item }
      })

      await logService.createLog(
        'REMOVE_ITEM',
        txResult.item.order?.table?.name,
        `${txResult.item.quantity}x ${txResult.item.product?.name || 'Ürün'} çıkarıldı`
      )

      return { success: true, data: txResult.updatedOrder }
    } catch (error) {
      return this.handleError('removeItem', error, 'Ürün silinemedi.')
    }
  }

  async deleteOrder(orderId: string): Promise<ApiResponse<null>> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          table: { select: { name: true } },
          items: { select: { quantity: true, product: { select: { name: true } } } },
          _count: { select: { payments: true } } // SQL seviyesinde optimize edilmiş sayım
        }
      })

      if (!order) throw new Error('Sipariş bulunamadı.')

      // Güvenlik: Ödeme alınmışsa boşaltılamaz
      if (order._count.payments > 0) {
        throw new Error('Ödeme alınmış bir sipariş silinemez. Lütfen iptal/iade işlemi yapın.')
      }

      await prisma.order.delete({ where: { id: orderId } })

      const itemDetails = order.items
        .map((i) => `${i.quantity}x ${i.product?.name || 'Ürün'}`)
        .join(', ')
      await logService.createLog(
        'DELETE_ORDER',
        order.table?.name,
        `Masa boşaltıldı: ${itemDetails}`
      )

      return { success: true, data: null }
    } catch (error) {
      return this.handleError('deleteOrder', error, 'Sipariş silinemedi.')
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
      return this.handleError('closeOrder', error, 'Sipariş kapatılamadı.')
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
      return { success: true, data: this.formatOrder(updatedOrder) as Order }
    } catch (error) {
      return this.handleError('updateOrder', error, 'Sipariş güncellenemedi.')
    }
  }

  async toggleLock(orderId: string, isLocked: boolean): Promise<ApiResponse<Order>> {
    try {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { isLocked },
        select: ORDER_SELECT
      })
      return { success: true, data: this.formatOrder(updatedOrder) as Order }
    } catch (error) {
      return this.handleError('toggleLock', error, 'Kilit durumu değiştirilemedi.')
    }
  }

  async processPayment(
    orderId: string,
    amount: number,
    method: string,
    options?: { skipLog?: boolean; itemsToMarkPaid?: { id: string; quantity: number }[] }
  ): Promise<ApiResponse<{ order: Order; completed: boolean }>> {
    try {
      if (amount <= 0) throw new Error('Ödeme tutarı sıfırdan büyük olmalıdır.')

      const result = await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: { totalAmount: true }
        })
        if (!order) throw new Error('Sipariş bulunamadı.')

        const agg = await tx.transaction.aggregate({ where: { orderId }, _sum: { amount: true } })
        const totalPaidBefore = agg._sum.amount || 0
        const remainingBefore = order.totalAmount - totalPaidBefore

        // 1. Fazla Ödeme (Overpayment) Koruması
        if (amount > remainingBefore && method === 'CARD') {
          throw new Error('Kart ile kalan tutardan fazla ödeme alınamaz.')
        }

        // 2. Ödeme İşlemini Kaydet
        await tx.transaction.create({ data: { orderId, amount, paymentMethod: method } })

        // 3. Atomik Ürün Güncellemesi (Eğer belirli ürünler ödeniyorsa aynı işlem içinde hallet)
        let paidItemsLogs: string[] = []
        if (options?.itemsToMarkPaid && options.itemsToMarkPaid.length > 0) {
          paidItemsLogs = await this.applyItemsPaidStatus(tx, options.itemsToMarkPaid)
        }

        const newRemaining = remainingBefore - amount

        // 4. Hesap kapandıysa
        if (newRemaining <= 0) {
          await tx.orderItem.updateMany({ where: { orderId }, data: { isPaid: true } })
          const closedOrder = await tx.order.update({
            where: { id: orderId },
            data: { status: ORDER_STATUS.CLOSED },
            select: ORDER_SELECT
          })
          return {
            order: this.formatOrder(closedOrder) as Order,
            completed: true,
            itemsLogs: paidItemsLogs
          }
        }

        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {},
          select: ORDER_SELECT
        })
        return {
          order: this.formatOrder(updatedOrder) as Order,
          completed: false,
          itemsLogs: paidItemsLogs
        }
      })

      const tableName = result.order.table?.name || 'Masa'
      const methodStr = method === 'CASH' ? 'Nakit' : 'Kart'
      const formattedAmount = (amount / 100).toString()

      // Log the transaction safely outside the DB transaction block
      if (result.completed) {
        const itemDetails = (result.order.items || [])
          .map((i) => `${i.quantity}x ${i.product?.name}`)
          .join(', ')
        await logService.createLog(
          'CLOSE_TABLE',
          tableName,
          `₺${formattedAmount} ${methodStr} ile adisyon kapatıldı. Ödenenler: ${itemDetails}`
        )
      } else if (!options?.skipLog) {
        const logExt =
          result.itemsLogs && result.itemsLogs.length > 0
            ? ` (Ödenenler: ${result.itemsLogs.join(', ')})`
            : ''
        await logService.createLog(
          method === 'CASH' ? 'PAYMENT_CASH' : 'PAYMENT_CARD',
          tableName,
          `₺${formattedAmount} ${methodStr} ödeme alındı.${logExt}`
        )
      }

      this.broadcastDashboardUpdate()
      return { success: true, data: result }
    } catch (error) {
      return this.handleError('processPayment', error, 'Ödeme alınamadı.')
    }
  }

  // Bağımsız ürün ödemeleri (ör: hesaptan düşme / sıfır tutar) için markItemsPaid saklandı.
  async markItemsPaid(
    items: { id: string; quantity: number }[],
    paymentDetails?: { amount: number; method: string }
  ): Promise<ApiResponse<Order | null>> {
    try {
      if (items.length === 0) return { success: true, data: null }

      const result = await prisma.$transaction(async (tx) => {
        const firstItem = await tx.orderItem.findUnique({
          where: { id: items[0].id },
          select: { orderId: true }
        })
        if (!firstItem) throw new Error('Ürün bulunamadı.')

        const paidItemsLog = await this.applyItemsPaidStatus(tx, items)
        return { orderId: firstItem.orderId, logs: paidItemsLog }
      })

      const finalOrder = await prisma.order.findUnique({
        where: { id: result.orderId },
        select: ORDER_SELECT
      })
      if (!finalOrder) throw new Error('Sipariş bulunamadı.')

      if (result.logs.length > 0) {
        const logDetails = paymentDetails
          ? `${formatCurrency(paymentDetails.amount)} ${paymentDetails.method === 'CASH' ? 'Nakit' : 'Kart'} ile Ürün ödemesi alındı: ${result.logs.join(', ')}`
          : `Ürün ödemesi alındı: ${result.logs.join(', ')}`
        await logService.createLog('ITEMS_PAID', finalOrder.table?.name, logDetails)
      }

      return { success: true, data: this.formatOrder(finalOrder) }
    } catch (error) {
      return this.handleError('markItemsPaid', error, 'Ürünler ödenemedi.')
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
        const filterDate = getBusinessDayStart(new Date(date))
        const nextDay = new Date(filterDate)
        nextDay.setDate(nextDay.getDate() + 1)
        dateFilter = { createdAt: { gte: filterDate, lt: nextDay } }
      }

      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({
          where: { status: ORDER_STATUS.CLOSED, ...dateFilter },
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            table: { select: { name: true } },
            items: {
              select: {
                id: true,
                quantity: true,
                unitPrice: true,
                product: { select: { name: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.order.count({ where: { status: ORDER_STATUS.CLOSED, ...dateFilter } })
      ])

      return {
        success: true,
        data: {
          orders: orders as Order[],
          totalCount,
          hasMore: offset + orders.length < totalCount
        }
      }
    } catch (error) {
      return this.handleError('getOrderHistory', error, 'Sipariş geçmişi alınamadı.')
    }
  }

  async getOrderDetails(orderId: string): Promise<ApiResponse<Order>> {
    try {
      const order = await prisma.order.findUnique({ where: { id: orderId }, select: ORDER_SELECT })
      if (!order) throw new Error('Sipariş bulunamadı.')
      return { success: true, data: this.formatOrder(order) as Order }
    } catch (error) {
      return this.handleError('getOrderDetails', error, 'Sipariş detayları alınamadı.')
    }
  }

  async transferTable(orderId: string, targetTableId: string): Promise<ApiResponse<Order>> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const targetOrder = await tx.order.findFirst({
          where: { tableId: targetTableId, status: ORDER_STATUS.OPEN }
        })
        if (targetOrder)
          throw new Error('Hedef masada açık adisyon var. Lütfen birleştirme işlemini kullanın.')

        const sourceOrder = await tx.order.findUnique({
          where: { id: orderId },
          include: { table: true }
        })
        if (!sourceOrder) throw new Error('Taşınacak adisyon bulunamadı.')

        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { tableId: targetTableId },
          select: ORDER_SELECT
        })
        return { sourceOrder, updatedOrder: this.formatOrder(updatedOrder) as Order }
      })

      await logService.createLog(
        'TRANSFER_TABLE',
        undefined,
        `${result.sourceOrder.table?.name || 'Masa'} -> ${result.updatedOrder.table?.name || 'Masa'} taşındı`
      )
      this.broadcastDashboardUpdate()
      return { success: true, data: result.updatedOrder }
    } catch (error) {
      return this.handleError('transferTable', error, 'Masa taşıma işlemi başarısız.')
    }
  }

  async mergeTables(sourceOrderId: string, targetOrderId: string): Promise<ApiResponse<Order>> {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const sourceItems = await tx.orderItem.findMany({ where: { orderId: sourceOrderId } })
          if (!sourceItems.length) throw new Error('Kaynak adisyonda ürün bulunamadı.')

          const [sourceOrder, targetOrder, targetItems] = await Promise.all([
            tx.order.findUnique({ where: { id: sourceOrderId }, select: { totalAmount: true } }),
            tx.order.findUnique({ where: { id: targetOrderId }, select: { totalAmount: true } }),
            tx.orderItem.findMany({ where: { orderId: targetOrderId } })
          ])

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

          if (itemsToMoveIds.length > 0)
            await tx.orderItem.updateMany({
              where: { id: { in: itemsToMoveIds } },
              data: { orderId: targetOrderId }
            })

          if (itemsToMerge.length > 0) {
            await Promise.all(
              itemsToMerge.map((item) =>
                tx.orderItem.update({
                  where: { id: item.targetId },
                  data: { quantity: { increment: item.quantity } }
                })
              )
            )
            await tx.orderItem.deleteMany({
              where: { id: { in: itemsToMerge.map((i) => i.sourceId) } }
            })
          }

          await tx.transaction.updateMany({
            where: { orderId: sourceOrderId },
            data: { orderId: targetOrderId }
          })
          await tx.order.delete({ where: { id: sourceOrderId } })

          const newTotal = (sourceOrder?.totalAmount || 0) + (targetOrder?.totalAmount || 0)
          const updatedOrder = await tx.order.update({
            where: { id: targetOrderId },
            data: { totalAmount: newTotal },
            select: ORDER_SELECT
          })

          return this.formatOrder(updatedOrder) as Order
        },
        { timeout: SYSTEM_CONFIG.MERGE_TIMEOUT_MS }
      )

      await logService.createLog(
        'MERGE_TABLES',
        result.table?.name,
        `Adisyonlar birleştirildi (Toplam: ${formatCurrency(result.totalAmount)})`
      )
      return { success: true as const, data: result }
    } catch (error) {
      return this.handleError('mergeTables', error, 'Adisyonlar birleştirilemedi.')
    }
  }
}

export const orderService = new OrderService()
