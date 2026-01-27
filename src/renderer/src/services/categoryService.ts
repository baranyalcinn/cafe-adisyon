import { Category } from '../../../shared/types'

const api = window.api

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const result = await api.categories.getAll()
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async create(name: string): Promise<Category> {
    const result = await api.categories.create(name)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async update(id: string, data: { name?: string; icon?: string }): Promise<Category> {
    const result = await api.categories.update(id, data)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async delete(id: string): Promise<void> {
    const result = await api.categories.delete(id)
    if (!result.success) throw new Error(result.error)
  }
}
