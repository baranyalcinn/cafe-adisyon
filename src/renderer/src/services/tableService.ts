import { Table } from '../../../shared/types'
import { resolveApi } from './apiClient'

const api = window.api

export const tableService = {
  getAll: (): Promise<Table[]> => resolveApi(api.tables.getAll()),

  getWithStatus: (): Promise<(Table & { hasOpenOrder: boolean })[]> =>
    resolveApi(api.tables.getWithStatus()),

  create: (name: string): Promise<Table> => resolveApi(api.tables.create(name)),

  delete: async (id: string): Promise<void> => {
    await resolveApi(api.tables.delete(id))
  },

  transfer: async (sourceId: string, targetId: string): Promise<void> => {
    await resolveApi(api.tables.transfer(sourceId, targetId))
  },

  merge: async (sourceId: string, targetId: string): Promise<void> => {
    await resolveApi(api.tables.merge(sourceId, targetId))
  }
}
