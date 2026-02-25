import { Category } from '../../../shared/types'
import { resolveApi } from './apiClient'

const api = window.api

export const categoryService = {
  getAll: (): Promise<Category[]> => resolveApi(api.categories.getAll()),

  create: (name: string): Promise<Category> => resolveApi(api.categories.create(name)),

  update: (id: string, data: { name?: string; icon?: string }): Promise<Category> =>
    resolveApi(api.categories.update(id, data)),

  delete: async (id: string): Promise<void> => {
    await resolveApi(api.categories.delete(id))
  }
}
