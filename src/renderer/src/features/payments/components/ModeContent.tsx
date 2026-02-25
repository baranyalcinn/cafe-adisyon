// src/renderer/src/features/payments/components/ModeContent.tsx
import { PremiumAmount } from '@/components/PremiumAmount'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Banknote, Minus, Plus } from 'lucide-react'
import { PaymentMode } from '../hooks/usePaymentLogic'
import { ItemRow } from './ItemRow'

interface ModeContentProps {
  mode: PaymentMode
  remainingAmount: number
  split: { n: number; share: number; idx: number; remainder: number }
  items: {
    unpaidItems: any[]
    selectedQuantities: Record<string, number>
    isAllItemsSelected: boolean
  }
  onSplitChange: (n: number) => void
  onSplitIndexChange: (idx: number) => void
  onNextSplit: () => void
  onSelectAll: () => void
  onItemQtyChange: (itemId: string, qty: number) => void
}

const SPLIT_QUICK_OPTIONS = [2, 3, 4, 5] as const

export function ModeContent({
  mode,
  split,
  items,
  onSplitChange,
  onSplitIndexChange,
  onNextSplit,
  onSelectAll,
  onItemQtyChange
}: ModeContentProps) {
  if (mode === 'full') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-6 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/5">
          <Banknote className="w-8 h-8 text-primary/70" />
        </div>
        <div className="space-y-1">
          <p className="text-[19px] font-semibold text-foreground">Hızlı Hesap Kapama</p>
          <p className="text-[14px] font-medium text-foreground/70">Tüm bakiyeye odaklanıldı</p>
        </div>
      </div>
    )
  }

  if (mode === 'split') {
    return (
      <div className="space-y-6 pt-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="bg-muted/10 rounded-2xl border border-border/10 p-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-foreground/90 px-1">Kişi Sayısı</span>
              <div className="flex items-center bg-background rounded-xl border border-border/20 p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-lg hover:bg-muted/50"
                  onClick={() => onSplitChange(Math.max(2, split.n - 1))}
                >
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <div className="w-10 text-center">
                  <span className="text-base font-bold tabular-nums">{split.n}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-lg hover:bg-muted/50"
                  onClick={() => onSplitChange(Math.min(20, split.n + 1))}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="h-10 w-[1px] bg-border/40 mt-5" />

            <div className="flex flex-col gap-1.5 flex-1">
              <span className="text-[11px] font-bold text-foreground/90 text-right px-1">
                Hızlı Seçim
              </span>
              <div className="flex items-center justify-end gap-1.5">
                {SPLIT_QUICK_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => onSplitChange(n)}
                    className={cn(
                      'w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all',
                      split.n === n
                        ? 'bg-primary text-primary-foreground shadow-md scale-105'
                        : 'text-foreground/70 bg-background border border-border/40 hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-1.5">
              {Array.from({ length: split.n }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    i === split.idx ? 'w-5 bg-primary' : 'w-1.5 bg-foreground/20'
                  )}
                />
              ))}
            </div>
            <span className="text-[11px] font-bold text-foreground/90">
              {split.idx + 1}. Kişi Payı
            </span>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-background shadow-sm p-6 flex flex-col items-center justify-center">
            <div className="mb-6">
              <PremiumAmount amount={split.share} size="3xl" color="primary" />
            </div>

            {split.remainder > 0 && split.idx < split.remainder && (
              <div className="absolute top-2 right-2">
                <div className="bg-amber-100/40 text-amber-700/80 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200/30">
                  +0.01 Yuvarlama
                </div>
              </div>
            )}

            <div className="w-full grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-11 rounded-2xl bg-background border-border/40 font-bold text-[12px] text-foreground/80 hover:bg-muted/50 transition-all"
                onClick={() => onSplitIndexChange(0)}
              >
                Sıfırla
              </Button>
              <Button
                className="h-11 rounded-2xl font-bold text-[12px] tracking-wide"
                onClick={onNextSplit}
                disabled={split.idx >= split.n - 1}
              >
                {split.idx >= split.n - 1 ? 'Bitti' : 'Sonraki Kişi'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-200 overflow-hidden">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[12px] font-bold text-foreground/80 tracking-wide">Ürün Listesi</span>
        <button
          onClick={onSelectAll}
          className={cn(
            'text-[12px] font-bold transition-colors',
            items.isAllItemsSelected
              ? 'text-foreground/60 hover:text-destructive'
              : 'text-primary hover:text-primary/80'
          )}
        >
          {items.isAllItemsSelected ? 'Tümünü İptal Et' : 'Tümünü Seç'}
        </button>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 pb-4 custom-scrollbar">
        {items.unpaidItems.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            selected={items.selectedQuantities[item.id] || 0}
            onQtyChange={onItemQtyChange}
          />
        ))}
      </div>
    </div>
  )
}
