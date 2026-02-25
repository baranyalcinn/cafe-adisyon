import { Prisma } from '../../generated/prisma/client'
import { ApiResponse, Category, Product } from '../../shared/types'
import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'
import { toPlain } from '../lib/toPlain'
import { logService } from './LogService'

// ============================================================================
// Constants & Types
// ============================================================================

const PRODUCT_SELECT = {
  id: true,
  name: true,
  price: true,
  categoryId: true,
  isFavorite: true,
  category: {
    select: {
      id: true,
      name: true,
      icon: true
    }
  }
} satisfies Prisma.ProductSelect

export class ProductService {
  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Prisma verisini düz JS objesine çeviren ve kod tekrarını önleyen yardımcı fonksiyon.
   */
  private formatProductList(
    products: Prisma.ProductGetPayload<{ select: typeof PRODUCT_SELECT }>[]
  ): Product[] {
    return toPlain<Product[]>(products)
  }

  // ============================================================================
  // Read Operations
  // ============================================================================

  async getAllProducts(): Promise<ApiResponse<Product[]>> {
    try {
      const products = await prisma.product.findMany({
        where: { isDeleted: false },
        select: PRODUCT_SELECT
      })
      return { success: true, data: this.formatProductList(products) }
    } catch (error) {
      logger.error('ProductService.getAllProducts', error)
      return { success: false, error: 'Ürünler alınamadı.' }
    }
  }

  async getCategories(): Promise<ApiResponse<Category[]>> {
    try {
      const categories = await prisma.category.findMany({
        where: { isDeleted: false }
      })
      return { success: true, data: toPlain<Category[]>(categories) }
    } catch (error) {
      logger.error('ProductService.getCategories', error) // Eksik loglama eklendi
      return { success: false, error: 'Kategoriler alınamadı.' }
    }
  }

  async getProductsByCategory(categoryId: string): Promise<ApiResponse<Product[]>> {
    try {
      const products = await prisma.product.findMany({
        where: { categoryId, isDeleted: false },
        select: PRODUCT_SELECT
      })
      return { success: true, data: this.formatProductList(products) }
    } catch (error) {
      logger.error('ProductService.getProductsByCategory', error)
      return { success: false, error: 'Kategori ürünleri alınamadı.' }
    }
  }

  async getFavorites(): Promise<ApiResponse<Product[]>> {
    try {
      const products = await prisma.product.findMany({
        where: { isFavorite: true, isDeleted: false },
        select: PRODUCT_SELECT
      })
      return { success: true, data: this.formatProductList(products) }
    } catch (error) {
      logger.error('ProductService.getFavorites', error)
      return { success: false, error: 'Favori ürünler alınamadı.' }
    }
  }

  async searchProducts(query: string): Promise<ApiResponse<Product[]>> {
    try {
      const products = await prisma.product.findMany({
        where: {
          name: { contains: query }, // SQLite LIKE zaten ASCII için case-insensitive
          isDeleted: false
        },
        select: PRODUCT_SELECT
      })
      return { success: true, data: this.formatProductList(products) }
    } catch (error) {
      logger.error('ProductService.searchProducts', error)
      return { success: false, error: 'Ürün araması yapılamadı.' }
    }
  }

  // ============================================================================
  // Write Operations (Create, Update, Delete)
  // ============================================================================

  async createProduct(data: Prisma.ProductCreateInput): Promise<ApiResponse<Product>> {
    try {
      const product = await prisma.product.create({
        data,
        select: PRODUCT_SELECT // Frontend'in category bilgisine ihtiyacı var!
      })
      await logService.createLog('CREATE_PRODUCT', 'Product', `Yeni ürün eklendi: ${product.name}`)
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
        data,
        select: PRODUCT_SELECT // Frontend'in güncel category bilgisine ihtiyacı var!
      })
      await logService.createLog('UPDATE_PRODUCT', 'Product', `Ürün güncellendi: ${product.name}`)
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
        select: PRODUCT_SELECT
      })
      await logService.createLog('DELETE_PRODUCT', 'Product', `Ürün silindi: ${product.name}`)
      return { success: true, data: null }
    } catch (error) {
      logger.error('ProductService.deleteProduct', error)
      return { success: false, error: 'Ürün silinemedi.' }
    }
  }
}

export const productService = new ProductService()
