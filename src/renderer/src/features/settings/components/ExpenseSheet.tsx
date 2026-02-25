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
import type { Expense } from '@shared/types'
import { toCents, toLira } from '@shared/utils/currency'
import { AlignLeft, Banknote, CreditCard, Tag, Trash2, TrendingDown } from 'lucide-react'
import React, { useEffect, useState } from 'react'

interface ExpenseSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: Expense | null
  onSubmit: (data: Partial<Expense>) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

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

  // Reset form when opening or switching expense
  useEffect(() => {
    if (open) {
      if (expense) {
        // Edit Mode - amount is stored in kuruş, convert to TL for display
        setDescription(expense.description)
        setAmount(toLira(expense.amount).toString())
        setCategory(expense.category || '')
        setPaymentMethod(expense.paymentMethod || 'CASH')
        // Expense type currently doesn't have 'note', but UI could support it later
      } else {
        // Create Mode
        setDescription('')
        setAmount('')
        setCategory('')
        setPaymentMethod('CASH')
      }
    }
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
      // Toast would go here
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

  const isEditMode = !!expense

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto border-l bg-background/95 backdrop-blur-xl p-6">
        <SheetHeader className="mb-6 relative">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-rose-500/10 rounded-xl shadow-inner border border-rose-500/10">
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
              <label
                htmlFor="amount"
                className="text-[11px] font-black tracking-widest text-muted-foreground/60 ml-1"
              >
                Tutar (₺)
              </label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center transition-colors group-focus-within:bg-rose-500/10">
                  <Banknote className="w-3.5 h-3.5 text-muted-foreground transition-colors group-focus-within:text-rose-500" />
                </div>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0 ₺"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-12 h-12 text-xl font-black bg-muted/20 border-transparent focus:border-rose-500/20 focus:ring-rose-500/20 transition-all rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus={!isEditMode}
                />
              </div>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <label
                htmlFor="description"
                className="text-[11px] font-black tracking-widest text-muted-foreground/60 ml-1"
              >
                Açıklama
              </label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center transition-colors group-focus-within:bg-primary/10">
                  <AlignLeft className="w-3.5 h-3.5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                </div>
                <Input
                  id="description"
                  placeholder="Örn: Market alışverişi"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="pl-12 h-12 font-bold bg-muted/20 border-transparent focus:border-primary/20 transition-all rounded-lg"
                />
              </div>
            </div>

            {/* Payment Method Field */}
            <div className="space-y-2">
              <label
                htmlFor="paymentMethod"
                className="text-[11px] font-black tracking-widest text-muted-foreground/60 ml-1"
              >
                Ödeme Türü
              </label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as 'CASH' | 'CARD')}
              >
                <SelectTrigger className="h-12 font-bold bg-muted/20 border-transparent focus:border-blue-500/20 transition-all rounded-lg pl-12 relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center transition-colors group-focus-within:bg-blue-500/10">
                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground transition-colors group-focus-within:text-blue-500" />
                  </div>
                  <SelectValue placeholder="Ödeme Türü Seçin" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-md">
                  <SelectItem value="CASH" className="rounded-lg">
                    Nakit
                  </SelectItem>
                  <SelectItem value="CARD" className="rounded-lg">
                    Kart
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Field */}
            <div className="space-y-2">
              <label
                htmlFor="category"
                className="text-[11px] font-black tracking-widest text-muted-foreground/60 ml-1"
              >
                Kategori
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-12 font-bold bg-muted/20 border-transparent focus:border-amber-500/20 transition-all rounded-lg pl-12 relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center transition-colors group-focus-within:bg-amber-500/10">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground transition-colors group-focus-within:text-amber-500" />
                  </div>
                  <SelectValue placeholder="Kategori Seçin" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-md">
                  <SelectItem value="Mutfak" className="rounded-lg">
                    Mutfak
                  </SelectItem>
                  <SelectItem value="Fatura" className="rounded-lg">
                    Fatura
                  </SelectItem>
                  <SelectItem value="Personel" className="rounded-lg">
                    Personel
                  </SelectItem>
                  <SelectItem value="Temizlik" className="rounded-lg">
                    Temizlik
                  </SelectItem>
                  <SelectItem value="Diğer" className="rounded-lg">
                    Diğer
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isEditMode && (
              <>
                <Separator className="opacity-50 my-2" />
                <div className="bg-muted/30 p-3 rounded-xl border border-border/50 space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-muted-foreground font-bold tracking-widest text-[11px]">
                      Kayıt Tarihi
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold px-1.5 py-0.5 bg-background rounded shadow-sm border text-[10px]">
                        {new Date(expense.createdAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                      <div className="text-[10px] font-bold text-muted-foreground tracking-wider opacity-70">
                        {new Date(expense.createdAt).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t mt-auto">
            <Button
              type="submit"
              disabled={!description || !amount || isSubmitting}
              className="w-full h-12 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 rounded-xl gap-2 transition-all duration-300 active:scale-[0.98]"
            >
              {isSubmitting ? 'Kaydediliyor...' : isEditMode ? 'Güncelle' : 'Kaydet'}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="w-full h-10 text-xs font-bold border-muted-foreground/20 hover:bg-muted/50 rounded-lg transition-all"
              >
                İptal
              </Button>

              {isEditMode && onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-10 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive font-bold rounded-lg gap-2"
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
