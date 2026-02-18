import { commands } from '../lib/bindings'
import { Product } from '@shared/types'
import { unwrap } from '../lib/utils'

export const productService = {
  async getAll(): Promise<Product[]> {
    const res = await commands.getAllProducts()
    return unwrap(res)
  },

  async getByCategory(categoryId: string): Promise<Product[]> {
    const res = await commands.getProductsByCategory(categoryId)
    return unwrap(res)
  },

  async getFavorites(): Promise<Product[]> {
    const res = await commands.getFavoriteProducts()
    return unwrap(res)
  },

  async search(query: string): Promise<Product[]> {
    const res = await commands.searchProducts(query)
    return unwrap(res)
  },

  async create(data: {
    name: string
    price: number
    categoryId: string
    isFavorite: boolean
  }): Promise<Product> {
    const res = await commands.createProduct({
      name: data.name,
      price: data.price,
      categoryId: data.categoryId,
      isFavorite: data.isFavorite
    })
    return unwrap(res)
  },

  async update(
    id: string,
    data: { name?: string; price?: number; isFavorite?: boolean }
  ): Promise<Product> {
    const res = await commands.updateProduct(id, {
      name: data.name === undefined ? null : data.name,
      price: data.price === undefined ? null : data.price,
      isFavorite: data.isFavorite === undefined ? null : data.isFavorite
    })
    return unwrap(res)
  },

  async delete(id: string): Promise<void> {
    const res = await commands.deleteProduct(id)
    unwrap(res)
  }
}
