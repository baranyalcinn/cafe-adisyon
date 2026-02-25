'use client'

import { Button } from '@/components/ui/button'
import type { Expense } from '@shared/types'
import { Plus } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ExpenseSheet } from '../components/ExpenseSheet'
import { ExpensesTable } from '../components/ExpensesTable'
import { RevenueSidebar } from '../components/RevenueSidebar'

const api = window.api

// ============================================================================
// Styles
// ============================================================================

const STYLES = {
  layout: 'h-full flex flex-row overflow-hidden bg-white dark:bg-zinc-950',
  mainArea: 'flex-1 flex flex-col min-w-0',
  contentPad: 'flex-1 overflow-hidden px-6 pt-1 pb-6 lg:px-10 lg:pt-2 lg:pb-8',
  tableWrapper: 'h-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700',

  headerActions: 'flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500',
  addBtn:
    'gap-2 font-black px-5 rounded-xl h-10 bg-zinc-950 dark:bg-zinc-50 text-white dark:text-black hover:bg-zinc-900 dark:hover:bg-white active:scale-95 transition-all text-xs tracking-tight shadow-sm'
} as const

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * PORTAL AKSİYONLARI (Header Butonları)
 * Not: Parent tarafından tetiklenen fonksiyonlar sürekli yenilendiği için
 * burada 'memo' kullanmak gereksiz bir RAM yüküydü. Doğal haline bırakıldı.
 */
const ExpensesHeaderActions = ({ onAdd }: { onAdd: () => void }): React.JSX.Element => (
  <div className={STYLES.headerActions}>
    <Button onClick={onAdd} className={STYLES.addBtn}>
      <Plus className="w-4 h-4" strokeWidth={3} />
      Gider Ekle
    </Button>
  </div>
)

// ============================================================================
// Main Component
// ============================================================================

export function ExpensesTab(): React.JSX.Element {
  // State Tanımlamaları
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null)

  const [filters, setFilters] = useState({ search: '', category: 'all', dateRange: 'month' })
  const [stats, setStats] = useState<{
    todayTotal: number
    monthTotal: number
    topCategory?: { name: string; total: number }
  }>({ todayTotal: 0, monthTotal: 0 })

  // ==========================================
  // API FONKSİYONLARI (Sabitlenmiş)
  // ==========================================

  const loadStats = useCallback(async () => {
    try {
      const result = await api.expenses.getStats()
      if (result.success && result.data) setStats(result.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }, [])

  const loadExpenses = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await api.expenses.getAll()
      if (result.success && result.data) {
        const data = result.data as unknown as Expense[] | { expenses: Expense[] }
        setExpenses(Array.isArray(data) ? data : data.expenses)
      }
    } catch (error) {
      console.error('Failed to load expenses:', error)
      setExpenses([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadExpenses()
    loadStats()
    setHeaderTarget(document.getElementById('settings-header-actions'))
  }, [loadExpenses, loadStats])

  // ==========================================
  // İŞLEM YÖNETİCİLERİ (Callbacks)
  // ==========================================

  const handleUpdate = useCallback(
    async (id: string, data: Partial<Expense>) => {
      try {
        const result = await api.expenses.update(id, data)
        if (result.success) {
          await loadExpenses()
          await loadStats() // Kritik: Statları güncelle
        }
      } catch (error) {
        console.error('Update failed:', error)
      }
    },
    [loadExpenses, loadStats]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const result = await api.expenses.delete(id)
        if (result.success) {
          setExpenses((prev) => prev.filter((e) => e.id !== id))
          await loadStats() // Kritik: Statları güncelle
        }
      } catch (error) {
        console.error('Delete failed:', error)
      }
    },
    [loadStats]
  )

  // SheetSubmit fonksiyonu artık useCallback ile koruma altında
  const handleSheetSubmit = useCallback(
    async (data: Partial<Expense>): Promise<void> => {
      try {
        if (selectedExpense) {
          await handleUpdate(selectedExpense.id, data)
        } else {
          const result = await api.expenses.create({
            description: data.description!,
            amount: data.amount!,
            category: data.category,
            paymentMethod: data.paymentMethod
          })
          if (result.success) {
            await loadExpenses()
            await loadStats()
          }
        }
        setIsSheetOpen(false)
      } catch (error) {
        console.error('Submit failed:', error)
      }
    },
    [selectedExpense, handleUpdate, loadExpenses, loadStats]
  )

  // Portal fonksiyonu sabitlendi
  const handleOpenAddSheet = useCallback(() => {
    setSelectedExpense(null)
    setIsSheetOpen(true)
  }, [])

  // ==========================================
  // FİLTRELEME MANTIĞI
  // ==========================================

  const categories = useMemo(() => {
    return Array.from(new Set(expenses.map((e) => e.category).filter(Boolean))) as string[]
  }, [expenses])

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch = e.description.toLowerCase().includes(filters.search.toLowerCase())
      const matchesCategory = filters.category === 'all' || e.category === filters.category

      const date = new Date(e.createdAt)
      const now = new Date()
      let matchesDate = true

      if (filters.dateRange === 'today') {
        matchesDate = date.toDateString() === now.toDateString()
      } else if (filters.dateRange === 'week') {
        matchesDate = date >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else if (filters.dateRange === 'month') {
        matchesDate = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      }

      return matchesSearch && matchesCategory && matchesDate
    })
  }, [expenses, filters])

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className={STYLES.layout}>
      {/* Header Actions via Portal */}
      {headerTarget &&
        createPortal(<ExpensesHeaderActions onAdd={handleOpenAddSheet} />, headerTarget)}

      {/* Sol Sidebar (Filtreler ve Özetler) */}
      <RevenueSidebar
        stats={stats}
        filters={filters}
        categories={categories}
        onFilterChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
      />

      {/* Ana İçerik Alanı */}
      <div className={STYLES.mainArea}>
        <div className={STYLES.contentPad}>
          <div className={STYLES.tableWrapper}>
            <ExpensesTable
              data={filteredExpenses}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onEdit={(e) => {
                setSelectedExpense(e)
                setIsSheetOpen(true)
              }}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Gider Ekle/Düzenle Çekmecesi */}
      <ExpenseSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        expense={selectedExpense}
        onSubmit={handleSheetSubmit}
        onDelete={handleDelete}
      />
    </div>
  )
}
