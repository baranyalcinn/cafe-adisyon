import { categorySchemas } from '../../../shared/ipc-schemas'
import { IPC_CHANNELS } from '../../../shared/types'
import { prisma } from '../../db/prisma'
import { createRawHandler, createSimpleRawHandler } from '../utils/ipcWrapper'

// Simple in-memory cache for categories
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
  // GET ALL
  createSimpleRawHandler(
    IPC_CHANNELS.CATEGORIES_GET_ALL,
    async () => {
      const cached = getCached<{ id: string; name: string; icon: string }>('categories')
      if (cached) return cached

      const categories = await prisma.category.findMany({
        where: { isDeleted: false }
      })
      categories.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      )
      setCache('categories', categories)
      return categories
    },
    'Kategoriler getirilirken hata oluştu'
  )

  // CREATE
  createRawHandler(
    IPC_CHANNELS.CATEGORIES_CREATE,
    categorySchemas.create,
    async (data) => {
      const category = await prisma.category.create({
        data: { name: data.name }
      })
      invalidateCache('categories')
      return category
    },
    'Kategori oluşturulamadı.'
  )

  // UPDATE
  createRawHandler(
    IPC_CHANNELS.CATEGORIES_UPDATE,
    categorySchemas.update,
    async (data) => {
      const { name, icon } = data.data
      const category = await prisma.category.update({
        where: { id: data.id },
        data: {
          ...(name && { name }),
          ...(icon && { icon })
        }
      })
      invalidateCache('categories')
      return category
    },
    'Kategori güncellenemedi.'
  )

  // DELETE
  createRawHandler(
    IPC_CHANNELS.CATEGORIES_DELETE,
    categorySchemas.delete,
    async (data) => {
      await prisma.$transaction(async (tx) => {
        await tx.product.updateMany({
          where: { categoryId: data.id },
          data: { isDeleted: true }
        })
        await tx.category.update({
          where: { id: data.id },
          data: { isDeleted: true }
        })
      })
      invalidateCache('categories')
      return null
    },
    'Kategori silinemedi.'
  )
}
