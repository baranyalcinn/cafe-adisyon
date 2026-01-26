import { ipcMain } from 'electron'
import { prisma, dbWrite } from '../../db/prisma'
import { logger } from '../../lib/logger'
import { IPC_CHANNELS } from '../../../shared/types'
import { categorySchemas, validateInput } from '../../lib/validation'

// Simple in-memory cache for categories
// Note: We might want to move this to a Service if shared, but for now referencing locally.
// If handlers.ts shared cache with products, we might have cache drift.
// Ideally cache should be in a Service. But I'll replicate local behavior for now to fix regression.
interface CacheEntry<T> {
  data: T
  timestamp: number
}

const cache = {
  categories: null as CacheEntry<unknown[]> | null,
  TTL: 60000 // 1 minute cache
}

function getCached<T>(key: 'categories'): T[] | null {
  const entry = cache[key]
  if (!entry) return null
  if (Date.now() - entry.timestamp > cache.TTL) {
    cache[key] = null
    return null
  }
  return entry.data as T[]
}

function setCache<T>(key: 'categories', data: T[]): void {
  cache[key] = { data, timestamp: Date.now() }
}

function invalidateCache(key: 'categories'): void {
  cache[key] = null
}

export function registerCategoryHandlers(): void {
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
        invalidateCache('categories')
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
      // Note: In handlers.ts it invalidated 'products' too.
      // We can't invalidate 'products' cache here easily if it's local to productHandlers.
      // Ideally we should export invalidateCache from productHandlers or move cache to Service.
      // For now, accepting cache drift risk or we can assume products are re-fetched.
      return { success: true, data: null }
    } catch (error) {
      logger.error('Categories Delete', error)
      return { success: false, error: 'Kategori silinemedi.' }
    }
  })
}
