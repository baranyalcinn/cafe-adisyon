import { ipcMain, app } from 'electron'
import { prisma, dbPath, dbWrite } from '../db/prisma'
import { logger } from '../lib/logger'
import * as fs from 'fs'
import * as path from 'path'
import { IPC_CHANNELS } from '../../shared/types'
import type { OrderStatus, PaymentMethod } from '../../shared/types'
import {
  tableSchemas,
  categorySchemas,
  productSchemas,
  orderSchemas,
  paymentSchemas,
  expenseSchemas,
  validateInput
} from '../lib/validation'

// Simple log queue to prevent database connection saturation
const logQueue: Array<{ action: string; tableName?: string; details?: string }> = []
let isLogProcessing = false

async function processLogQueue(): Promise<void> {
  if (isLogProcessing || logQueue.length === 0) return
  isLogProcessing = true

  while (logQueue.length > 0) {
    const entry = logQueue.shift()
    if (!entry) continue
    try {
      await prisma.activityLog.create({
        data: {
          action: entry.action,
          tableName: entry.tableName,
          details: entry.details
        }
      })
    } catch (error) {
      logger.error('Activity Log', error)
    }
  }

  isLogProcessing = false
}

// Optimized fire-and-forget activity logging
export function logActivity(action: string, tableName?: string, details?: string): void {
  logQueue.push({ action, tableName, details })
  processLogQueue().catch((err) => logger.error('Process Log Queue', err))
}

// Simple in-memory cache for categories and products
interface CacheEntry<T> {
  data: T
  timestamp: number
}

const cache = {
  categories: null as CacheEntry<unknown[]> | null,
  products: null as CacheEntry<unknown[]> | null,
  TTL: 60000 // 1 minute cache
}

function getCached<T>(key: 'categories' | 'products'): T[] | null {
  const entry = cache[key]
  if (!entry) return null
  if (Date.now() - entry.timestamp > cache.TTL) {
    cache[key] = null
    return null
  }
  return entry.data as T[]
}

function setCache<T>(key: 'categories' | 'products', data: T[]): void {
  cache[key] = { data, timestamp: Date.now() }
}

function invalidateCache(key: 'categories' | 'products'): void {
  cache[key] = null
}

// ==================== REPORT HELPERS ====================

async function updateMonthlyReport(date: Date): Promise<void> {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1)

  try {
    // Aggregate DailySummaries for revenue and orders
    const summaries = await prisma.dailySummary.findMany({
      where: { date: { gte: startOfMonth, lt: nextMonth } }
    })

    const totalRevenue = summaries.reduce((sum, s) => sum + s.totalRevenue, 0)
    const orderCount = summaries.reduce((sum, s) => sum + s.orderCount, 0)

    // Aggregate Expenses for the month
    const expenses = await prisma.expense.findMany({
      where: { createdAt: { gte: startOfMonth, lt: nextMonth } }
    })
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

    const netProfit = totalRevenue - totalExpenses

    await prisma.monthlyReport.upsert({
      where: { monthDate: startOfMonth },
      create: {
        monthDate: startOfMonth,
        totalRevenue,
        totalExpenses,
        netProfit,
        orderCount
      },
      update: {
        totalRevenue,
        totalExpenses,
        netProfit,
        orderCount
      }
    })
  } catch (error) {
    logger.error('Update Monthly Report', error)
  }
}

async function cleanupOldReports(): Promise<void> {
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  oneYearAgo.setHours(0, 0, 0, 0)

  try {
    const deleted = await prisma.monthlyReport.deleteMany({
      where: { monthDate: { lt: oneYearAgo } }
    })
    if (deleted.count > 0) {
      logActivity('CLEANUP_OLD_DATA', undefined, `${deleted.count} eski aylık rapor silindi.`)
    }
  } catch (error) {
    logger.error('Cleanup Old Reports', error)
  }
}

// Run cleanup on startup
setTimeout(() => {
  cleanupOldReports().catch(console.error)
}, 5000)

