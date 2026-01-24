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

  // Local Smart Updates (No refetch needed)
  addTable: (table: Table) => void
  updateTable: (table: Partial<Table> & { id: string }) => void
  removeTable: (tableId: string) => void
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
  },

  addTable: (table) => {
    set((state) => ({
      tables: [...state.tables, { ...table, hasOpenOrder: false }].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      )
    }))
  },

  updateTable: (data) => {
    set((state) => ({
      tables: state.tables
        .map((t) => (t.id === data.id ? { ...t, ...data } : t))
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        )
    }))
  },

  removeTable: (tableId) => {
    set((state) => ({
      tables: state.tables.filter((t) => t.id !== tableId)
    }))
  }
}))
