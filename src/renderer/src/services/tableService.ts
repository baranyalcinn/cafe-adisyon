import { commands } from '../lib/bindings'
import { Table } from '@shared/types'
import { unwrap } from '../lib/utils'

export const tableService = {
  async getAll(): Promise<Table[]> {
    const res = await commands.getAllTables()
    return unwrap(res)
  },

  async create(name: string): Promise<Table> {
    const res = await commands.createTable(name)
    return unwrap(res)
  },

  async delete(id: string): Promise<void> {
    const res = await commands.deleteTable(id)
    unwrap(res)
  },

  async getWithStatus(): Promise<Table[]> {
    const res = await commands.getTableStatus()
    // TableStatusResponse { id, name, hasOpenOrder, isLocked } matches Table interface structurally for these fields
    return unwrap(res) as unknown as Table[]
  }
}