export function registerIpcHandlers(): void {
  // ==================== TABLES ====================
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

  // ==================== CATEGORIES ====================
  ipcMain.handle(IPC_CHANNELS.CATEGORIES_GET_ALL, async () => {
    try {
      // Check cache first
      const cached = getCached<{ id: string; name: string; icon: string }>('categories')
      if (cached) {
        return { success: true, data: cached }
      }

      const categories = await prisma.category.findMany()
      categories.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      )
      setCache('categories', categories)
      return { success: true, data: categories }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CATEGORIES_CREATE, async (_event, name: string) => {
    const validation = validateInput(categorySchemas.create, { name })
    if (!validation.success) {
      return { success: false, error: validation.error }
    }

    try {
      const category = await dbWrite(() =>
        prisma.category.create({
          data: { name: validation.data.name }
        })
      )
      invalidateCache('categories')
      return { success: true, data: category }
    } catch (error) {
      logger.error('Categories Create', error)
      return { success: false, error: 'Kategori oluşturulamadı.' }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.CATEGORIES_UPDATE,
    async (_event, id: string, data: { name?: string; icon?: string }) => {
      const validation = validateInput(categorySchemas.update, { id, data })
      if (!validation.success) {
        return { success: false, error: validation.error }
      }

      try {
        const category = await prisma.category.update({
          where: { id },
          data: { ...(data.name && { name: data.name }), ...(data.icon && { icon: data.icon }) }
        })
        return { success: true, data: category }
      } catch (error) {
        logger.error('Categories Update', error)
        return { success: false, error: 'Kategori güncellenemedi.' }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.CATEGORIES_DELETE, async (_event, id: string) => {
    const validation = validateInput(categorySchemas.delete, { id })
    if (!validation.success) {
      return { success: false, error: validation.error }
    }

    try {
      // Use transaction to delete related products first
      await prisma.$transaction(async (tx) => {
        await tx.product.deleteMany({ where: { categoryId: id } })
        await tx.category.delete({ where: { id } })
      })
      invalidateCache('categories')
      invalidateCache('products') // Also invalidate products since we deleted some
      return { success: true, data: null }
    } catch (error) {
      logger.error('Categories Delete', error)
      return { success: false, error: 'Kategori silinemedi.' }
    }
  })

  // ==================== PRODUCTS ====================
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_GET_ALL, async () => {
    try {
      // Check cache first
      const cached = getCached<unknown>('products')
      if (cached) {
        return { success: true, data: cached }
      }

      const products = await prisma.product.findMany({
        include: { category: true }
      })
      products.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      )
      setCache('products', products)
      return { success: true, data: products }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.PRODUCTS_GET_BY_CATEGORY, async (_event, categoryId: string) => {
    try {
      const products = await prisma.product.findMany({
        where: { categoryId },
        include: { category: true }
      })
      products.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      )
      return { success: true, data: products }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.PRODUCTS_GET_FAVORITES, async () => {
    try {
      const products = await prisma.product.findMany({
        where: { isFavorite: true },
        include: { category: true },
        orderBy: { name: 'asc' }
      })
      return { success: true, data: products }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.PRODUCTS_SEARCH, async (_event, query: string) => {
    try {
      const products = await prisma.product.findMany({
        where: {
          name: { contains: query }
        },
        include: { category: true },
        orderBy: { name: 'asc' }
      })
      return { success: true, data: products }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.PRODUCTS_CREATE,
    async (
      _event,
      data: { name: string; price: number; categoryId: string; isFavorite: boolean }
    ) => {
      const validation = validateInput(productSchemas.create, data)
      if (!validation.success) {
        return { success: false, error: validation.error }
      }

      try {
        const product = await prisma.product.create({
          data: validation.data,
          include: { category: true }
        })
        invalidateCache('products')
        return { success: true, data: product }
      } catch (error) {
        logger.error('Products Create', error)
        return { success: false, error: 'Ürün oluşturulamadı.' }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PRODUCTS_UPDATE,
    async (_event, id: string, data: { name?: string; price?: number; isFavorite?: boolean }) => {
      const validation = validateInput(productSchemas.update, { id, data })
      if (!validation.success) {
        return { success: false, error: validation.error }
      }

      try {
        const product = await dbWrite(() =>
          prisma.product.update({
            where: { id: validation.data.id },
            data: validation.data.data,
            include: { category: true }
          })
        )
        invalidateCache('products')
        return { success: true, data: product }
      } catch (error) {
        logger.error('Products Update', error)
        return { success: false, error: 'Ürün güncellenemedi.' }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.PRODUCTS_DELETE, async (_event, id: string) => {
    const validation = validateInput(productSchemas.delete, { id })
    if (!validation.success) {
      return { success: false, error: validation.error }
    }

    try {
      await dbWrite(() => prisma.product.delete({ where: { id: validation.data.id } }))
      invalidateCache('products')
      return { success: true, data: null }
    } catch (error) {
      logger.error('Products Delete', error)
      return { success: false, error: 'Ürün silinemedi.' }
    }
  })

  // ==================== ORDERS ====================
  ipcMain.handle(IPC_CHANNELS.ORDERS_GET_BY_TABLE, async (_event, tableId: string) => {
    try {
      const orders = await prisma.order.findMany({
        where: { tableId },
        include: {
          items: { include: { product: true } },
          payments: true
        },
        orderBy: { createdAt: 'desc' }
      })
      return { success: true, data: orders }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.ORDERS_GET_OPEN_BY_TABLE, async (_event, tableId: string) => {
    try {
      const order = await prisma.order.findFirst({
        where: { tableId, status: 'OPEN' },
        include: {
          items: { include: { product: true } },
          payments: true
        }
      })
      return { success: true, data: order }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.ORDERS_CREATE, async (_event, tableId: string) => {
    const validation = validateInput(orderSchemas.create, { tableId })
    if (!validation.success) {
      return { success: false, error: validation.error }
    }

    try {
      const order = await dbWrite(() =>
        prisma.order.create({
          data: { tableId: validation.data.tableId, status: 'OPEN', totalAmount: 0 },
          include: {
            items: { include: { product: true } },
            payments: true
          }
        })
      )

      return { success: true, data: order }
    } catch (error) {
      logger.error('Orders Create', error)
      return { success: false, error: 'Sipariş oluşturulamadı.' }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.ORDERS_UPDATE,
    async (_event, orderId: string, data: { status?: OrderStatus; totalAmount?: number }) => {
      const validation = validateInput(orderSchemas.update, { orderId, data })
      if (!validation.success) {
        return { success: false, error: validation.error }
      }

      try {
        const order = await dbWrite(() =>
          prisma.order.update({
            where: { id: validation.data.orderId },
            data: validation.data.data,
            include: {
              items: { include: { product: true } },
              payments: true
            }
          })
        )
        return { success: true, data: order }
      } catch (error) {
        logger.error('Orders Update', error)
        return { success: false, error: 'Sipariş güncellenemedi.' }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.ORDERS_ADD_ITEM,
    async (_event, orderId: string, productId: string, quantity: number, unitPrice: number) => {
      const validation = validateInput(orderSchemas.addItem, {
        orderId,
        productId,
        quantity,
        unitPrice
      })
      if (!validation.success) {
        return { success: false, error: validation.error }
      }

      try {
        // Check if existing UNPAID item exists
        const existingItem = await prisma.orderItem.findFirst({
          where: {
            orderId,
            productId,
            isPaid: false
          }
        })

        if (existingItem) {
          // Update quantity of existing unpaid item
          await prisma.orderItem.update({
            where: { id: existingItem.id },
            data: { quantity: existingItem.quantity + quantity }
          })
        } else {
          // Create new item
          await prisma.orderItem.create({
            data: { orderId, productId, quantity, unitPrice }
          })
        }

        // Recalculate total
        const items = await prisma.orderItem.findMany({ where: { orderId } })
        const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

        const order = await prisma.order.update({
          where: { id: orderId },
          data: { totalAmount },
          include: {
            items: { include: { product: true } },
            payments: true
          }
        })

        return { success: true, data: order }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.ORDERS_UPDATE_ITEM,
    async (_event, orderItemId: string, quantity: number) => {
      const validation = validateInput(orderSchemas.updateItem, { orderItemId, quantity })
      if (!validation.success) {
        return { success: false, error: validation.error }
      }

      try {
        const order = await prisma.$transaction(async (tx) => {
          const orderItem = await tx.orderItem.update({
            where: { id: orderItemId },
            data: { quantity }
          })

          // Recalculate total
          const items = await tx.orderItem.findMany({ where: { orderId: orderItem.orderId } })
          const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

          return await tx.order.update({
            where: { id: orderItem.orderId },
            data: { totalAmount },
            include: {
              items: { include: { product: true } },
              payments: true
            }
          })
        })

        return { success: true, data: order }
      } catch (error) {
        logger.error('Orders Update Item', error)
        return { success: false, error: 'Sipariş ürünü güncellenemedi.' }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.ORDERS_REMOVE_ITEM, async (_event, orderItemId: string) => {
    const validation = validateInput(orderSchemas.removeItem, { orderItemId })
    if (!validation.success) {
      return { success: false, error: validation.error }
    }

    try {
      // Get item details before delete for logging
      const itemToRemove = await prisma.orderItem.findUnique({
        where: { id: orderItemId },
        include: { product: true, order: { include: { table: true } } }
      })

      const order = await prisma.$transaction(async (tx) => {
        const orderItem = await tx.orderItem.delete({
          where: { id: orderItemId }
        })

        // Recalculate total
        const items = await tx.orderItem.findMany({ where: { orderId: orderItem.orderId } })
        const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

        return await tx.order.update({
          where: { id: orderItem.orderId },
          data: { totalAmount },
          include: {
            items: { include: { product: true } },
            payments: true
          }
        })
      })

      // Log activity
      if (itemToRemove) {
        await prisma.activityLog.create({
          data: {
            action: 'REMOVE_ITEM',
            tableName: itemToRemove.order?.table?.name,
            details: `${itemToRemove.quantity}x ${itemToRemove.product?.name || 'Ürün'} çıkarıldı`
          }
        })
      }

      return { success: true, data: order }
    } catch (error) {
      logger.error('Orders Remove Item', error)
      return { success: false, error: 'Sipariş ürünü silinemedi.' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.ORDERS_DELETE, async (_event, orderId: string) => {
    try {
      await prisma.$transaction(async (tx) => {
        // First delete all payments and items
        await tx.transaction.deleteMany({ where: { orderId } })
        await tx.orderItem.deleteMany({ where: { orderId } })

        // Then delete the order
        await tx.order.delete({ where: { id: orderId } })
      })

      return { success: true, data: null }
    } catch (error) {
      logger.error('Orders Delete', error)
      return { success: false, error: 'Sipariş silinemedi.' }
    }
  })

  // Transfer order to another table (only if target has no open order)
  ipcMain.handle(
    IPC_CHANNELS.ORDERS_TRANSFER,
    async (_event, orderId: string, targetTableId: string) => {
      const validation = validateInput(orderSchemas.transfer, { orderId, targetTableId })
      if (!validation.success) {
        return { success: false, error: validation.error }
      }

      try {
        // Get source table name for logging
        const sourceOrder = await prisma.order.findUnique({
          where: { id: orderId },
          include: { table: true }
        })
        const targetTable = await prisma.table.findUnique({ where: { id: targetTableId } })

        const result = await prisma.$transaction(async (tx) => {
          // Check if target table has an open order
          const existingOrder = await tx.order.findFirst({
            where: { tableId: targetTableId, status: 'OPEN' }
          })

          if (existingOrder) {
            throw new Error('Hedef masada açık sipariş var. Birleştirme işlemi kullanın.')
          }

          // Transfer the order
          return await tx.order.update({
            where: { id: orderId },
            data: { tableId: targetTableId },
            include: {
              items: { include: { product: true } },
              payments: true
            }
          })
        })

        // Log activity
        await prisma.activityLog.create({
          data: {
            action: 'MOVE_TABLE',
            tableName: targetTable?.name,
            details: `${sourceOrder?.table?.name || 'Masa'} → ${targetTable?.name} taşındı`
          }
        })

        return { success: true, data: result }
      } catch (error) {
        logger.error('Orders Transfer', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Sipariş aktarılamadı.'
        }
      }
    }
  )

  // Merge two orders (move all items from source to target, delete source)
  ipcMain.handle(
    IPC_CHANNELS.ORDERS_MERGE,
    async (_event, sourceOrderId: string, targetOrderId: string) => {
      const validation = validateInput(orderSchemas.merge, { sourceOrderId, targetOrderId })
      if (!validation.success) {
        return { success: false, error: validation.error }
      }

      try {
        const sourceOrder = await prisma.order.findUnique({
          where: { id: sourceOrderId },
          include: { table: true, items: true }
        })
        const targetOrder = await prisma.order.findUnique({
          where: { id: targetOrderId },
          include: { table: true }
        })

        const result = await prisma.$transaction(async (tx) => {
          // 1. Move all payments from source to target
          await tx.transaction.updateMany({
            where: { orderId: sourceOrderId },
            data: { orderId: targetOrderId }
          })

          // 2. Get source items
          const sourceItems = await tx.orderItem.findMany({
            where: { orderId: sourceOrderId }
          })

          // 3. Process items independently (respecting isPaid status)
          for (const item of sourceItems) {
            const existing = await tx.orderItem.findFirst({
              where: {
                orderId: targetOrderId,
                productId: item.productId,
                isPaid: item.isPaid,
                unitPrice: item.unitPrice
              }
            })

            if (existing) {
              await tx.orderItem.update({
                where: { id: existing.id },
                data: { quantity: existing.quantity + item.quantity }
              })
              await tx.orderItem.delete({ where: { id: item.id } })
            } else {
              await tx.orderItem.update({
                where: { id: item.id },
                data: { orderId: targetOrderId }
              })
            }
          }

          // 4. Recalculate target order total
          const allTargetItems = await tx.orderItem.findMany({
            where: { orderId: targetOrderId }
          })
          const totalAmount = allTargetItems.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
          )

          await tx.order.update({
            where: { id: targetOrderId },
            data: { totalAmount }
          })

          // 5. Delete source order (now empty)
          await tx.order.delete({ where: { id: sourceOrderId } })

          return await tx.order.findUnique({
            where: { id: targetOrderId },
            include: {
              items: { include: { product: true } },
              payments: true
            }
          })
        })

        // Log activity
        await prisma.activityLog.create({
          data: {
            action: 'MERGE_TABLE',
            tableName: targetOrder?.table?.name,
            details: `${sourceOrder?.table?.name} + ${targetOrder?.table?.name} birleşti (${sourceOrder?.items?.length || 0} ürün)`
          }
        })

        return { success: true, data: result }
      } catch (error) {
        logger.error('Orders Merge', error)
        return { success: false, error: 'Siparişler birleştirilemedi.' }
      }
    }
  )

  // Mark specific items as paid (for split payments)
  ipcMain.handle(
    IPC_CHANNELS.ORDERS_MARK_ITEMS_PAID,
    async (_event, itemsToPay: { id: string; quantity: number }[]) => {
      try {
        const result = await prisma.$transaction(async (tx) => {
          let orderId = ''

          for (const payItem of itemsToPay) {
            // Get the current item (unpaid)
            const currentItem = await tx.orderItem.findUnique({
              where: { id: payItem.id }
            })

            if (!currentItem) continue
            orderId = currentItem.orderId

            // If paying full quantity
            if (payItem.quantity >= currentItem.quantity) {
              // Check if there's already a PAID item for this product
              const existingPaidItem = await tx.orderItem.findFirst({
                where: {
                  orderId: currentItem.orderId,
                  productId: currentItem.productId,
                  isPaid: true
                }
              })

              if (existingPaidItem) {
                // Merge into existing paid item
                await tx.orderItem.update({
                  where: { id: existingPaidItem.id },
                  data: { quantity: existingPaidItem.quantity + currentItem.quantity }
                })
                // Delete the original unpaid item
                await tx.orderItem.delete({ where: { id: currentItem.id } })
              } else {
                // Just mark current item as paid
                await tx.orderItem.update({
                  where: { id: currentItem.id },
                  data: { isPaid: true }
                })
              }
            } else {
              // Partial payment (Split)
              // 1. Decrement current (unpaid) item
              await tx.orderItem.update({
                where: { id: currentItem.id },
                data: { quantity: currentItem.quantity - payItem.quantity }
              })

              // 2. Add to paid item
              const existingPaidItem = await tx.orderItem.findFirst({
                where: {
                  orderId: currentItem.orderId,
                  productId: currentItem.productId,
                  isPaid: true
                }
              })

              if (existingPaidItem) {
                await tx.orderItem.update({
                  where: { id: existingPaidItem.id },
                  data: { quantity: existingPaidItem.quantity + payItem.quantity }
                })
              } else {
                await tx.orderItem.create({
                  data: {
                    orderId: currentItem.orderId,
                    productId: currentItem.productId,
                    quantity: payItem.quantity,
                    unitPrice: currentItem.unitPrice,
                    isPaid: true
                  }
                })
              }
            }
          }

          // Return updated order
          if (!orderId) {
            // If itemsToPay was empty or invalid, try to find from first valid item if possible,
            // but here we might just return null or let it fail gracefully if no orderId found.
            // Usually itemsToPay has at least one valid item.
            return null
          }

          return await tx.order.findUnique({
            where: { id: orderId },
            include: {
              items: { include: { product: true } },
              payments: true
            }
          })
        })

        if (!result) return { success: false, error: 'İşlem tamamlanamadı.' }
        return { success: true, data: result }
      } catch (error) {
        logger.error('Orders Mark Items Paid', error)
        return { success: false, error: 'Ürünler ödenmiş olarak işaretlenemedi.' }
      }
    }
  )

  // ==================== PAYMENTS ====================
  ipcMain.handle(
    IPC_CHANNELS.PAYMENTS_CREATE,
    async (_event, orderId: string, amount: number, paymentMethod: PaymentMethod) => {
      const validation = validateInput(paymentSchemas.create, { orderId, amount, paymentMethod })
      if (!validation.success) {
        return { success: false, error: validation.error }
      }

      try {
        const payment = await prisma.transaction.create({
          data: { orderId, amount, paymentMethod }
        })

        // Check if order is fully paid
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { payments: true, table: true, items: { include: { product: true } } }
        })

        let orderClosed = false
        if (order) {
          const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0)
          if (totalPaid >= order.totalAmount) {
            await prisma.order.update({
              where: { id: orderId },
              data: { status: 'CLOSED' }
            })
            orderClosed = true
          }
        }

        // Log activity - CLOSE_ORDER summary when order is fully paid
        if (orderClosed && order) {
          const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0)
          const productNames = order.items
            .map((i) => i.product.name)
            .slice(0, 3)
            .join(', ')
          const moreItems = order.items.length > 3 ? ` +${order.items.length - 3}` : ''
          await prisma.activityLog.create({
            data: {
              action: 'CLOSE_ORDER',
              tableName: order.table?.name,
              details: `${itemCount} ürün (${productNames}${moreItems}) - ₺${(order.totalAmount / 100).toFixed(2)} ${paymentMethod === 'CASH' ? 'nakit' : 'kart'}`
            }
          })
        } else {
          // Partial payment log
          await prisma.activityLog.create({
            data: {
              action: paymentMethod === 'CASH' ? 'PAYMENT_CASH' : 'PAYMENT_CARD',
              tableName: order?.table?.name,
              details: `₺${(amount / 100).toFixed(2)} ${paymentMethod === 'CASH' ? 'nakit' : 'kart'} ödeme alındı`
            }
          })
        }

        const updatedOrder = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            items: { include: { product: true } },
            payments: true
          }
        })

        return { success: true, data: { payment, order: updatedOrder } }
      } catch (error) {
        logger.error('Payments Create', error)
        return { success: false, error: 'Ödeme işlenemedi.' }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.PAYMENTS_GET_BY_ORDER, async (_event, orderId: string) => {
    try {
      const payments = await prisma.transaction.findMany({
        where: { orderId },
        orderBy: { createdAt: 'asc' }
      })
      return { success: true, data: payments }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // ==================== DASHBOARD ====================
  ipcMain.handle(IPC_CHANNELS.DASHBOARD_GET_STATS, async () => {
    try {
      const now = new Date()
      const currentHour = now.getHours()

      // Smart Dating: If before 05:00 AM, assume it belongs to the previous day (Shift logic)
      const today = new Date(now)
      if (currentHour < 5) {
        today.setDate(today.getDate() - 1)
      }
      today.setHours(0, 0, 0, 0)

      // Get today's closed orders
      const todayOrders = await prisma.order.findMany({
        where: {
          status: 'CLOSED',
          createdAt: { gte: today }
        },
        include: { payments: true }
      })

      const dailyRevenue = todayOrders.reduce((sum, order) => sum + order.totalAmount, 0)

      // Payment method breakdown
      const allPayments = todayOrders.flatMap((o) => o.payments)
      const paymentMethodBreakdown = {
        cash: allPayments
          .filter((p) => p.paymentMethod === 'CASH')
          .reduce((sum, p) => sum + p.amount, 0),
        card: allPayments
          .filter((p) => p.paymentMethod === 'CARD')
          .reduce((sum, p) => sum + p.amount, 0)
      }

      // Top products
      const todayItems = await prisma.orderItem.findMany({
        where: {
          order: {
            status: 'CLOSED',
            createdAt: { gte: today }
          }
        },
        include: { product: true }
      })

      const productCounts = new Map<string, { name: string; quantity: number }>()
      todayItems.forEach((item) => {
        const existing = productCounts.get(item.productId)
        if (existing) {
          existing.quantity += item.quantity
        } else {
          productCounts.set(item.productId, {
            name: item.product.name,
            quantity: item.quantity
          })
        }
      })

      const topProducts = Array.from(productCounts.entries())
        .map(([productId, data]) => ({
          productId,
          productName: data.name,
          quantity: data.quantity
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

      return {
        success: true,
        data: {
          dailyRevenue,
          totalOrders: todayOrders.length,
          paymentMethodBreakdown,
          topProducts
        }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // ==================== SEED ====================
  ipcMain.handle(IPC_CHANNELS.SEED_DATABASE, async () => {
    try {
      // Clean up existing data first (respecting foreign key constraints)
      await prisma.transaction.deleteMany({})
      await prisma.orderItem.deleteMany({})
      await prisma.order.deleteMany({})
      await prisma.product.deleteMany({})
      await prisma.category.deleteMany({})
      await prisma.table.deleteMany({})
      await prisma.activityLog.deleteMany({})

      // Create categories
      const categories = await Promise.all([
        prisma.category.create({
          data: { id: 'cat-sicak', name: 'Sıcak İçecekler', icon: 'coffee' }
        }),
        prisma.category.create({
          data: { id: 'cat-soguk', name: 'Soğuk İçecekler', icon: 'cup-soda' }
        }),
        prisma.category.create({
          data: { id: 'cat-yiyecek', name: 'Yiyecekler', icon: 'utensils' }
        }),
        prisma.category.create({ data: { id: 'cat-tatli', name: 'Tatlılar', icon: 'cake-slice' } })
      ])

      // Create products (Prices are in Kuruş/Cents)
      const products = [
        { name: 'Türk Kahvesi', price: 6000, categoryId: 'cat-sicak', isFavorite: true },
        { name: 'Double Türk Kahvesi', price: 8000, categoryId: 'cat-sicak', isFavorite: false },
        { name: 'Espresso', price: 5500, categoryId: 'cat-sicak', isFavorite: true },
        { name: 'Double Espresso', price: 7000, categoryId: 'cat-sicak', isFavorite: false },
        { name: 'Americano', price: 6500, categoryId: 'cat-sicak', isFavorite: false },
        { name: 'Latte', price: 7500, categoryId: 'cat-sicak', isFavorite: true },
        { name: 'Cappuccino', price: 7500, categoryId: 'cat-sicak', isFavorite: true },
        { name: 'Flat White', price: 7500, categoryId: 'cat-sicak', isFavorite: false },
        { name: 'Caramel Macchiato', price: 8500, categoryId: 'cat-sicak', isFavorite: false },
        { name: 'Filtre Kahve', price: 6000, categoryId: 'cat-sicak', isFavorite: false },
        { name: 'Çay', price: 2500, categoryId: 'cat-sicak', isFavorite: true },
        { name: 'Fincan Çay', price: 3500, categoryId: 'cat-sicak', isFavorite: false },
        {
          name: 'Bitki Çayı (Yeşil/Ihlamur)',
          price: 5000,
          categoryId: 'cat-sicak',
          isFavorite: false
        },
        { name: 'Sıcak Çikolata', price: 8000, categoryId: 'cat-sicak', isFavorite: false },
        { name: 'Salep', price: 8000, categoryId: 'cat-sicak', isFavorite: false },

        { name: 'Ice Latte', price: 8000, categoryId: 'cat-soguk', isFavorite: true },
        { name: 'Ice Americano', price: 7000, categoryId: 'cat-soguk', isFavorite: false },
        { name: 'Ice Caramel Macchiato', price: 9000, categoryId: 'cat-soguk', isFavorite: false },
        { name: 'House Frappe', price: 9500, categoryId: 'cat-soguk', isFavorite: true },
        {
          name: 'Milkshake (Çil/Muz/Özel)',
          price: 9500,
          categoryId: 'cat-soguk',
          isFavorite: false
        },
        { name: 'Ev Yapımı Limonata', price: 6000, categoryId: 'cat-soguk', isFavorite: true },
        { name: 'Churchill', price: 5000, categoryId: 'cat-soguk', isFavorite: false },
        { name: 'Taze Portakal Suyu', price: 8000, categoryId: 'cat-soguk', isFavorite: false },
        { name: 'Su (33cl)', price: 1500, categoryId: 'cat-soguk', isFavorite: false },
        { name: 'Soda', price: 2500, categoryId: 'cat-soguk', isFavorite: false },

        { name: 'Kaşarlı Tost', price: 8000, categoryId: 'cat-yiyecek', isFavorite: true },
        { name: 'Karışık Tost', price: 9500, categoryId: 'cat-yiyecek', isFavorite: true },
        { name: 'Soğuk Sandviç', price: 8500, categoryId: 'cat-yiyecek', isFavorite: false },
        { name: 'Patates Cips', price: 7000, categoryId: 'cat-yiyecek', isFavorite: true },
        { name: 'Sigara Böreği (6 lı)', price: 8000, categoryId: 'cat-yiyecek', isFavorite: false },

        {
          name: 'San Sebastian Cheesecake',
          price: 14000,
          categoryId: 'cat-tatli',
          isFavorite: true
        },
        { name: 'Limonlu Cheesecake', price: 13000, categoryId: 'cat-tatli', isFavorite: false },
        {
          name: 'Belçika Çikolatalı Brownie',
          price: 11000,
          categoryId: 'cat-tatli',
          isFavorite: true
        },
        { name: 'Çilekli Magnolia', price: 9000, categoryId: 'cat-tatli', isFavorite: false },
        { name: 'Tiramisu', price: 11000, categoryId: 'cat-tatli', isFavorite: true },
        { name: 'Waffle', price: 15000, categoryId: 'cat-tatli', isFavorite: false }
      ]

      for (const product of products) {
        await prisma.product.create({
          data: {
            id: `prod-${product.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            ...product
          }
        })
      }

      // Create tables
      for (let i = 1; i <= 12; i++) {
        await prisma.table.upsert({
          where: { id: `table-${i}` },
          update: {},
          create: { id: `table-${i}`, name: `Masa ${i}` }
        })
      }

      return {
        success: true,
        data: { categories: categories.length, products: products.length, tables: 12 }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })
  // ==================== SYSTEM ====================
  ipcMain.handle(IPC_CHANNELS.SYSTEM_CHECK, async () => {
    try {
      const tableCount = await prisma.table.count()

      return {
        success: true,
        data: {
          dbPath: process.env.DATABASE_URL || 'Derived from prisma client',
          connection: true,
          tableCount
        }
      }
    } catch (error) {
      logger.error('System Check Failed', error)
      return { success: false, error: String(error) }
    }
  })

  // ==================== ADMIN ====================
  ipcMain.handle(IPC_CHANNELS.ADMIN_VERIFY_PIN, async (_event, pin: string) => {
    try {
      let settings = await prisma.appSettings.findUnique({
        where: { id: 'app-settings' }
      })

      // Create default settings if not exists (Default: No PIN)
      if (!settings) {
        settings = await prisma.appSettings.create({
          data: { id: 'app-settings', adminPin: '' }
        })
      }

      // Check if PIN is set
      const isPinRequired = settings.adminPin !== ''

      // Auto-verify if no PIN is required and user sent empty pin
      if (!isPinRequired && (pin === '' || !pin)) {
        return { success: true, data: { valid: true, required: false } }
      }

      // Rescue Code: If 9999 is entered, clear PIN
      if (pin === '9999') {
        await prisma.appSettings.update({
          where: { id: 'app-settings' },
          data: { adminPin: '' }
        })
        logger.error('Admin Reset', 'PIN cleared via rescue code 9999')
        return { success: true, data: { valid: true, required: false, reset: true } }
      }

      const isValid = settings.adminPin === pin
      if (!isValid && isPinRequired) {
        logger.error(
          'Admin Verify Mismatch',
          `Failed PIN attempt. Entered: ${pin}, Stored: ${settings.adminPin.substring(0, 1)}...`
        )
      }

      return { success: true, data: { valid: isValid, required: isPinRequired } }
    } catch (error) {
      logger.error('Admin Verify PIN', error)
      return { success: false, error: 'PIN doğrulanamadı.' }
    }
  })

  // Helper to check if PIN is required without verifying
  ipcMain.handle(IPC_CHANNELS.ADMIN_CHECK_STATUS, async () => {
    try {
      const settings = await prisma.appSettings.findUnique({
        where: { id: 'app-settings' }
      })
      return { success: true, data: { required: settings ? settings.adminPin !== '' : false } }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.ADMIN_CHANGE_PIN,
    async (_event, currentPin: string, newPin: string) => {
      try {
        const settings = await prisma.appSettings.findUnique({
          where: { id: 'app-settings' }
        })

        if (!settings || settings.adminPin !== currentPin) {
          return { success: false, error: 'Mevcut PIN yanlış.' }
        }

        await prisma.appSettings.update({
          where: { id: 'app-settings' },
          data: { adminPin: newPin }
        })

        return { success: true, data: null }
      } catch (error) {
        logger.error('Admin Change PIN', error)
        return { success: false, error: 'PIN değiştirilemedi.' }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.ADMIN_SET_RECOVERY,
    async (_event, currentPin: string, question: string, answer: string) => {
      try {
        const settings = await prisma.appSettings.findUnique({
          where: { id: 'app-settings' }
        })

        if (!settings || settings.adminPin !== currentPin) {
          return { success: false, error: 'Mevcut PIN yanlış.' }
        }

        await prisma.appSettings.update({
          where: { id: 'app-settings' },
          data: {
            securityQuestion: question,
            securityAnswer: answer.toLowerCase().trim() // Normalize answer
          }
        })

        return { success: true, data: null }
      } catch (error) {
        logger.error('Admin Set Recovery', error)
        return { success: false, error: 'Güvenlik sorusu ayarlanamadı.' }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.ADMIN_GET_RECOVERY_QUESTION, async () => {
    try {
      const settings = await prisma.appSettings.findUnique({
        where: { id: 'app-settings' }
      })

      if (!settings?.securityQuestion) {
        return { success: true, data: null }
      }

      return { success: true, data: settings.securityQuestion }
    } catch (error) {
      logger.error('Admin Get Recovery', error)
      return { success: false, error: 'Güvenlik sorusu alınamadı.' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.ADMIN_RESET_PIN, async (_event, answer: string) => {
    try {
      const settings = await prisma.appSettings.findUnique({
        where: { id: 'app-settings' }
      })

      if (!settings?.securityAnswer) {
        return { success: false, error: 'Güvenlik sorusu ayarlanmamış.' }
      }

      if (settings.securityAnswer !== answer.toLowerCase().trim()) {
        return { success: false, error: 'Yanlış cevap.' }
      }

      // Reset PIN to default '1234'
      await prisma.appSettings.update({
        where: { id: 'app-settings' },
        data: { adminPin: '1234' }
      })

      return { success: true, data: null }
    } catch (error) {
      logger.error('Admin Reset PIN', error)
      return { success: false, error: 'PIN sıfırlanamadı.' }
    }
  })

  // ==================== EXTENDED DASHBOARD ====================
  ipcMain.handle(IPC_CHANNELS.DASHBOARD_GET_EXTENDED_STATS, async () => {
    try {
      const now = new Date()
      const currentHour = now.getHours()

      // Smart Dating: If before 05:00 AM, assume it belongs to the previous day (Shift logic)
      const today = new Date(now)
      if (currentHour < 5) {
        today.setDate(today.getDate() - 1)
      }
      today.setHours(0, 0, 0, 0)

      // Get today's closed orders
      const todayOrders = await prisma.order.findMany({
        where: {
          status: 'CLOSED',
          createdAt: { gte: today }
        },
        include: { payments: true }
      })

      const dailyRevenue = todayOrders.reduce((sum, order) => sum + order.totalAmount, 0)

      // Payment method breakdown
      const allPayments = todayOrders.flatMap((o) => o.payments)
      const paymentMethodBreakdown = {
        cash: allPayments
          .filter((p) => p.paymentMethod === 'CASH')
          .reduce((sum, p) => sum + p.amount, 0),
        card: allPayments
          .filter((p) => p.paymentMethod === 'CARD')
          .reduce((sum, p) => sum + p.amount, 0)
      }

      // Top products (top 10)
      const todayItems = await prisma.orderItem.findMany({
        where: {
          order: {
            status: 'CLOSED',
            createdAt: { gte: today }
          }
        },
        include: { product: true }
      })

      const productCounts = new Map<string, { name: string; quantity: number }>()
      todayItems.forEach((item) => {
        const existing = productCounts.get(item.productId)
        if (existing) {
          existing.quantity += item.quantity
        } else {
          productCounts.set(item.productId, {
            name: item.product.name,
            quantity: item.quantity
          })
        }
      })

      const topProducts = Array.from(productCounts.entries())
        .map(([productId, data]) => ({
          productId,
          productName: data.name,
          quantity: data.quantity
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)

      // Open tables count
      const openTables = await prisma.table.count({
        where: {
          orders: {
            some: { status: 'OPEN' }
          }
        }
      })

      // Pending orders (open orders with items)
      const pendingOrders = await prisma.order.count({
        where: {
          status: 'OPEN',
          items: { some: {} }
        }
      })

      return {
        success: true,
        data: {
          dailyRevenue,
          totalOrders: todayOrders.length,
          paymentMethodBreakdown,
          topProducts,
          openTables,
          pendingOrders
        }
      }
    } catch (error) {
      logger.error('Dashboard Extended Stats', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.DASHBOARD_GET_REVENUE_TREND, async (_event, days: number = 7) => {
    try {
      const result: { date: string; revenue: number; orderCount: number }[] = []

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setHours(0, 0, 0, 0)
        date.setDate(date.getDate() - i)

        const nextDay = new Date(date)
        nextDay.setDate(nextDay.getDate() + 1)

        const orders = await prisma.order.findMany({
          where: {
            status: 'CLOSED',
            createdAt: { gte: date, lt: nextDay }
          }
        })

        const revenue = orders.reduce((sum, o) => sum + o.totalAmount, 0)

        result.push({
          date: date.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' }),
          revenue,
          orderCount: orders.length
        })
      }

      return { success: true, data: result }
    } catch (error) {
      logger.error('Dashboard Revenue Trend', error)
      return { success: false, error: String(error) }
    }
  })

  // ==================== Z-REPORT ====================
  // ==================== Z-REPORT ====================
  ipcMain.handle(IPC_CHANNELS.ZREPORT_GENERATE, async (_event, actualCash?: number) => {
    try {
      const now = new Date()
      const currentHour = now.getHours()

      // Smart Dating: If before 05:00 AM, assume it belongs to the previous day (Shift logic)
      const reportDate = new Date(now)
      if (currentHour < 5) {
        reportDate.setDate(reportDate.getDate() - 1)
      }
      reportDate.setHours(0, 0, 0, 0)

      // Find the Last Z-Report taken BEFORE this report date
      // This establishes the "Start Time" of the current period.
      const lastReport = await prisma.dailySummary.findFirst({
        where: {
          date: { lt: reportDate }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      const startDate = lastReport ? lastReport.createdAt : new Date(0) // Default to Epoch if no previous report

      // Get ALL closed orders since the last Z-Report (or beginning of time)
      // This ensures NO GAP in data, even if reports were forgotten for days.
      const periodicOrders = await prisma.order.findMany({
        where: {
          status: 'CLOSED',
          createdAt: {
            gt: startDate,
            lte: now
          }
        },
        include: { payments: true }
      })

      // Get expenses in the same period
      const periodicExpenses = await prisma.expense.findMany({
        where: {
          createdAt: {
            gt: startDate,
            lte: now
          }
        }
      })

      // Calculate totals
      const allPayments = periodicOrders.flatMap((o) => o.payments)
      const totalCash = allPayments
        .filter((p) => p.paymentMethod === 'CASH')
        .reduce((sum, p) => sum + p.amount, 0)
      const totalCard = allPayments
        .filter((p) => p.paymentMethod === 'CARD')
        .reduce((sum, p) => sum + p.amount, 0)
      const totalRevenue = totalCash + totalCard

      const totalExpenses = periodicExpenses.reduce((sum, e) => sum + e.amount, 0)
      const netProfit = totalRevenue - totalExpenses

      // Calculate VAT (assuming 10% KDV for simplicity)
      const totalVat = Math.round(totalRevenue * 0.1)

      // Create or Update summary for the calculated reportDate
      const summary = await prisma.dailySummary.upsert({
        where: { date: reportDate },
        create: {
          date: reportDate,
          totalCash,
          actualCash: actualCash ?? totalCash,
          totalCard,
          totalExpenses,
          netProfit,
          cancelCount: 0,
          totalVat,
          orderCount: periodicOrders.length,
          totalRevenue
        },
        update: {
          totalCash,
          actualCash: actualCash ?? totalCash,
          totalCard,
          totalExpenses,
          netProfit,
          totalVat,
          orderCount: periodicOrders.length,
          totalRevenue,
          createdAt: now // Update timestamp to reflect latest calculation
        }
      })

      // Update Monthly Report
      await updateMonthlyReport(reportDate)

      return { success: true, data: summary }
    } catch (error) {
      logger.error('Z-Report Generate', error)
      return { success: false, error: 'Z-Raporu oluşturulamadı.' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.ZREPORT_GET_HISTORY, async (_event, limit: number = 30) => {
    try {
      const reports = await prisma.dailySummary.findMany({
        orderBy: { date: 'desc' },
        take: limit
      })
      return { success: true, data: reports }
    } catch (error) {
      logger.error('Z-Report History', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_MONTHLY, async (_event, limit: number = 12) => {
    try {
      const reports = await prisma.monthlyReport.findMany({
        orderBy: { monthDate: 'desc' },
        take: limit
      })
      return { success: true, data: reports }
    } catch (error) {
      logger.error('Reports Get Monthly', error)
      return { success: false, error: 'Aylık raporlar alınamadı.' }
    }
  })

  // ==================== EXPENSES ====================
  ipcMain.handle(
    IPC_CHANNELS.EXPENSES_CREATE,
    async (_event, data: { description: string; amount: number; category?: string }) => {
      const validation = validateInput(expenseSchemas.create, data)
      if (!validation.success) {
        return { success: false, error: validation.error }
      }

      try {
        const expense = await prisma.expense.create({
          data: validation.data
        })

        // Update Monthly Report
        await updateMonthlyReport(new Date())

        return { success: true, data: expense }
      } catch (error) {
        logger.error('Expenses Create', error)
        return { success: false, error: 'Gider oluşturulamadı.' }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.EXPENSES_UPDATE,
    async (
      _event,
      id: string,
      data: { description?: string; amount?: number; category?: string }
    ) => {
      try {
        const expense = await prisma.expense.update({
          where: { id },
          data
        })

        // Update Monthly Report if amount changed
        await updateMonthlyReport(new Date())

        return { success: true, data: expense }
      } catch (error) {
        logger.error('Expenses Update', error)
        return { success: false, error: 'Gider güncellenemedi.' }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.EXPENSES_GET_ALL, async () => {
    try {
      // Get expenses from the last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const expenses = await prisma.expense.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo }
        },
        orderBy: { createdAt: 'desc' }
      })
      return { success: true, data: expenses }
    } catch (error) {
      logger.error('Expenses Get All', error)
      return { success: false, error: 'Giderler alınamadı.' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.EXPENSES_DELETE, async (_event, id: string) => {
    const validation = validateInput(expenseSchemas.delete, { id })
    if (!validation.success) {
      return { success: false, error: validation.error }
    }

    try {
      await prisma.expense.delete({ where: { id: id } })

      // Update Monthly Report
      await updateMonthlyReport(new Date())

      return { success: true, data: null }
    } catch (error) {
      logger.error('Expenses Delete', error)
      return { success: false, error: 'Gider silinemedi.' }
    }
  })

  // ==================== ACTIVITY LOGS ====================
  ipcMain.handle(IPC_CHANNELS.LOGS_GET_RECENT, async (_event, limit: number = 100) => {
    try {
      const logs = await prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit
      })
      return { success: true, data: logs }
    } catch (error) {
      logger.error('Logs Get Recent', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.LOGS_CREATE,
    async (_event, action: string, tableName?: string, userName?: string, details?: string) => {
      try {
        const log = await prisma.activityLog.create({
          data: { action, tableName, userName, details }
        })
        return { success: true, data: log }
      } catch (error) {
        logger.error('Logs Create', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // ==================== MAINTENANCE ====================
  ipcMain.handle(IPC_CHANNELS.MAINTENANCE_ARCHIVE_OLD_DATA, async () => {
    try {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      // Delete old order items first (due to foreign key)
      const deletedItems = await prisma.orderItem.deleteMany({
        where: {
          order: {
            createdAt: { lt: oneYearAgo },
            status: 'CLOSED'
          }
        }
      })

      // Delete old transactions
      const deletedTransactions = await prisma.transaction.deleteMany({
        where: {
          order: {
            createdAt: { lt: oneYearAgo },
            status: 'CLOSED'
          }
        }
      })

      // Delete old orders
      const deletedOrders = await prisma.order.deleteMany({
        where: {
          createdAt: { lt: oneYearAgo },
          status: 'CLOSED'
        }
      })

      // Log the action
      await prisma.activityLog.create({
        data: {
          action: 'ARCHIVE_DATA',
          details: `Silinen: ${deletedOrders.count} sipariş, ${deletedItems.count} ürün, ${deletedTransactions.count} işlem`
        }
      })

      return {
        success: true,
        data: {
          deletedOrders: deletedOrders.count,
          deletedItems: deletedItems.count,
          deletedTransactions: deletedTransactions.count
        }
      }
    } catch (error) {
      logger.error('Maintenance Archive', error)
      return { success: false, error: 'Veri arşivleme başarısız.' }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.MAINTENANCE_EXPORT_DATA,
    async (_event, format: 'json' | 'csv' = 'json') => {
      try {
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

        // Get old data to export
        const oldOrders = await prisma.order.findMany({
          where: {
            createdAt: { lt: oneYearAgo },
            status: 'CLOSED'
          },
          include: {
            items: { include: { product: true } },
            payments: true,
            table: true
          }
        })

        const isDev = process.env.NODE_ENV === 'development'
        const baseDir = isDev ? process.cwd() : app.getPath('userData')
        const exportDir = path.join(baseDir, 'exports')
        if (!fs.existsSync(exportDir)) {
          fs.mkdirSync(exportDir, { recursive: true })
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const filename = `archive_${timestamp}.${format}`
        const filepath = path.join(exportDir, filename)

        if (format === 'json') {
          fs.writeFileSync(filepath, JSON.stringify(oldOrders, null, 2))
        } else {
          // Simple CSV export
          const headers = 'OrderId,TableName,TotalAmount,Status,CreatedAt\n'
          const rows = oldOrders
            .map(
              (o) =>
                `${o.id},${o.table?.name || ''},${o.totalAmount},${o.status},${o.createdAt.toISOString()}`
            )
            .join('\n')
          fs.writeFileSync(filepath, headers + rows)
        }

        return { success: true, data: { filepath, count: oldOrders.length } }
      } catch (error) {
        logger.error('Maintenance Export', error)
        return { success: false, error: 'Veri dışa aktarma başarısız.' }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.MAINTENANCE_VACUUM, async () => {
    try {
      await prisma.$executeRawUnsafe('VACUUM')

      await prisma.activityLog.create({
        data: {
          action: 'VACUUM',
          details: 'Veritabanı optimize edildi'
        }
      })

      return { success: true, data: null }
    } catch (error) {
      logger.error('Maintenance Vacuum', error)
      return { success: false, error: 'Veritabanı optimizasyonu başarısız.' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.MAINTENANCE_BACKUP, async () => {
    try {
      const isDev = process.env.NODE_ENV === 'development'
      const baseDir = isDev ? process.cwd() : app.getPath('userData')
      const backupDir = path.join(baseDir, 'backups')
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = path.join(backupDir, `backup_${timestamp}.db`)

      // Use the dbPath from prisma module which knows the correct location
      fs.copyFileSync(dbPath, backupPath)

      await prisma.activityLog.create({
        data: {
          action: 'BACKUP_DATABASE',
          details: `Yedek oluşturuldu: ${backupPath}`
        }
      })

      return { success: true, data: { backupPath } }
    } catch (error) {
      logger.error('Maintenance Backup', error)
      return { success: false, error: 'Yedekleme başarısız.' }
    }
  })

  // Backup with rotation - keeps only the last N backups
  ipcMain.handle(
    IPC_CHANNELS.MAINTENANCE_BACKUP_WITH_ROTATION,
    async (_, maxBackups: number = 30) => {
      try {
        const isDev = process.env.NODE_ENV === 'development'
        const baseDir = isDev ? process.cwd() : app.getPath('userData')
        const backupDir = path.join(baseDir, 'backups')
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true })
        }

        // Create new backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const backupPath = path.join(backupDir, `backup_${timestamp}.db`)
        fs.copyFileSync(dbPath, backupPath)

        // Get all backup files and sort by modification time (oldest first)
        const backupFiles = fs
          .readdirSync(backupDir)
          .filter((f) => f.startsWith('backup_') && f.endsWith('.db'))
          .map((f) => ({
            name: f,
            path: path.join(backupDir, f),
            mtime: fs.statSync(path.join(backupDir, f)).mtime.getTime()
          }))
          .sort((a, b) => a.mtime - b.mtime)

        // Delete old backups if we exceed maxBackups
        const toDelete = backupFiles.slice(0, Math.max(0, backupFiles.length - maxBackups))
        for (const file of toDelete) {
          fs.unlinkSync(file.path)
        }

        await prisma.activityLog.create({
          data: {
            action: 'BACKUP_DATABASE',
            details: `Yedek oluşturuldu. Silinen eski yedek sayısı: ${toDelete.length}`
          }
        })

        return {
          success: true,
          data: {
            backupPath,
            deletedCount: toDelete.length,
            totalBackups: backupFiles.length - toDelete.length
          }
        }
      } catch (error) {
        logger.error('Maintenance Backup Rotation', error)
        return { success: false, error: 'Yedekleme başarısız.' }
      }
    }
  )

  // End of Day - Check for open tables
  ipcMain.handle(IPC_CHANNELS.END_OF_DAY_CHECK, async () => {
    try {
      const openOrders = await prisma.order.findMany({
        where: { status: 'OPEN' },
        include: { table: true }
      })

      const openTables = openOrders.map((o) => ({
        tableId: o.tableId,
        tableName: o.table?.name || 'Bilinmeyen Masa',
        orderId: o.id,
        totalAmount: o.totalAmount
      }))

      return {
        success: true,
        data: {
          canProceed: openTables.length === 0,
          openTables
        }
      }
    } catch (error) {
      logger.error('End of Day Check', error)
      return { success: false, error: 'Gün sonu kontrolü başarısız.' }
    }
  })

  // End of Day - Execute full workflow
  ipcMain.handle(IPC_CHANNELS.END_OF_DAY_EXECUTE, async (_event, actualCash?: number) => {
    try {
      // Step 1: Check for open tables
      const openOrders = await prisma.order.count({ where: { status: 'OPEN' } })
      if (openOrders > 0) {
        return { success: false, error: `${openOrders} açık masa var. Önce bunları kapatın.` }
      }

      // Step 2: Generate Z-Report
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Get today's closed orders
      const todayOrders = await prisma.order.findMany({
        where: { status: 'CLOSED', createdAt: { gte: today } },
        include: { payments: true }
      })

      // Get today's expenses
      const todayExpenses = await prisma.expense.findMany({
        where: { createdAt: { gte: today } }
      })

      // Calculate totals
      const allPayments = todayOrders.flatMap((o) => o.payments)
      const totalCash = allPayments
        .filter((p) => p.paymentMethod === 'CASH')
        .reduce((sum, p) => sum + p.amount, 0)
      const totalCard = allPayments
        .filter((p) => p.paymentMethod === 'CARD')
        .reduce((sum, p) => sum + p.amount, 0)
      const totalRevenue = totalCash + totalCard
      const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0)
      const netProfit = totalRevenue - totalExpenses
      const totalVat = Math.round(totalRevenue * 0.1)

      // Create/Update summary
      const existing = await prisma.dailySummary.findUnique({ where: { date: today } })
      const summaryData = {
        totalCash,
        actualCash: actualCash ?? totalCash,
        totalCard,
        totalExpenses,
        netProfit,
        totalRevenue,
        totalVat,
        orderCount: todayOrders.length,
        cancelCount: 0
      }

      let zReport
      if (existing) {
        zReport = await prisma.dailySummary.update({
          where: { id: existing.id },
          data: summaryData
        })
      } else {
        zReport = await prisma.dailySummary.create({ data: { date: today, ...summaryData } })
      }

      await updateMonthlyReport(today)

      await prisma.activityLog.create({
        data: {
          action: 'GENERATE_ZREPORT',
          details: `Gün sonu Z-Raporu: ₺${(totalRevenue / 100).toFixed(2)}`
        }
      })

      // Step 3: Backup with rotation
      const isDev = process.env.NODE_ENV === 'development'
      const baseDir = isDev ? process.cwd() : app.getPath('userData')
      const backupDir = path.join(baseDir, 'backups')
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = path.join(backupDir, `eod_backup_${timestamp}.db`)
      fs.copyFileSync(dbPath, backupPath)

      // Rotate old backups (keep last 30)
      const backupFiles = fs
        .readdirSync(backupDir)
        .filter((f) => f.endsWith('.db'))
        .map((f) => ({
          name: f,
          path: path.join(backupDir, f),
          mtime: fs.statSync(path.join(backupDir, f)).mtime.getTime()
        }))
        .sort((a, b) => a.mtime - b.mtime)

      const toDelete = backupFiles.slice(0, Math.max(0, backupFiles.length - 30))
      for (const file of toDelete) {
        fs.unlinkSync(file.path)
      }

      // Step 4: VACUUM database
      await prisma.$executeRawUnsafe('VACUUM')

      // Step 5: Clear activity logs (keep only today's END_OF_DAY log)
      const logsClearedCount = await prisma.activityLog.count()
      await prisma.activityLog.deleteMany({
        where: {
          action: { not: 'END_OF_DAY' }
        }
      })

      await prisma.activityLog.create({
        data: {
          action: 'END_OF_DAY',
          details: `Gün sonu tamamlandı. Z-Rapor: ₺${(zReport.totalRevenue / 100).toFixed(2)}, Yedek alındı, DB optimize, ${logsClearedCount} log temizlendi.`
        }
      })

      return {
        success: true,
        data: {
          zReport,
          backupPath,
          deletedBackups: toDelete.length,
          vacuumCompleted: true
        }
      }
    } catch (error) {
      logger.error('End of Day Execute', error)
      return { success: false, error: 'Gün sonu işlemi başarısız.' }
    }
  })

  // Order History - Get paginated order history with details
  ipcMain.handle(
    IPC_CHANNELS.ORDERS_GET_HISTORY,
    async (_, options: { date?: string; limit?: number; offset?: number }) => {
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

        const orders = await prisma.order.findMany({
          where: {
            status: 'CLOSED',
            ...dateFilter
          },
          include: {
            table: true,
            items: {
              include: { product: true }
            },
            payments: true
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        })

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
        logger.error('Orders Get History', error)
        return { success: false, error: 'Sipariş geçmişi alınamadı.' }
      }
    }
  )
}
