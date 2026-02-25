'use client'

import { PremiumAmount } from '@/components/PremiumAmount'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Banknote, Minus, Plus } from 'lucide-react'
import React from 'react'
import { PaymentMode } from '../hooks/usePaymentLogic'
import { ItemRow, type PaymentItem } from './ItemRow'

// ============================================================================
// Types
// ============================================================================

interface ModeContentProps {
  mode: PaymentMode
  remainingAmount: number
  split: { n: number; share: number; idx: number; remainder: number }
  items: {
    unpaidItems: PaymentItem[]
    selectedQuantities: Record<string, number>
    isAllItemsSelected: boolean
  }
  onSplitChange: (n: number) => void
  onSplitIndexChange: (idx: number) => void
  onNextSplit: () => void
  onSelectAll: () => void
  onItemQtyChange: (itemId: string, qty: number) => void
}

interface SplitModeViewProps {
  split: ModeContentProps['split']
  onSplitChange: ModeContentProps['onSplitChange']
  onSplitIndexChange: ModeContentProps['onSplitIndexChange']
  onNextSplit: ModeContentProps['onNextSplit']
}

interface ItemModeViewProps {
  items: ModeContentProps['items']
  onSelectAll: ModeContentProps['onSelectAll']
  onItemQtyChange: ModeContentProps['onItemQtyChange']
}

// ============================================================================
// Constants & Styles
// ============================================================================

const SPLIT_QUICK_OPTIONS = [2, 3, 4, 5] as const

const STYLES = {
  fullContainer:
    'h-full flex flex-col items-center justify-center text-center space-y-3 py-6 animate-in fade-in duration-200',
  fullIconBox:
    'w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/5',

  splitWrapper: 'space-y-6 pt-1 animate-in fade-in slide-in-from-bottom-2 duration-300',
  splitHeaderCard: 'bg-muted/10 rounded-2xl border border-border/10 p-4',
  counterBox: 'flex items-center bg-background rounded-xl border border-border/20 p-1',
  quickBtn:
    'w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all',

  indicatorDots: 'h-1.5 rounded-full transition-all duration-300',
  amountCard:
    'relative overflow-hidden rounded-3xl border border-border/40 bg-background shadow-sm p-6 flex flex-col items-center justify-center',
  roundingBadge:
    'bg-amber-100/40 text-amber-700/80 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200/30',

  itemListContainer: 'h-full flex flex-col animate-in fade-in duration-200 overflow-hidden',
  listHeader: 'flex items-center justify-between mb-2 px-1',
  scrollArea: 'flex-1 space-y-1.5 overflow-y-auto pr-1 pb-4 custom-scrollbar',
  sectionTitle: 'text-[12px] font-black text-foreground/80 tracking-widest uppercase'
} as const

// ============================================================================
// Internal Sub-Components
// ============================================================================

/** TAM ÖDEME GÖRÜNÜMÜ */
const FullModeView = (): React.JSX.Element => (
  <div className={STYLES.fullContainer}>
    <div className={STYLES.fullIconBox}>
      <Banknote className="w-8 h-8 text-primary/70" />
    </div>
    <div className="space-y-1">
      <p className="text-[19px] font-bold text-foreground">Hızlı Hesap Kapama</p>
      <p className="text-[14px] font-medium text-muted-foreground">Tüm bakiyeye odaklanıldı</p>
    </div>
  </div>
)

/** EŞİT BÖLME GÖRÜNÜMÜ */
const SplitModeView = ({
  split,
  onSplitChange,
  onSplitIndexChange,
  onNextSplit
}: SplitModeViewProps): React.JSX.Element => (
  <div className={STYLES.splitWrapper}>
    {/* Kişi Sayısı & Hızlı Seçim */}
    <div className={STYLES.splitHeaderCard}>
      <div className="flex items-center justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest px-1">
            Kişi Sayısı
          </span>
          <div className={STYLES.counterBox}>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-lg"
              onClick={() => onSplitChange(Math.max(2, split.n - 1))}
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <div className="w-10 text-center">
              <span className="text-base font-black tabular-nums">{split.n}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-lg"
              onClick={() => onSplitChange(Math.min(20, split.n + 1))}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="h-10 w-[1px] bg-border/40 mt-5" />

        <div className="flex flex-col gap-1.5 flex-1">
          <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest text-right px-1">
            Hızlı Seçim
          </span>
          <div className="flex items-center justify-end gap-1.5">
            {SPLIT_QUICK_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => onSplitChange(n)}
                className={cn(
                  STYLES.quickBtn,
                  split.n === n
                    ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                    : 'bg-background border border-border/40 text-muted-foreground hover:text-foreground'
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Ödenecek Pay Bilgisi */}
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: split.n }).map((_, i) => (
            <div
              key={i}
              className={cn(
                STYLES.indicatorDots,
                i === split.idx ? 'w-5 bg-primary' : 'w-1.5 bg-foreground/20'
              )}
            />
          ))}
        </div>
        <span className="text-[11px] font-black text-foreground tracking-widest uppercase">
          {split.idx + 1}. Kişi Payı
        </span>
      </div>

      <div className={STYLES.amountCard}>
        <div className="mb-6">
          <PremiumAmount amount={split.share} size="3xl" color="primary" />
        </div>

        {split.remainder > 0 && split.idx < split.remainder && (
          <div className="absolute top-2 right-2">
            <div className={STYLES.roundingBadge}>+0.01 Yuvarlama</div>
          </div>
        )}

        <div className="w-full grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-11 rounded-2xl font-bold text-[12px]"
            onClick={() => onSplitIndexChange(0)}
          >
            Sıfırla
          </Button>
          <Button
            className="h-11 rounded-2xl font-black text-[12px] tracking-widest uppercase"
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

/** ÜRÜN SEÇİM GÖRÜNÜMÜ */
const ItemModeView = ({
  items,
  onSelectAll,
  onItemQtyChange
}: ItemModeViewProps): React.JSX.Element => (
  <div className={STYLES.itemListContainer}>
    <div className={STYLES.listHeader}>
      <span className={STYLES.sectionTitle}>Ürün Listesi</span>
      <button
        onClick={onSelectAll}
        className={cn(
          'text-[12px] font-black uppercase tracking-widest transition-colors',
          items.isAllItemsSelected
            ? 'text-destructive hover:text-destructive/80'
            : 'text-primary hover:text-primary/80'
        )}
      >
        {items.isAllItemsSelected ? 'İptal Et' : 'Tümünü Seç'}
      </button>
    </div>

    <div className={STYLES.scrollArea}>
      {items.unpaidItems.map((item: PaymentItem) => (
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

// ============================================================================
// Main Export Component
// ============================================================================

export function ModeContent({
  mode,
  split,
  items,
  onSplitChange,
  onSplitIndexChange,
  onNextSplit,
  onSelectAll,
  onItemQtyChange
}: ModeContentProps): React.JSX.Element {
  if (mode === 'full') return <FullModeView />

  if (mode === 'split') {
    return (
      <SplitModeView
        split={split}
        onSplitChange={onSplitChange}
        onSplitIndexChange={onSplitIndexChange}
        onNextSplit={onNextSplit}
      />
    )
  }

  // Default: Item-based selection mode
  return <ItemModeView items={items} onSelectAll={onSelectAll} onItemQtyChange={onItemQtyChange} />
}
