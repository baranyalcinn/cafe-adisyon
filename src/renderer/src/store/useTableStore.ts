import { create } from 'zustand'

// ============================================================================
// Types
// ============================================================================

interface TableUIState {
  // State
  selectedTableId: string | null
  selectedTableName: string | null

  // Actions
  selectTable: (tableId: string, tableName: string) => void
  clearSelection: () => void
}

// ============================================================================
// Store
// ============================================================================

export const useTableStore = create<TableUIState>((set) => ({
  // Initial State
  selectedTableId: null,
  selectedTableName: null,

  // Actions
  selectTable: (tableId: string, tableName: string): void => {
    // Tip güvenliği: Hem ID hem İsim zorunlu hale getirildi.
    // Böylece hiçbir bileşen eksik veri gönderip arayüzü bozamaz.
    set({ selectedTableId: tableId, selectedTableName: tableName })
  },

  clearSelection: (): void => {
    // App.tsx veya OrderView içinden geriye (Masalara) dönerken
    // selectTable(null, null) yerine bu net metot çağrılacak.
    set({ selectedTableId: null, selectedTableName: null })
  }
}))
