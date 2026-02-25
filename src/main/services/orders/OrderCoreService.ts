import { ApiResponse, Order, ORDER_STATUS } from '../../../shared/types'
import { prisma } from '../../db/prisma'
import { toPlain } from '../../lib/toPlain'
import { logService } from '../LogService'
import { formatOrder, ORDER_SELECT, OrderWithRelations } from './types'
import { handleOrderError } from './utils'

export class OrderCoreService {
  async getOpenOrderForTable(tableId: string): Promise<ApiResponse<Order | null>> {
    try {
      const order = await prisma.order.findFirst({
        where: { tableId, status: ORDER_STATUS.OPEN },
        select: ORDER_SELECT
      })
      return { success: true, data: formatOrder(order as OrderWithRelations) }
    } catch (error) {
      return handleOrderError('OrderCoreService.getOpenOrderForTable', error, 'Sipariş bulunamadı.')
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

      return { success: true, data: formatOrder(order as OrderWithRelations) as Order }
    } catch (error) {
      return handleOrderError('OrderCoreService.createOrder', error, 'Sipariş oluşturulamadı.')
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
          updatedOrder: formatOrder(updatedOrder as OrderWithRelations) as Order,
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
      return handleOrderError('OrderCoreService.addItem', error, 'Ürün eklenemedi.')
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
          return formatOrder(closedOrder as OrderWithRelations) as Order
        }

        return formatOrder(updated as OrderWithRelations) as Order
      })

      return { success: true, data: txResult }
    } catch (error) {
      return handleOrderError('OrderCoreService.updateItem', error, 'Ürün güncellenemedi.')
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
          return { updatedOrder: formatOrder(closedOrder as OrderWithRelations) as Order, item }
        }

        return { updatedOrder: formatOrder(updatedOrder as OrderWithRelations) as Order, item }
      })

      await logService.createLog(
        'REMOVE_ITEM',
        txResult.item.order?.table?.name,
        `${txResult.item.quantity}x ${txResult.item.product?.name || 'Ürün'} çıkarıldı`
      )

      return { success: true, data: txResult.updatedOrder }
    } catch (error) {
      return handleOrderError('OrderCoreService.removeItem', error, 'Ürün silinemedi.')
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
          _count: { select: { payments: true } }
        }
      })

      if (!order) throw new Error('Sipariş bulunamadı.')

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
      return handleOrderError('OrderCoreService.deleteOrder', error, 'Sipariş silinemedi.')
    }
  }

  async getOrderHistory(options: {
    date?: string
    limit?: number
    offset?: number
    dateFilter?: Record<string, unknown>
  }): Promise<ApiResponse<{ orders: Order[]; totalCount: number; hasMore: boolean }>> {
    try {
      const { limit = 50, offset = 0, dateFilter = {} } = options

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
      return handleOrderError(
        'OrderCoreService.getOrderHistory',
        error,
        'Sipariş geçmişi alınamadı.'
      )
    }
  }

  async getOrderDetails(orderId: string): Promise<ApiResponse<Order>> {
    try {
      const order = await prisma.order.findUnique({ where: { id: orderId }, select: ORDER_SELECT })
      if (!order) throw new Error('Sipariş bulunamadı.')
      return { success: true, data: formatOrder(order as OrderWithRelations) as Order }
    } catch (error) {
      return handleOrderError(
        'OrderCoreService.getOrderDetails',
        error,
        'Sipariş detayları alınamadı.'
      )
    }
  }

  async closeOrder(orderId: string): Promise<ApiResponse<Order>> {
    try {
      const order = await prisma.order.update({
        where: { id: orderId },
        data: { status: ORDER_STATUS.CLOSED },
        select: ORDER_SELECT
      })
      return { success: true, data: formatOrder(order as OrderWithRelations) as Order }
    } catch (error) {
      return handleOrderError('OrderCoreService.closeOrder', error, 'Sipariş kapatılamadı.')
    }
  }

  async updateOrder(
    orderId: string,
    data: { status?: string; totalAmount?: number; isLocked?: boolean }
  ): Promise<ApiResponse<Order>> {
    try {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: data as any,
        select: ORDER_SELECT
      })
      return { success: true, data: formatOrder(updatedOrder as OrderWithRelations) as Order }
    } catch (error) {
      return handleOrderError('OrderCoreService.updateOrder', error, 'Sipariş güncellenemedi.')
    }
  }
}
