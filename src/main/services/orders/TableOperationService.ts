import { formatCurrency } from '@shared/utils/currency'
import { ApiResponse, Order, ORDER_STATUS } from '../../../shared/types'
import { prisma } from '../../db/prisma'
import { logService } from '../LogService'
import { formatOrder, ORDER_SELECT, OrderWithRelations, SYSTEM_CONFIG } from './types'
import { handleOrderError } from './utils'

export class TableOperationService {
  async toggleLock(orderId: string, isLocked: boolean): Promise<ApiResponse<Order>> {
    try {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { isLocked },
        select: ORDER_SELECT
      })
      return { success: true, data: formatOrder(updatedOrder as OrderWithRelations) as Order }
    } catch (error) {
      return handleOrderError(
        'TableOperationService.toggleLock',
        error,
        'Kilit durumu değiştirilemedi.'
      )
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
        return {
          sourceOrder,
          updatedOrder: formatOrder(updatedOrder as OrderWithRelations) as Order
        }
      })

      await logService.createLog(
        'TRANSFER_TABLE',
        undefined,
        `${result.sourceOrder.table?.name || 'Masa'} -> ${result.updatedOrder.table?.name || 'Masa'} taşındı`
      )
      return { success: true, data: result.updatedOrder }
    } catch (error) {
      return handleOrderError(
        'TableOperationService.transferTable',
        error,
        'Masa taşıma işlemi başarısız.'
      )
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

          return formatOrder(updatedOrder as OrderWithRelations) as Order
        },
        { timeout: SYSTEM_CONFIG.MERGE_TIMEOUT_MS }
      )

      await logService.createLog(
        'MERGE_TABLES',
        result.table?.name,
        `Adisyonlar birleştirildi (Toplam: ${formatCurrency(result.totalAmount)})`
      )
      return { success: true, data: result }
    } catch (error) {
      return handleOrderError(
        'TableOperationService.mergeTables',
        error,
        'Adisyonlar birleştirilemedi.'
      )
    }
  }
}
