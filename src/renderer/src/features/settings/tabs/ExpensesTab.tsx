import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Expense } from '@shared/types'
import { ExpensesTable } from '../components/ExpensesTable'
import { RevenueSidebar } from '../components/RevenueSidebar'
import { ExpenseSheet } from '../components/ExpenseSheet'
import { cn } from '@/lib/utils'

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

  return (
    <div className="h-full flex flex-row overflow-hidden bg-background">
      {/* Sidebar */}
      <RevenueSidebar
        stats={stats}
        filters={filters}
        categories={categories}
        onFilterChange={handleFilterChange}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 flex-none border-b bg-background flex items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Giderler</h1>
            <p className="text-sm text-muted-foreground">
              {filteredExpenses.length} gider listeleniyor
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadExpenses} disabled={isLoading}>
              <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
              Yenile
            </Button>
            <Button onClick={handleAddExpense} className="gap-2 font-bold px-6 rounded-xl">
              <Plus className="w-5 h-5" />
              Gider Ekle
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <ExpensesTable
              data={filteredExpenses}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onEdit={handleEditExpense}
              isLoading={isLoading}
            />
          </div>
        </main>
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
