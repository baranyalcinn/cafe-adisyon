import { tableSchemas } from '../../../shared/ipc-schemas'
import { IPC_CHANNELS } from '../../../shared/types'
import { prisma } from '../../db/prisma'
import { createRawHandler, createSimpleRawHandler } from '../utils/ipcWrapper'

// ============================================================================
// Pure Helpers
// ============================================================================

/**
 * Masaları isme göre "Doğal Sıralama" ile sıralar.
 * Normal ASCII sıralamasında "Masa 10", "Masa 2"den önce gelir.
 * numeric: true sayesinde "Masa 2", "Masa 10"dan önce gelir.
 */
const sortTablesNaturally = <T extends { name: string }>(tables: T[]): T[] => {
  return tables.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  )
}

// ============================================================================
// Handlers
// ============================================================================

export function registerTableHandlers(): void {
  // 1. GET ALL
  createSimpleRawHandler(
    IPC_CHANNELS.TABLES_GET_ALL,
    async () => {
      const tables = await prisma.table.findMany()
      return sortTablesNaturally(tables)
    },
    'Masalar getirilirken hata oluştu.'
  )

  // 2. GET WITH STATUS
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

      // Açık siparişi olan masaların kilit durumlarını Map'e al (O(1) erişim hızı için)
      const openOrderMap = new Map(
        openOrders.filter((o) => o.tableId).map((o) => [o.tableId as string, o.isLocked])
      )

      const sortedTables = sortTablesNaturally(tables)

      return sortedTables.map((table) => {
        const isLocked = openOrderMap.get(table.id)
        return {
          ...table,
          hasOpenOrder: isLocked !== undefined,
          isLocked: isLocked ?? false,
          orders: undefined // Prisma'nın fazladan include verisini frontend'e sızdırmasını önler
        }
      })
    },
    'Masa durumları getirilirken hata oluştu.'
  )

  // 3. CREATE
  createRawHandler(
    IPC_CHANNELS.TABLES_CREATE,
    tableSchemas.create,
    // Veritabanı işlemi doğrudan return edilebilir (async/await yazım kirliliğinden kurtulur)
    (data) => prisma.table.create({ data: { name: data.name } }),
    'Masa oluşturulamadı. Bu isimde masa zaten mevcut olabilir.'
  )

  // 4. DELETE
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
          // Alt ilişkileri paralel silerek SQLite I/O performansını artır
          await Promise.all([
            tx.transaction.deleteMany({ where: { orderId: { in: orderIds } } }),
            tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })
          ])

          // Bağımlılıklar silindikten sonra ana kayıtları sil
          await tx.order.deleteMany({ where: { id: { in: orderIds } } })
        }

        // En son masanın kendisini sil
        await tx.table.delete({ where: { id: data.id } })
      })

      return null
    },
    'Masa silinemedi. Lütfen önce masadaki işlemleri kontrol edin.'
  )

  // 5. TRANSFER
  createRawHandler(
    IPC_CHANNELS.TABLES_TRANSFER,
    tableSchemas.transfer,
    async (data) => {
      const { sourceId, targetId } = data
      const order = await prisma.order.findFirst({
        where: { tableId: sourceId, status: 'OPEN' }
      })
      if (!order) throw new Error('Kaynak masada açık adisyon bulunamadı.')
      const { orderService } = await import('../../services/OrderService')
      return orderService.transferTable(order.id, targetId)
    },
    'Masa aktarma işlemi başarısız.'
  )

  // 6. MERGE
  createRawHandler(
    IPC_CHANNELS.TABLES_MERGE,
    tableSchemas.merge,
    async (data) => {
      const { sourceId, targetId } = data
      const [sourceOrder, targetOrder] = await Promise.all([
        prisma.order.findFirst({ where: { tableId: sourceId, status: 'OPEN' } }),
        prisma.order.findFirst({ where: { tableId: targetId, status: 'OPEN' } })
      ])

      if (!sourceOrder) throw new Error('Kaynak masada açık adisyon bulunamadı.')
      if (!targetOrder) throw new Error('Hedef masada açık adisyon bulunamadı.')

      const { orderService } = await import('../../services/OrderService')
      return orderService.mergeTables(sourceOrder.id, targetOrder.id)
    },
    'Masa birleştirme işlemi başarısız.'
  )
}
