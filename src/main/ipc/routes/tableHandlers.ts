import { ipcMain } from 'electron'
import { tableSchemas, validateInput } from '../../../shared/ipc-schemas'
import { IPC_CHANNELS } from '../../../shared/types'
import { prisma } from '../../db/prisma'
import { logger } from '../../lib/logger'

export function registerTableHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.TABLES_GET_ALL, async () => {
    try {
      const tables = await prisma.table.findMany()
      tables.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      )
      return { success: true, data: tables }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.TABLES_GET_WITH_STATUS, async () => {
    try {
      const tables = await prisma.table.findMany({
        include: {
          orders: {
            where: { status: 'OPEN' },
            take: 1
          }
        }
      })

      // Natural sort by name (Masa 1, Masa 2, Masa 10...)
      tables.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      )

      const tablesWithStatus = tables.map((table) => ({
        ...table,
        hasOpenOrder: table.orders.length > 0,
        isLocked: table.orders.length > 0 ? table.orders[0].isLocked : false,
        orders: undefined
      }))

      return { success: true, data: tablesWithStatus }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.TABLES_CREATE, async (_event, name: string) => {
    // Validate input
    const validation = validateInput(tableSchemas.create, { name })
    if (!validation.success) {
      return { success: false, error: validation.error }
    }

    try {
      const table = await prisma.table.create({
        data: { name: validation.data.name }
      })
      return { success: true, data: table }
    } catch (error) {
      logger.error('Tables Create', error)
      return { success: false, error: 'Masa oluşturulamadı. Bu isimde masa zaten var olabilir.' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.TABLES_DELETE, async (_event, id: string) => {
    const validation = validateInput(tableSchemas.delete, { id })
    if (!validation.success) {
      return { success: false, error: validation.error }
    }

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Get all orders for this table to find their IDs
        const orders = await tx.order.findMany({
          where: { tableId: validation.data.id },
          select: { id: true }
        })

        const orderIds = orders.map((o) => o.id)

        if (orderIds.length > 0) {
          // 2. Batch delete transactions for these orders
          await tx.transaction.deleteMany({
            where: { orderId: { in: orderIds } }
          })

          // 3. Batch delete order items for these orders
          await tx.orderItem.deleteMany({
            where: { orderId: { in: orderIds } }
          })

          // 4. Batch delete the orders themselves
          await tx.order.deleteMany({
            where: { id: { in: orderIds } }
          })
        }

        // 5. Finally, delete the table
        await tx.table.delete({ where: { id: validation.data.id } })
      })

      return { success: true, data: null }
    } catch (error) {
      logger.error('Tables Delete', error)
      return { success: false, error: 'Masa silinemedi.' }
    }
  })
}
