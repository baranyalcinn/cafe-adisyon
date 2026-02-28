import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { Expense } from '@shared/types'
import { toCents, toLira } from '@shared/utils/currency'
import { AlignLeft, Banknote, CreditCard, Tag, Trash2, TrendingDown } from 'lucide-react'
import React, { useEffect, useState } from 'react'

// ============================================================================
// Types
// ============================================================================

interface ExpenseSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: Expense | null
  onSubmit: (data: Partial<Expense>) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

// ============================================================================
// Constants & Styles
// ============================================================================

const STYLES = {
  sheetContent: 'sm:max-w-md w-full overflow-y-auto border-l bg-background/95 backdrop-blur-xl p-6',
  iconBox: 'p-2.5 bg-rose-500/10 rounded-xl shadow-inner border border-rose-500/10',
  label: 'text-[11px] font-black tracking-widest text-muted-foreground/60 ml-1',
  inputWrap: 'relative group',
  iconWrapBase:
    'absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center transition-colors',
  inputBase:
    'relative pl-12 h-12 font-bold bg-muted/20 border-transparent transition-all rounded-lg w-full',
  amountInput:
    'text-xl font-black focus:border-rose-500/20 focus:ring-rose-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
  submitBtn:
    'w-full h-12 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 rounded-xl gap-2 transition-all duration-300 active:scale-[0.98]',
  cancelBtn:
    'w-full h-10 text-xs font-bold border-muted-foreground/20 hover:bg-muted/50 rounded-lg transition-all',
  deleteBtn:
    'w-full h-10 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive font-bold rounded-lg gap-2'
} as const

// ============================================================================
// Sub-Components
// ============================================================================

