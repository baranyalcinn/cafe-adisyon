import { create } from 'zustand'

// --- Client-only UI State ---
// Server data (tables list) lives in React Query via useTables() hook.
// This store only tracks ephemeral client state.

interface TableUIState {
  selectedTableId: string | null
  selectedTableName: string | null
  selectTable: (tableId: string | null, tableName?: string | null) => void
}

export const useTableStore = create<TableUIState>((set) => ({
  selectedTableId: null,
  selectedTableName: null,

  selectTable: (tableId, tableName = null) => {
    set({ selectedTableId: tableId, selectedTableName: tableName })
  }
}))
