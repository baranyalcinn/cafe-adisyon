import { ipcMain } from 'electron'
import { prisma, dbWrite } from '../../db/prisma'
import { logger } from '../../lib/logger'
import { IPC_CHANNELS } from '../../../shared/types'
import { tableSchemas, validateInput } from '../../../shared/ipc-schemas'

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
      const table = await dbWrite(() =>
        prisma.table.create({
          data: { name: validation.data.name }
        })
      )
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
      await dbWrite(() =>
        prisma.$transaction(async (tx) => {
          const orders = await tx.order.findMany({ where: { tableId: validation.data.id } })
          for (const order of orders) {
            await tx.transaction.deleteMany({ where: { orderId: order.id } })
            await tx.orderItem.deleteMany({ where: { orderId: order.id } })
          }
          await tx.order.deleteMany({ where: { tableId: validation.data.id } })
          await tx.table.delete({ where: { id: validation.data.id } })
        })
      )

      return { success: true, data: null }
    } catch (error) {
      logger.error('Tables Delete', error)
      return { success: false, error: 'Masa silinemedi.' }
    }
  })
}
