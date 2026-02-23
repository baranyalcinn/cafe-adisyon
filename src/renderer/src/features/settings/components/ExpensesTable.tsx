import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn, formatCurrency } from '@/lib/utils'
import type { Expense } from '@shared/types'
import {
  ArrowUpDown,
  Check,
  CreditCard,
  History,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
  Wallet,
  X
} from 'lucide-react'
import { useState } from 'react'

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
    paymentMethod: 'CASH' | 'CARD'
  }>({ description: '', amount: '', category: '', paymentMethod: 'CASH' })

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

    // String/Number sorting with proper type handling
    const aValue = a[key]
    const bValue = b[key]
    if (aValue === undefined || bValue === undefined) return 0
    if (aValue < bValue) return direction === 'asc' ? -1 : 1
    if (aValue > bValue) return direction === 'asc' ? 1 : -1
    return 0
  })

  const startEdit = (expense: Expense): void => {
    setEditingId(expense.id)
    setEditForm({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category || '',
      paymentMethod: expense.paymentMethod || 'CASH'
    })
  }

  const cancelEdit = (): void => {
    setEditingId(null)
    setEditForm({ description: '', amount: '', category: '', paymentMethod: 'CASH' })
  }

  const saveEdit = async (id: string): Promise<void> => {
    try {
      await onUpdate(id, {
        description: editForm.description,
        amount: parseFloat(editForm.amount),
        category: editForm.category,
        paymentMethod: editForm.paymentMethod
      })
      setEditingId(null)
    } catch (error) {
      console.error('Failed to update expense', error)
    }
  }

  // Common button style for sort headers to match LogsTab
  const SortButton = ({
    label,
    sortKey
  }: {
    label: string
    sortKey: keyof Expense
  }): React.JSX.Element => (
    <Button
      variant="ghost"
      onClick={() => handleSort(sortKey)}
      className="-ml-4 h-8 font-black text-[12px] tracking-widest text-zinc-500 hover:text-primary transition-colors "
    >
      {label}
      <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />
    </Button>
  )

  const getCategoryColor = (category: string): string => {
    const normalized = category.toLowerCase().trim()
    if (
      normalized.includes('mutfak') ||
      normalized.includes('gıda') ||
      normalized.includes('yiyecek')
    )
      return 'text-orange-500'
    if (normalized.includes('temizlik') || normalized.includes('hijyen')) return 'text-cyan-500'
    if (normalized.includes('market') || normalized.includes('alışveriş')) return 'text-emerald-500'
    if (
      normalized.includes('personel') ||
      normalized.includes('maaş') ||
      normalized.includes('avans')
    )
      return 'text-purple-500'
    if (
      normalized.includes('fatura') ||
      normalized.includes('elektrik') ||
      normalized.includes('su') ||
      normalized.includes('internet')
    )
      return 'text-rose-500'
    if (normalized.includes('kira') || normalized.includes('aidat')) return 'text-indigo-500'
    if (
      normalized.includes('teknik') ||
      normalized.includes('tamir') ||
      normalized.includes('bakım')
    )
      return 'text-amber-500'

    return 'text-blue-500'
  }

  return (
    <div className="flex-1 h-full min-h-0">
      <div className="h-full overflow-y-auto custom-scrollbar">
        <Table className="table-fixed w-full">
          <TableHeader className="sticky top-0 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-sm z-10 border-b-2 border-zinc-200 dark:border-zinc-800">
            <TableRow className="hover:bg-transparent border-0">
              <TableHead className="w-[180px] pl-6">
                <SortButton label="Tarih" sortKey="createdAt" />
              </TableHead>
              <TableHead className="w-[30%]">
                <SortButton label="Açıklama" sortKey="description" />
              </TableHead>
              <TableHead>
                <SortButton label="Kategori" sortKey="category" />
              </TableHead>
              <TableHead>
                <SortButton label="Ödeme" sortKey="paymentMethod" />
              </TableHead>
              <TableHead className="text-right">
                <SortButton label="Tutar" sortKey="amount" />
              </TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 opacity-20">
                    <RefreshCw className="animate-spin" size={32} />
                    <span className="text-xs font-bold">Yükleniyor...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : sortedData.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 opacity-20">
                    <History size={32} />
                    <span className="text-xs font-bold">Kayıt Bulunmuyor</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {sortedData.map((expense) => (
                  <tr
                    key={expense.id}
                    className={cn(
                      'group transition-colors border-b border-zinc-200/50 dark:border-zinc-800/50 animate-in fade-in duration-200',
                      editingId === expense.id
                        ? 'bg-primary/5'
                        : 'hover:bg-zinc-200/20 dark:hover:bg-zinc-800/20'
                    )}
                  >
                    {editingId === expense.id ? (
                      // Edit Mode
                      <>
                        <TableCell className="pl-6 py-3 align-middle">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground/50">
                              {new Date(expense.createdAt).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 align-middle">
                          <Input
                            value={editForm.description}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, description: e.target.value }))
                            }
                            placeholder="Açıklama"
                            className="h-9 font-medium bg-background/50"
                            autoFocus
                          />
                        </TableCell>
                        <TableCell className="py-3 align-middle">
                          <Input
                            value={editForm.category}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, category: e.target.value }))
                            }
                            placeholder="Kategori"
                            className="h-9 font-medium bg-background/50"
                          />
                        </TableCell>
                        <TableCell className="py-3 align-middle">
                          <div className="flex items-center gap-1 bg-background/50 rounded-md border border-input h-9 px-2">
                            {editForm.paymentMethod === 'CARD' ? (
                              <CreditCard className="w-3 h-3 text-muted-foreground" />
                            ) : (
                              <Wallet className="w-3 h-3 text-muted-foreground" />
                            )}
                            <select
                              value={editForm.paymentMethod}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  paymentMethod: e.target.value as 'CASH' | 'CARD'
                                }))
                              }
                              className="bg-transparent border-none text-sm font-medium focus:ring-0 w-full outline-none appearance-none"
                            >
                              <option value="CASH">Nakit</option>
                              <option value="CARD">Kart</option>
                            </select>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 align-middle">
                          <Input
                            type="number"
                            value={editForm.amount}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, amount: e.target.value }))
                            }
                            placeholder="0.00"
                            className="h-9 text-right font-bold bg-background/50"
                          />
                        </TableCell>
                        <TableCell className="py-3 align-middle pr-4">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                              onClick={() => saveEdit(expense.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
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
                        <TableCell className="pl-6 py-4">
                          <div className="flex flex-col leading-tight">
                            <span className="font-bold text-base text-foreground/90">
                              {new Date(expense.createdAt).toLocaleDateString('tr-TR')}
                            </span>
                            <span className="text-xs text-muted-foreground/50 font-medium">
                              {new Date(expense.createdAt).toLocaleTimeString('tr-TR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="text-sm font-bold text-foreground/80 group-hover:text-foreground transition-colors">
                            {expense.description}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          {expense.category && (
                            <span
                              className={cn(
                                'text-[13px] font-black tracking-tight',
                                getCategoryColor(expense.category)
                              )}
                            >
                              {expense.category}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          <div
                            className={cn(
                              'flex items-center gap-1.5 text-[13px] font-bold tracking-tight',
                              expense.paymentMethod === 'CARD'
                                ? 'text-purple-600'
                                : 'text-emerald-600'
                            )}
                          >
                            {expense.paymentMethod === 'CARD' ? (
                              <CreditCard className="w-3.5 h-3.5" />
                            ) : (
                              <Wallet className="w-3.5 h-3.5" />
                            )}
                            {expense.paymentMethod === 'CARD' ? 'Kart' : 'Nakit'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <span className="text-base font-black tracking-tight text-foreground">
                            {formatCurrency(expense.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-4 pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted rounded-full"
                              >
                                <span className="sr-only">Menü aç</span>
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="rounded-2xl border-2 bg-white dark:bg-zinc-950 p-1.5 shadow-2xl"
                            >
                              <DropdownMenuItem
                                onClick={() => (onEdit ? onEdit(expense) : startEdit(expense))}
                                className="rounded-lg text-xs font-bold focus:bg-muted/50 py-2 cursor-pointer"
                              >
                                <Pencil className="mr-2 h-3.5 w-3.5 opacity-70" />
                                Düzenle
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDelete(expense.id)}
                                className="rounded-lg text-xs font-bold text-rose-500 focus:text-rose-500 focus:bg-rose-500/10 py-2 cursor-pointer"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5 opacity-70" />
                                Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </>
                    )}
                  </tr>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
