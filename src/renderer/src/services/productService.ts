import { Product } from '../../../shared/types'
import { resolveApi } from './apiClient'

const api = window.api

export const productService = {
  getAll: (): Promise<Product[]> => resolveApi(api.products.getAll()),

  getByCategory: (categoryId: string): Promise<Product[]> =>
    resolveApi(api.products.getByCategory(categoryId)),

  getFavorites: (): Promise<Product[]> => resolveApi(api.products.getFavorites()),

  search: (query: string): Promise<Product[]> => resolveApi(api.products.search(query)),

  create: (data: {
    name: string
    price: number
    categoryId: string
    isFavorite: boolean
  }): Promise<Product> => resolveApi(api.products.create(data)),

  update: (
    id: string,
    data: { name?: string; price?: number; isFavorite?: boolean }
  ): Promise<Product> => resolveApi(api.products.update(id, data)),

  delete: async (id: string): Promise<void> => {
    await resolveApi(api.products.delete(id))
  }
}