function ExpenseDateInfo({ date }: { date: Date | string }): React.JSX.Element {
  const d = new Date(date)
  return (
    <>
      <Separator className="opacity-50 my-2" />
      <div className="bg-muted/30 p-3 rounded-xl border border-border/50 space-y-1">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-muted-foreground font-bold tracking-widest text-[11px]">
            Kayıt Tarihi
          </span>
          <div className="flex items-center gap-2">
            <span className="font-bold px-1.5 py-0.5 bg-background rounded shadow-sm border text-[10px]">
              {d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <div className="text-[10px] font-bold text-muted-foreground tracking-wider opacity-70">
              {d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ExpenseSheet({
  open,
  onOpenChange,
  expense,
  onSubmit,
  onDelete
}: ExpenseSheetProps): React.JSX.Element {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditMode = !!expense

  // State Initialization (DRY & Nullish Coalescing)
  useEffect(() => {
    if (!open) return
    setDescription(expense?.description ?? '')
    setAmount(expense ? toLira(expense.amount).toString() : '')
    setCategory(expense?.category ?? '')
    setPaymentMethod(expense?.paymentMethod ?? 'CASH')
  }, [open, expense])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!description || !amount) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        description,
        amount: toCents(amount),
        category: category || undefined,
        paymentMethod
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Submit failed', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!expense || !onDelete) return
    if (!confirm('Bu gideri silmek istediğinize emin misiniz?')) return

    setIsSubmitting(true)
    try {
      await onDelete(expense.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Delete failed', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={STYLES.sheetContent}>
        <SheetHeader className="mb-6 relative">
          <div className="flex items-center gap-3 mb-1">
            <div className={STYLES.iconBox}>
              <TrendingDown className="w-5 h-5 text-rose-500" />
            </div>
            <div className="space-y-0.5">
              <SheetTitle className="text-xl font-black tracking-tight">
                {isEditMode ? 'Gider Düzenle' : 'Yeni Gider Ekle'}
              </SheetTitle>
              <SheetDescription className="text-xs font-medium opacity-70">
                {isEditMode
                  ? 'Gider detaylarını güncelleyin.'
                  : 'Yeni bir işletme gideri oluşturun.'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            {/* Amount Field */}
            <div className="space-y-2">
              <label htmlFor="amount" className={STYLES.label}>
                Tutar (₺)
              </label>
              <div className={STYLES.inputWrap}>
                <div
                  className={cn(
                    STYLES.iconWrapBase,
                    'bg-muted/50 group-focus-within:bg-rose-500/10'
                  )}
                >
                  <Banknote className="w-3.5 h-3.5 text-muted-foreground group-focus-within:text-rose-500 transition-colors" />
                </div>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0 ₺"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus={!isEditMode}
                  className={cn(STYLES.inputBase, STYLES.amountInput, 'pl-12')}
                />
              </div>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <label htmlFor="description" className={STYLES.label}>
                Açıklama
              </label>
              <div className={STYLES.inputWrap}>
                <div
                  className={cn(
                    STYLES.iconWrapBase,
                    'bg-muted/50 group-focus-within:bg-primary/10'
                  )}
                >
                  <AlignLeft className="w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <Input
                  id="description"
                  placeholder="Örn: Market alışverişi"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={cn(STYLES.inputBase, 'focus:border-primary/20')}
                />
              </div>
            </div>

            {/* Payment Method Field */}
            <div className="space-y-2">
              <label htmlFor="paymentMethod" className={STYLES.label}>
                Ödeme Türü
              </label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as 'CASH' | 'CARD')}
              >
                <SelectTrigger
                  className={cn(
                    STYLES.inputBase,
                    'group transition-all duration-300 [&>span_svg]:hidden',
                    paymentMethod === 'CASH'
                      ? 'focus:border-emerald-500/20'
                      : 'focus:border-blue-500/20'
                  )}
                >
                  <div
                    className={cn(
                      STYLES.iconWrapBase,
                      'bg-muted/50 transition-colors duration-300',
                      paymentMethod === 'CASH'
                        ? 'group-focus-within:bg-emerald-500/10'
                        : 'group-focus-within:bg-blue-500/10'
                    )}
                  >
                    {paymentMethod === 'CASH' ? (
                      <Banknote className="w-3.5 h-3.5 text-emerald-500 transition-all animate-in zoom-in-50 duration-300" />
                    ) : (
                      <CreditCard className="w-3.5 h-3.5 text-blue-500 transition-all animate-in zoom-in-50 duration-300" />
                    )}
                  </div>
                  <SelectValue placeholder="Ödeme Türü Seçin" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-md">
                  <SelectItem value="CASH" className="rounded-lg group/item">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-3.5 h-3.5 text-emerald-500 opacity-50 group-hover/item:opacity-100 transition-opacity" />
                      Nakit
                    </div>
                  </SelectItem>
                  <SelectItem value="CARD" className="rounded-lg group/item">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-blue-500 opacity-50 group-hover/item:opacity-100 transition-opacity" />
                      Kart
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Field */}
            <div className="space-y-2">
              <label htmlFor="category" className={STYLES.label}>
                Kategori
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className={cn(STYLES.inputBase, 'focus:border-amber-500/20 group')}>
                  <div
                    className={cn(
                      STYLES.iconWrapBase,
                      'bg-muted/50 group-focus-within:bg-amber-500/10'
                    )}
                  >
                    <Tag className="w-3.5 h-3.5 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
                  </div>
                  <SelectValue placeholder="Kategori Seçin" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-md">
                  {['Mutfak', 'Fatura', 'Personel', 'Temizlik', 'Diğer'].map((cat) => (
                    <SelectItem key={cat} value={cat} className="rounded-lg">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Info Block (Edit Mode Only) */}
            {isEditMode && expense && <ExpenseDateInfo date={expense.createdAt} />}
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t mt-auto">
            <Button
              type="submit"
              disabled={!description || !amount || isSubmitting}
              className={STYLES.submitBtn}
            >
              {isSubmitting ? 'Kaydediliyor...' : isEditMode ? 'Güncelle' : 'Kaydet'}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className={STYLES.cancelBtn}
              >
                İptal
              </Button>

              {isEditMode && onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  className={STYLES.deleteBtn}
                  onClick={handleDelete}
                  disabled={isSubmitting}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Sil
                </Button>
              )}
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
