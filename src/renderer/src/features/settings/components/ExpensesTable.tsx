import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/utils'
import { ArrowUpDown, MoreHorizontal, Check, X, Pencil, Trash2 } from 'lucide-react'
import type { Expense } from '@shared/types'

interface ExpensesTableProps {
  data: Expense[]
  onUpdate: (id: string, data: Partial<Expense>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onEdit?: (expense: Expense) => void
  isLoading?: boolean
}

type SortConfig = {
  key: keyof Expense
  direction: 'asc' | 'desc'
} | null

export function ExpensesTable({
  data,
  onUpdate,
  onDelete,
  onEdit,
  isLoading
}: ExpensesTableProps): React.JSX.Element {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    description: string
    amount: string
    category: string
  }>({ description: '', amount: '', category: '' })

  const handleSort = (key: keyof Expense): void => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig) return 0
    const { key, direction } = sortConfig

    // Date sorting
    if (key === 'createdAt') {
      const dateA = new Date(a[key]).getTime()
      const dateB = new Date(b[key]).getTime()
      return direction === 'asc' ? dateA - dateB : dateB - dateA
    }

    // String/Number sorting
    /* @ts-ignore - dynamic key access */
    if (a[key] < b[key]) return direction === 'asc' ? -1 : 1
    /* @ts-ignore - dynamic key access */
    if (a[key] > b[key]) return direction === 'asc' ? 1 : -1
    return 0
  })

  const startEdit = (expense: Expense): void => {
    setEditingId(expense.id)
    setEditForm({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category || ''
    })
  }

  const cancelEdit = (): void => {
    setEditingId(null)
    setEditForm({ description: '', amount: '', category: '' })
  }

  const saveEdit = async (id: string): Promise<void> => {
    try {
      await onUpdate(id, {
        description: editForm.description,
        amount: parseFloat(editForm.amount),
        category: editForm.category
      })
      setEditingId(null)
    } catch (error) {
      console.error('Failed to update expense', error)
      // Ideally show toast here
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>
  }

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">Henüz gider kaydı bulunmuyor.</div>
    )
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden flex flex-col h-full shadow-sm">
      <div className="overflow-auto flex-1">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="w-[150px] bg-card">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('createdAt')}
                  className="-ml-4 h-8 font-bold text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Tarih
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="bg-card">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('description')}
                  className="-ml-4 h-8 font-bold text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Açıklama
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="bg-card">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('category')}
                  className="-ml-4 h-8 font-bold text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Kategori
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right bg-card">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('amount')}
                  className="-ml-4 h-8 font-bold text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Tutar
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[80px] bg-card"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((expense) => (
              <TableRow key={expense.id} className="group hover:bg-muted/30 transition-colors">
                {editingId === expense.id ? (
                  // Edit Mode
                  <>
                    <TableCell className="font-medium align-middle py-4">
                      {new Date(expense.createdAt).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell className="align-middle py-3">
                      <Input
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, description: e.target.value }))
                        }
                        placeholder="Açıklama"
                        className="h-9 font-medium"
                      />
                    </TableCell>
                    <TableCell className="align-middle py-3">
                      <Input
                        value={editForm.category}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, category: e.target.value }))
                        }
                        placeholder="Kategori"
                        className="h-9 font-medium"
                      />
                    </TableCell>
                    <TableCell className="text-right align-middle py-3">
                      <Input
                        type="number"
                        value={editForm.amount}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, amount: e.target.value }))
                        }
                        placeholder="0.00"
                        className="h-9 text-right font-bold"
                      />
                    </TableCell>
                    <TableCell className="text-right align-middle py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                          onClick={() => saveEdit(expense.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                          onClick={cancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  // View Mode
                  <>
                    <TableCell className="font-semibold py-4">
                      {new Date(expense.createdAt).toLocaleDateString('tr-TR')}
                      <div className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                        {new Date(expense.createdAt).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{expense.description}</TableCell>
                    <TableCell>
                      {expense.category && (
                        <span className="inline-flex items-center rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary border border-primary/10">
                          {expense.category}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-black text-base tracking-tight">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-muted rounded-full"
                          >
                            <span className="sr-only">Menü aç</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="rounded-xl border-white/10 bg-background/95 backdrop-blur-md"
                        >
                          <DropdownMenuItem
                            onClick={() => (onEdit ? onEdit(expense) : startEdit(expense))}
                            className="rounded-lg"
                          >
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Düzenle
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(expense.id)}
                            className="text-rose-600 focus:text-rose-600 focus:bg-rose-50/50 rounded-lg"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
