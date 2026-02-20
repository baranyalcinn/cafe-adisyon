import { Prisma } from '../../generated/prisma/client'
import { ApiResponse, Category, Product } from '../../shared/types'
import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'
import { toPlain } from '../lib/toPlain'
import { logService } from './LogService'

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
}

export class ProductService {
  async getAllProducts(): Promise<ApiResponse<Product[]>> {
    try {
      const products = await prisma.product.findMany({
        where: {
          categoryId: { not: undefined },
          isDeleted: false
        },
        select: PRODUCT_SELECT
      })
      const result = toPlain<Product[]>(products as unknown as Product[])
      return { success: true, data: result }
    } catch (error) {
      logger.error('ProductService.getAllProducts', error)
      return { success: false, error: 'Ürünler alınamadı.' }
    }
  }

  async createProduct(data: Prisma.ProductCreateInput): Promise<ApiResponse<Product>> {
    try {
      const product = await prisma.product.create({ data })
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
        select: PRODUCT_SELECT
      })
      return { success: true, data: toPlain<Product[]>(products as unknown as Product[]) }
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
        select: PRODUCT_SELECT
      })
      return { success: true, data: toPlain<Product[]>(products as unknown as Product[]) }
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
        select: PRODUCT_SELECT
      })
      return { success: true, data: toPlain<Product[]>(products as unknown as Product[]) }
    } catch (error) {
      logger.error('ProductService.searchProducts', error)
      return { success: false, error: 'Ürün araması yapılamadı.' }
    }
  }
}

export const productService = new ProductService()
