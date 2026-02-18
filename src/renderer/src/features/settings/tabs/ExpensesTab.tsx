import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Expense } from '@shared/types'
import { ExpensesTable } from '../components/ExpensesTable'
import { RevenueSidebar } from '../components/RevenueSidebar'
import { ExpenseSheet } from '../components/ExpenseSheet'
import { createPortal } from 'react-dom'

// Using api directly from window as defined in preload
const api = window.api

export function ExpensesTab(): React.JSX.Element {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)

  // Filter State
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    dateRange: 'month'
  })

  const loadExpenses = async (): Promise<void> => {
    setIsLoading(true)
    try {
      const result = await api.expenses.getAll()
      if (result.success && result.data) {
        setExpenses(result.data)
      }
    } catch (error) {
      console.error('Failed to load expenses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadExpenses()
  }, [])

  const handleFilterChange = (key: string, value: string): void => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const categories = useMemo(() => {
    return Array.from(new Set(expenses.map((e) => e.category).filter(Boolean))) as string[]
  }, [expenses])

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch = e.description.toLowerCase().includes(filters.search.toLowerCase())
      const matchesCategory = filters.category === 'all' || e.category === filters.category

      // Basic Date Filtering
      const date = new Date(e.createdAt)
      const now = new Date()
      let matchesDate = true
      if (filters.dateRange === 'today') {
        matchesDate = date.toDateString() === now.toDateString()
      } else if (filters.dateRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        matchesDate = date >= weekAgo
      } else if (filters.dateRange === 'month') {
        matchesDate = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      }

      return matchesSearch && matchesCategory && matchesDate
    })
  }, [expenses, filters])

  // Analytics
  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const todayTotal = expenses
      .filter((e) => new Date(e.createdAt) >= today)
      .reduce((sum, e) => sum + e.amount, 0)

    const monthTotal = expenses
      .filter((e) => new Date(e.createdAt) >= firstDayOfMonth)
      .reduce((sum, e) => sum + e.amount, 0)

    const topCategory = categories
      .map((cat) => ({
        name: cat,
        total: expenses.filter((e) => e.category === cat).reduce((sum, e) => sum + e.amount, 0)
      }))
      .sort((a, b) => b.total - a.total)[0]

    return { todayTotal, monthTotal, topCategory }
  }, [expenses, categories])

  const handleAddExpense = (): void => {
    setSelectedExpense(null)
    setIsSheetOpen(true)
  }

  const handleEditExpense = (expense: Expense): void => {
    // In ExpensesTable, we have dropdown edit. If we want to use the sheet:
    // We could pass handleEditExpense to ExpensesTable as a prop.
    // For now, let's keep inline editing working but provide the sheet for full edits or Add.
    setSelectedExpense(expense)
    setIsSheetOpen(true)
  }

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    try {
      const result = await api.expenses.delete(id)
      if (result.success) {
        setExpenses((prev) => prev.filter((e) => e.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete expense:', error)
    }
  }, [])

  const handleUpdate = useCallback(async (id: string, data: Partial<Expense>): Promise<void> => {
    try {
      const result = await api.expenses.update(id, data)
      if (result.success && result.data) {
        setExpenses((prev) => prev.map((e) => (e.id === id ? result.data! : e)))
      }
    } catch (error) {
      console.error('Failed to update expense:', error)
      throw error
    }
  }, [])

  const handleSheetSubmit = async (data: Partial<Expense>): Promise<void> => {
    try {
      if (selectedExpense) {
        // Update
        await handleUpdate(selectedExpense.id, data)
      } else {
        // Create
        const result = await api.expenses.create({
          description: data.description!,
          amount: data.amount!,
          category: data.category
        })
        if (result.success && result.data) {
          setExpenses((prev) => [result.data!, ...prev])
        }
      }
      setIsSheetOpen(false)
    } catch (error) {
      console.error('Sheet submit failed:', error)
    }
  }

  // Portal target for header actions
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setHeaderTarget(document.getElementById('settings-header-actions'))
  }, [])

  return (
    <div className="h-full flex flex-row overflow-hidden bg-background">
      {/* Header Actions via Portal */}
      {headerTarget &&
        createPortal(
          <Button onClick={handleAddExpense} className="gap-2 font-bold px-6 rounded-xl h-9">
            <Plus className="w-5 h-5" />
            GİDER EKLE
          </Button>,
          headerTarget
        )}

      {/* Sidebar */}
      <RevenueSidebar
        stats={stats}
        filters={filters}
        categories={categories}
        onFilterChange={handleFilterChange}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Content Area */}
        <ScrollArea className="flex-1">
          <div className="p-8 max-w-6xl mx-auto">
            <ExpensesTable
              data={filteredExpenses}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onEdit={handleEditExpense}
              isLoading={isLoading}
            />
          </div>
        </ScrollArea>
      </div>

      {/* Side Drawer */}
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
