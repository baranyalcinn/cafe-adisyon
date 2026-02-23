import { tableSchemas } from '../../../shared/ipc-schemas'
import { IPC_CHANNELS } from '../../../shared/types'
import { prisma } from '../../db/prisma'
import { createRawHandler, createSimpleRawHandler } from '../utils/ipcWrapper'

export function registerTableHandlers(): void {
  // GET ALL
  createSimpleRawHandler(
    IPC_CHANNELS.TABLES_GET_ALL,
    async () => {
      const tables = await prisma.table.findMany()
      tables.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      )
      return tables
    },
    'Masalar getirilirken hata oluştu'
  )

  // GET WITH STATUS
  createSimpleRawHandler(
    IPC_CHANNELS.TABLES_GET_WITH_STATUS,
    async () => {
      const [tables, openOrders] = await Promise.all([
        prisma.table.findMany(),
        prisma.order.findMany({
          where: { status: 'OPEN' },
          select: { tableId: true, isLocked: true }
        })
      ])

      const openOrderMap = new Map<string, boolean>()
      for (const order of openOrders) {
        if (order.tableId) {
          openOrderMap.set(order.tableId, order.isLocked)
        }
      }

      tables.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      )

      return tables.map((table) => {
        const hasOpen = openOrderMap.has(table.id)
        return {
          ...table,
          hasOpenOrder: hasOpen,
          isLocked: hasOpen ? openOrderMap.get(table.id) || false : false,
          orders: undefined
        }
      })
    },
    'Masa durumları getirilirken hata oluştu'
  )

  // CREATE
  createRawHandler(
    IPC_CHANNELS.TABLES_CREATE,
    tableSchemas.create,
    async (data) => {
      return await prisma.table.create({
        data: { name: data.name }
      })
    },
    'Masa oluşturulamadı. Bu isimde masa zaten var olabilir.'
  )

  // DELETE
  createRawHandler(
    IPC_CHANNELS.TABLES_DELETE,
    tableSchemas.delete,
    async (data) => {
      await prisma.$transaction(async (tx) => {
        const orders = await tx.order.findMany({
          where: { tableId: data.id },
          select: { id: true }
        })

        const orderIds = orders.map((o) => o.id)

        if (orderIds.length > 0) {
          await tx.transaction.deleteMany({
            where: { orderId: { in: orderIds } }
          })
          await tx.orderItem.deleteMany({
            where: { orderId: { in: orderIds } }
          })
          await tx.order.deleteMany({
            where: { id: { in: orderIds } }
          })
        }

        await tx.table.delete({ where: { id: data.id } })
      })
      return null
    },
    'Masa silinemedi.'
  )
}
