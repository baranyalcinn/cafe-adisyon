import { create } from 'zustand'
import { cafeApi, type Table } from '@/lib/api'

interface TableWithStatus extends Table {
  hasOpenOrder: boolean
  isLocked?: boolean
}

interface TableState {
  tables: TableWithStatus[]
  selectedTableId: string | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchTables: () => Promise<void>
  selectTable: (tableId: string | null) => void
  refreshTableStatus: () => Promise<void>
}

export const useTableStore = create<TableState>((set) => ({
  tables: [],
  selectedTableId: null,
  isLoading: false,
  error: null,

  fetchTables: async () => {
    set({ isLoading: true, error: null })
    try {
      const tables = await cafeApi.tables.getWithStatus()
      set({ tables, isLoading: false })
    } catch (error) {
      set({ error: String(error), isLoading: false })
    }
  },

  selectTable: (tableId: string | null) => {
    set({ selectedTableId: tableId })
  },

  refreshTableStatus: async () => {
    try {
      const tables = await cafeApi.tables.getWithStatus()
      set({ tables })
    } catch (error) {
      console.error('Failed to refresh table status:', error)
    }
  }
}))
