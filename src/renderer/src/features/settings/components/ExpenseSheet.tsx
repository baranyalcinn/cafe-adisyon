import React, { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Trash2, TrendingDown, AlignLeft, Tag, Banknote } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import type { Expense } from '@shared/types'

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
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when opening or switching expense
  useEffect(() => {
    if (open) {
      if (expense) {
        // Edit Mode - amount is stored in kuruş, convert to TL for display
        setDescription(expense.description)
        setAmount((expense.amount / 100).toString())
        setCategory(expense.category || '')
        // Expense type currently doesn't have 'note', but UI could support it later
      } else {
        // Create Mode
        setDescription('')
        setAmount('')
        setCategory('')
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
        amount: parseFloat(amount),
        category: category || undefined
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
      <SheetContent className="sm:max-w-md w-full overflow-y-auto border-l bg-background/95 backdrop-blur-xl p-10">
        <SheetHeader className="mb-8 relative">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-rose-500/10 rounded-2xl shadow-inner border border-rose-500/10">
              <TrendingDown className="w-6 h-6 text-rose-500" />
            </div>
            <div className="space-y-1">
              <SheetTitle className="text-2xl font-black tracking-tight">
                {isEditMode ? 'Gider Düzenle' : 'Yeni Gider Ekle'}
              </SheetTitle>
              <SheetDescription className="text-sm font-medium opacity-70">
                {isEditMode
                  ? 'Gider detaylarını güncelleyin.'
                  : 'Yeni bir işletme gideri oluşturun.'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            {/* Amount Field */}
            <div className="space-y-3">
              <Label
                htmlFor="amount"
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1"
              >
                Tutar (₺)
              </Label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center transition-colors group-focus-within:bg-rose-500/10">
                  <Banknote className="w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-rose-500" />
                </div>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-14 h-14 text-2xl font-black bg-muted/20 border-transparent focus:border-rose-500/20 focus:ring-rose-500/20 transition-all rounded-xl"
                  autoFocus={!isEditMode}
                />
              </div>
            </div>

            {/* Description Field */}
            <div className="space-y-3">
              <Label
                htmlFor="description"
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1"
              >
                Açıklama
              </Label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center transition-colors group-focus-within:bg-primary/10">
                  <AlignLeft className="w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                </div>
                <Input
                  id="description"
                  placeholder="Örn: Market alışverişi"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="pl-14 h-14 font-bold bg-muted/20 border-transparent focus:border-primary/20 transition-all rounded-xl"
                />
              </div>
            </div>

            {/* Category Field */}
            <div className="space-y-3">
              <Label
                htmlFor="category"
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1"
              >
                Kategori
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-14 font-bold bg-muted/20 border-transparent focus:border-amber-500/20 transition-all rounded-xl pl-14 relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center transition-colors group-focus-within:bg-amber-500/10">
                    <Tag className="w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-amber-500" />
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
                <Separator className="opacity-50" />
                <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-bold uppercase tracking-wider">
                      Kayıt Tarihi
                    </span>
                    <span className="font-black px-2 py-1 bg-background rounded-md shadow-sm border">
                      {new Date(expense.createdAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-6 border-t mt-auto">
            <Button
              type="submit"
              disabled={!description || !amount || isSubmitting}
              className="w-full h-14 text-base font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 rounded-2xl gap-2 transition-all duration-300 active:scale-[0.98]"
            >
              {isSubmitting ? 'Kaydediliyor...' : isEditMode ? 'Güncelle' : 'Kaydet'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full h-12 text-sm font-bold border-muted-foreground/20 hover:bg-muted/50 rounded-xl transition-all"
            >
              İptal
            </Button>

            {isEditMode && onDelete && (
              <Button
                type="button"
                variant="ghost"
                className="w-full h-12 text-destructive hover:bg-destructive/10 hover:text-destructive font-bold rounded-xl gap-2 mt-2"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                <Trash2 className="w-4 h-4" /> Gideri Sil
              </Button>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
