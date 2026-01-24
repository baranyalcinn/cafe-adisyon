import { create, type StateCreator } from 'zustand'
import { cafeApi, type Table } from '@/lib/api'

// --- Types ---

interface TableWithStatus extends Table {
  hasOpenOrder: boolean
  isLocked?: boolean
}

interface TableData {
  tables: TableWithStatus[]
  selectedTableId: string | null
  isLoading: boolean
  error: string | null
}

interface TableActions {
  fetchTables: () => Promise<void>
  selectTable: (tableId: string | null) => void
  refreshTableStatus: () => Promise<void>
  addTable: (table: Table) => void
  updateTable: (table: Partial<Table> & { id: string }) => void
  removeTable: (tableId: string) => void
}

type TableStore = TableData & TableActions

// --- Slices ---

const createTableDataSlice: StateCreator<TableStore, [], [], TableData> = () => ({
  tables: [],
  selectedTableId: null,
  isLoading: false,
  error: null
})

const createTableActionSlice: StateCreator<TableStore, [], [], TableActions> = (set) => ({
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
})

// --- Final Store Composition ---

export const useTableStore = create<TableStore>()((...a) => ({
  ...createTableDataSlice(...a),
  ...createTableActionSlice(...a)
}))
