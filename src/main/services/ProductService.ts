import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'
import { logService } from './LogService'
import { ApiResponse, Product, Category } from '../../shared/types'
import { Prisma } from '../../generated/prisma/client'
import { toPlain } from '../lib/toPlain'

export class ProductService {
  // In-memory cache for getAllProducts (most frequently called)
  private cache: { data: Product[]; timestamp: number } | null = null
  private readonly CACHE_TTL = 60000 // 1 minute

  private getCached(): Product[] | null {
    if (!this.cache) return null
    if (Date.now() - this.cache.timestamp > this.CACHE_TTL) {
      this.cache = null
      return null
    }
    return this.cache.data
  }

  private invalidateCache(): void {
    this.cache = null
  }

  async getAllProducts(): Promise<ApiResponse<Product[]>> {
    try {
      const cached = this.getCached()
      if (cached) return { success: true, data: cached }

      const products = await prisma.product.findMany({
        where: {
          categoryId: { not: undefined },
          isDeleted: false
        },
        include: { category: true }
      })
      const result = toPlain<Product[]>(products)
      this.cache = { data: result, timestamp: Date.now() }
      return { success: true, data: result }
    } catch (error) {
      logger.error('ProductService.getAllProducts', error)
      return { success: false, error: 'Ürünler alınamadı.' }
    }
  }

  async createProduct(data: Prisma.ProductCreateInput): Promise<ApiResponse<Product>> {
    try {
      const product = await prisma.product.create({ data })
      this.invalidateCache()
      return { success: true, data: toPlain<Product>(product) }
    } catch (error) {
      logger.error('ProductService.createProduct', error)
      return { success: false, error: 'Ürün oluşturulamadı.' }
    }
  }

  async updateProduct(id: string, data: Prisma.ProductUpdateInput): Promise<ApiResponse<Product>> {
    try {
      const product = await prisma.product.update({
        where: { id },
        data
      })
      this.invalidateCache()
      return { success: true, data: toPlain<Product>(product) }
    } catch (error) {
      logger.error('ProductService.updateProduct', error)
      return { success: false, error: 'Ürün güncellenemedi.' }
    }
  }

  async deleteProduct(id: string): Promise<ApiResponse<null>> {
    try {
      const product = await prisma.product.update({
        where: { id },
        data: { isDeleted: true },
        include: { category: true }
      })
      this.invalidateCache()
      await logService.createLog('DELETE_PRODUCT', undefined, `Ürün silindi: ${product.name}`)
      return { success: true, data: null }
    } catch (error) {
      logger.error('ProductService.deleteProduct', error)
      return { success: false, error: 'Ürün silinemedi.' }
    }
  }

  async getCategories(): Promise<ApiResponse<Category[]>> {
    try {
      const categories = await prisma.category.findMany({
        where: { isDeleted: false }
      })
      return { success: true, data: toPlain<Category[]>(categories) }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async getProductsByCategory(categoryId: string): Promise<ApiResponse<Product[]>> {
    try {
      const products = await prisma.product.findMany({
        where: {
          categoryId,
          isDeleted: false
        },
        include: { category: true }
      })
      return { success: true, data: toPlain<Product[]>(products) }
    } catch (error) {
      logger.error('ProductService.getProductsByCategory', error)
      return { success: false, error: 'Kategori ürünleri alınamadı.' }
    }
  }

  async getFavorites(): Promise<ApiResponse<Product[]>> {
    try {
      const products = await prisma.product.findMany({
        where: {
          isFavorite: true,
          isDeleted: false
        },
        include: { category: true }
      })
      return { success: true, data: toPlain<Product[]>(products) }
    } catch (error) {
      logger.error('ProductService.getFavorites', error)
      return { success: false, error: 'Favori ürünler alınamadı.' }
    }
  }

  async searchProducts(query: string): Promise<ApiResponse<Product[]>> {
    try {
      const products = await prisma.product.findMany({
        where: {
          name: { contains: query },
          isDeleted: false
        },
        include: { category: true }
      })
      return { success: true, data: toPlain<Product[]>(products) }
    } catch (error) {
      logger.error('ProductService.searchProducts', error)
      return { success: false, error: 'Ürün araması yapılamadı.' }
    }
  }
}

export const productService = new ProductService()
