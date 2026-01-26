import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'
import { ApiResponse, Product, Category } from '../../shared/types'
import { Prisma } from '../../generated/prisma/client'

export class ProductService {
  async getAllProducts(): Promise<ApiResponse<Product[]>> {
    try {
      const products = await prisma.product.findMany({
        where: { categoryId: { not: undefined } }, // Valid categories
        include: { category: true }
      })
      return { success: true, data: products as unknown as Product[] }
    } catch (error) {
      logger.error('ProductService.getAllProducts', error)
      return { success: false, error: 'Ürünler alınamadı.' }
    }
  }

  async createProduct(data: Prisma.ProductCreateInput): Promise<ApiResponse<Product>> {
    try {
      const product = await prisma.product.create({ data })
      return { success: true, data: product as unknown as Product }
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
      return { success: true, data: product as unknown as Product }
    } catch (error) {
      logger.error('ProductService.updateProduct', error)
      return { success: false, error: 'Ürün güncellenemedi.' }
    }
  }

  async deleteProduct(id: string): Promise<ApiResponse<null>> {
    try {
      await prisma.product.delete({ where: { id } })
      return { success: true, data: null }
    } catch (error) {
      logger.error('ProductService.deleteProduct', error)
      return { success: false, error: 'Ürün silinemedi.' }
    }
  }

  async getCategories(): Promise<ApiResponse<Category[]>> {
    try {
      const categories = await prisma.category.findMany()
      return { success: true, data: categories as unknown as Category[] }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async getProductsByCategory(categoryId: string): Promise<ApiResponse<Product[]>> {
    try {
      const products = await prisma.product.findMany({
        where: { categoryId },
        include: { category: true }
      })
      return { success: true, data: products as unknown as Product[] }
    } catch (error) {
      logger.error('ProductService.getProductsByCategory', error)
      return { success: false, error: 'Kategori ürünleri alınamadı.' }
    }
  }

  async getFavorites(): Promise<ApiResponse<Product[]>> {
    try {
      const products = await prisma.product.findMany({
        where: { isFavorite: true },
        include: { category: true }
      })
      return { success: true, data: products as unknown as Product[] }
    } catch (error) {
      logger.error('ProductService.getFavorites', error)
      return { success: false, error: 'Favori ürünler alınamadı.' }
    }
  }

  async searchProducts(query: string): Promise<ApiResponse<Product[]>> {
    try {
      const products = await prisma.product.findMany({
        where: {
          name: { contains: query }
        },
        include: { category: true }
      })
      return { success: true, data: products as unknown as Product[] }
    } catch (error) {
      logger.error('ProductService.searchProducts', error)
      return { success: false, error: 'Ürün araması yapılamadı.' }
    }
  }
}

export const productService = new ProductService()
