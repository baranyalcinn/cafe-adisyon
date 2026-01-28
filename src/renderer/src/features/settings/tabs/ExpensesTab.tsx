import React, { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Trash2,
  Calendar,
  Tag,
  Banknote,
  RefreshCw,
  Receipt,
  Search,
  Filter,
  TrendingDown,
  PieChart
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { cafeApi, type Expense } from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'

const ExpenseList = React.memo(
  ({
    expenses,
    onSelect,
    onDelete,
    isDeleting
  }: {
    expenses: Expense[]
    onSelect: (expense: Expense) => void
    onDelete: (id: string, e: React.MouseEvent) => void
    isDeleting: string | null
  }): React.JSX.Element => {
    if (expenses.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-2xl">
          <Receipt className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            Henüz gider kaydı bulunmuyor.
          </h3>
        </div>
      )
    }

    return (
      <div className="rounded-xl border bg-card/50 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="h-12 px-6 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                Tarih
              </th>
              <th className="h-12 px-6 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                Açıklama
              </th>
              <th className="h-12 px-6 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                Kategori
              </th>
              <th className="h-12 px-6 text-right font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                Tutar
              </th>
              <th className="h-12 px-6 text-right font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                İşlem
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {expenses.map((expense) => (
              <tr
                key={expense.id}
                className="hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => onSelect(expense)}
              >
                <td className="px-6 py-4 align-middle">
                  <div className="flex items-center gap-2 font-medium">
                    <Calendar className="w-4 h-4 text-primary/60" />
                    {new Date(expense.createdAt).toLocaleDateString('tr-TR')}
                  </div>
                </td>
                <td className="px-6 py-4 align-middle font-semibold text-foreground/90">
                  {expense.description}
                </td>
                <td className="px-6 py-4 align-middle">
                  {expense.category ? (
                    <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-bold uppercase transition-colors bg-secondary/50 text-secondary-foreground">
                      <Tag className="w-3 h-3 mr-1" />
                      {expense.category}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">-</span>
                  )}
                </td>
                <td className="px-6 py-4 align-middle text-right font-black text-destructive font-mono text-base">
                  -{formatCurrency(expense.amount)}
                </td>
                <td className="px-6 py-4 align-middle text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => onDelete(expense.id, e)}
                    disabled={isDeleting === expense.id}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
)
ExpenseList.displayName = 'ExpenseList'

const CreateExpenseModal = ({
  open,
  onOpenChange,
  onSuccess
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}): React.JSX.Element => {
  const [newDescription, setNewDescription] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (open) {
      setNewDescription('')
      setNewAmount('')
      setNewCategory('')
    }
  }, [open])

  const handleCreate = async (): Promise<void> => {
    if (!newDescription || !newAmount) return

    setIsCreating(true)
    try {
      await cafeApi.expenses.create({
        description: newDescription,
        amount: parseFloat(newAmount) * 100,
        category: newCategory || undefined
      })
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create expense:', error)
      alert('Gider oluşturulamadı.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Yeni Gider Ekle</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <label
              htmlFor="description"
              className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
            >
              Açıklama
            </label>
            <Input
              id="description"
              placeholder="Örn: Süt alımı, Elektrik faturası"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label
                htmlFor="amount"
                className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
              >
                Tutar (₺)
              </label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="h-10 font-mono"
              />
            </div>
            <div className="grid gap-2">
              <label
                htmlFor="category"
                className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
              >
                Kategori
              </label>
              <Input
                id="category"
                placeholder="Örn: Mutfak, Fatura"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!newDescription || !newAmount || isCreating}
            className="px-8 font-bold"
          >
            {isCreating ? 'Kaydediliyor...' : 'Gideri Kaydet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const ExpenseDetailModal = ({
  expense,
  onClose,
  onDelete
}: {
  expense: Expense | null
  onClose: () => void
  onDelete: (id: string) => void
}): React.JSX.Element => {
  return (
    <Dialog open={!!expense} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Gider Detayı</DialogTitle>
        </DialogHeader>

        {expense && (
          <div className="space-y-6 pt-4">
            <div className="flex flex-col items-center justify-center p-8 bg-destructive/5 dark:bg-destructive/10 rounded-2xl border border-destructive/10">
              <span className="text-[10px] font-black text-destructive/60 uppercase tracking-[0.2em] mb-2">
                Toplam Tutar
              </span>
              <span className="text-4xl font-black text-destructive tabular-nums">
                -{formatCurrency(expense.amount)}
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-[100px_1fr] gap-4 items-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Tarih</span>
                </div>
                <span className="font-bold">
                  {new Date(expense.createdAt).toLocaleDateString('tr-TR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <div className="grid grid-cols-[100px_1fr] gap-4 items-start">
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <Tag className="w-4 h-4" />
                  <span className="text-sm font-medium">Kategori</span>
                </div>
                <div>
                  {expense.category ? (
                    <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-bold uppercase bg-secondary/50 text-secondary-foreground italic">
                      {expense.category}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">-</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-[100px_1fr] gap-4 items-start">
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <Banknote className="w-4 h-4" />
                  <span className="text-sm font-medium">Açıklama</span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground font-medium">
                  {expense.description}
                </p>
              </div>
            </div>

            <DialogFooter className="sm:justify-between gap-2 border-t pt-6 mt-4">
              <Button
                variant="destructive"
                size="sm"
                className="gap-2 font-bold px-6"
                onClick={() => {
                  onDelete(expense.id)
                  onClose()
                }}
              >
                <Trash2 className="w-4 h-4" />
                Gideri Sil
              </Button>
              <Button variant="outline" onClick={onClose}>
                Kapat
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function ExpensesTab(): React.JSX.Element {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const loadExpenses = async (): Promise<void> => {
    setIsLoading(true)
    try {
      const data = await cafeApi.expenses.getAll()
      setExpenses(data)
    } catch (error) {
      console.error('Failed to load expenses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadExpenses()
  }, [])

  const categories = Array.from(
    new Set(expenses.map((e) => e.category).filter(Boolean))
  ) as string[]

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch = e.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Analytics
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

  const handleDelete = useCallback(async (id: string, e?: React.MouseEvent): Promise<void> => {
    if (e) e.stopPropagation()
    if (!confirm('Bu gider kaydını silmek istediğinize emin misiniz?')) return
    setIsDeleting(id)
    try {
      await cafeApi.expenses.delete(id)
      setExpenses((prev) => prev.filter((e) => e.id !== id))
    } catch (error) {
      console.error('Failed to delete expense:', error)
      alert('Gider silinemedi.')
    } finally {
      setIsDeleting(null)
    }
  }, [])

  const handleSelect = useCallback((expense: Expense): void => {
    setSelectedExpense(expense)
  }, [])

  return (
    <Card className="h-full flex flex-col border-0 shadow-none bg-transparent">
      {/* Header Section */}
      <div className="flex-none py-4 px-8 border-b bg-background/50 backdrop-blur z-10 w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gider Takibi</h2>
            <p className="text-sm text-muted-foreground">İşletme giderlerini ekleyin ve yönetin</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadExpenses}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              Güncelle
            </Button>
            <Button onClick={() => setShowCreateModal(true)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Yeni Gider
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-muted/10">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Analytics Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="relative overflow-hidden bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent border-destructive/20 shadow-sm transition-all hover:shadow-md">
              <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-destructive/20 rounded-2xl">
                    <TrendingDown className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-destructive/80 uppercase tracking-wider mb-1">
                      Bugünkü Gider
                    </p>
                    <p className="text-2xl font-extrabold text-destructive tabular-nums">
                      {formatCurrency(todayTotal)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-warning/10 via-warning/5 to-transparent border-warning/20 shadow-sm transition-all hover:shadow-md">
              <div className="absolute top-0 right-0 w-24 h-24 bg-warning/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-warning/20 rounded-2xl">
                    <Calendar className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-warning/80 uppercase tracking-wider mb-1">
                      Bu Ayki Toplam
                    </p>
                    <p className="text-2xl font-extrabold text-warning tabular-nums">
                      {formatCurrency(monthTotal)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20 shadow-sm transition-all hover:shadow-md">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-2xl">
                    <PieChart className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-purple-600/80 uppercase tracking-wider mb-1">
                      En Büyük Kategori
                    </p>
                    <p className="text-2xl font-extrabold text-purple-600 truncate">
                      {topCategory?.name || 'Yok'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-background p-4 rounded-3xl border shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Açıklama ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-muted/30 border-none ring-offset-background placeholder:text-muted-foreground/50 rounded-2xl"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-48">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 bg-muted/30 border-none rounded-2xl text-sm font-medium appearance-none focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="all">Tüm Kategoriler</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <ExpenseList
            expenses={filteredExpenses}
            onSelect={handleSelect}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        </div>
      </div>

      <CreateExpenseModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={loadExpenses}
      />

      <ExpenseDetailModal
        expense={selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onDelete={(id) => handleDelete(id)}
      />
    </Card>
  )
}
