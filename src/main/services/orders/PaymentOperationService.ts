import { formatCurrency } from '@shared/utils/currency'
import { ApiResponse, Order, ORDER_STATUS } from '../../../shared/types'
import { prisma } from '../../db/prisma'
import { logService } from '../LogService'
import {
  formatOrder,
  ORDER_ITEM_SELECT,
  ORDER_SELECT,
  OrderWithRelations,
  PrismaTransaction,
  SplitPayment
} from './types'
import { handleOrderError } from './utils'

export class PaymentOperationService {
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
        splitPayments.push({
          id,
          quantity,
          productName,
          orderItem: {
            orderId: orderItem.orderId,
            productId: orderItem.productId,
            quantity: orderItem.quantity,
            unitPrice: orderItem.unitPrice
          }
        })
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

        if (amount > remainingBefore && method === 'CARD') {
          throw new Error('Kart ile kalan tutardan fazla ödeme alınamaz.')
        }

        await tx.transaction.create({ data: { orderId, amount, paymentMethod: method } })

        let paidItemsLogs: string[] = []
        if (options?.itemsToMarkPaid && options.itemsToMarkPaid.length > 0) {
          paidItemsLogs = await this.applyItemsPaidStatus(tx, options.itemsToMarkPaid)
        }

        const newRemaining = remainingBefore - amount

        if (newRemaining <= 0) {
          await tx.orderItem.updateMany({ where: { orderId }, data: { isPaid: true } })
          const closedOrder = await tx.order.update({
            where: { id: orderId },
            data: { status: ORDER_STATUS.CLOSED },
            select: ORDER_SELECT
          })
          return {
            order: formatOrder(closedOrder as OrderWithRelations) as Order,
            completed: true,
            itemsLogs: paidItemsLogs
          }
        }

        const updatedOrder = await tx.order.findUnique({
          where: { id: orderId },
          select: ORDER_SELECT
        })
        if (!updatedOrder) throw new Error('Sipariş bulunamadı.')
        return {
          order: formatOrder(updatedOrder as OrderWithRelations) as Order,
          completed: false,
          itemsLogs: paidItemsLogs
        }
      })

      const tableName = result.order.table?.name || 'Masa'
      const methodStr = method === 'CASH' ? 'Nakit' : 'Kart'
      const formattedAmount = formatCurrency(amount)

      if (result.completed) {
        const itemDetails = (result.order.items || [])
          .map((i) => `${i.quantity}x ${i.product?.name}`)
          .join(', ')
        await logService.createLog(
          'CLOSE_TABLE',
          tableName,
          `${formattedAmount} ${methodStr} ile adisyon kapatıldı. Ödenenler: ${itemDetails}`
        )
      } else if (!options?.skipLog) {
        const logExt =
          result.itemsLogs && result.itemsLogs.length > 0
            ? ` (Ödenenler: ${result.itemsLogs.join(', ')})`
            : ''
        await logService.createLog(
          method === 'CASH' ? 'PAYMENT_CASH' : 'PAYMENT_CARD',
          tableName,
          `${formattedAmount} ${methodStr} ödeme alındı.${logExt}`
        )
      }

      return { success: true, data: result }
    } catch (error) {
      return handleOrderError('PaymentOperationService.processPayment', error, 'Ödeme alınamadı.')
    }
  }

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

      return { success: true, data: formatOrder(finalOrder as OrderWithRelations) }
    } catch (error) {
      return handleOrderError('PaymentOperationService.markItemsPaid', error, 'Ürünler ödenemedi.')
    }
  }
}
