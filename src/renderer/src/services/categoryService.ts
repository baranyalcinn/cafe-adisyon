import { commands } from '../lib/bindings'
import { Category } from '@shared/types'
import { unwrap } from '../lib/utils'
import { mapCategory } from '../lib/mappers'

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const res = await commands.getAllCategories()
    return unwrap(res).map(mapCategory)
  },

  async create(name: string): Promise<Category> {
    const res = await commands.createCategory(name)
    return mapCategory(unwrap(res))
  },

  async update(id: string, data: { name?: string; icon?: string }): Promise<Category> {
    const res = await commands.updateCategory(id, {
      name: data.name || null,
      icon: data.icon || null
    })
    return mapCategory(unwrap(res))
  },

  async delete(id: string): Promise<void> {
    const res = await commands.deleteCategory(id)
    unwrap(res)
  }
}
