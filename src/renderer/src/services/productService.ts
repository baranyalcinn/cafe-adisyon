import { Product } from '../../../shared/types'

const api = window.api

export const productService = {
  async getAll(): Promise<Product[]> {
    const result = await api.products.getAll()
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async getByCategory(categoryId: string): Promise<Product[]> {
    const result = await api.products.getByCategory(categoryId)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async getFavorites(): Promise<Product[]> {
    const result = await api.products.getFavorites()
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async search(query: string): Promise<Product[]> {
    const result = await api.products.search(query)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async create(data: {
    name: string
    price: number
    categoryId: string
    isFavorite: boolean
  }): Promise<Product> {
    const result = await api.products.create(data)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async update(
    id: string,
    data: { name?: string; price?: number; isFavorite?: boolean }
  ): Promise<Product> {
    const result = await api.products.update(id, data)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async delete(id: string): Promise<void> {
    const result = await api.products.delete(id)
    if (!result.success) throw new Error(result.error)
  }
}
