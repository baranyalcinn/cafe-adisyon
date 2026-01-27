import { Table } from '../../../shared/types'

const api = window.api

export const tableService = {
  async getAll(): Promise<Table[]> {
    const result = await api.tables.getAll()
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async getWithStatus(): Promise<(Table & { hasOpenOrder: boolean })[]> {
    const result = await api.tables.getWithStatus()
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async create(name: string): Promise<Table> {
    const result = await api.tables.create(name)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async delete(id: string): Promise<void> {
    const result = await api.tables.delete(id)
    if (!result.success) throw new Error(result.error)
  }
}
