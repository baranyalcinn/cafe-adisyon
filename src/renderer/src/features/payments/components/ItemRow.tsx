import { Minus, Plus } from 'lucide-react'
import { memo, useCallback } from 'react'

import { type OrderItem } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface ItemRowProps {
  item: OrderItem
  selected: number
  onQtyChange: (itemId: string, qty: number) => void
}

// ============================================================================
// Constants & Styles
// ============================================================================

const STYLES = {
  rowBase: cn(
    'group relative flex w-full items-center justify-between gap-3 rounded-2xl border py-1.5 px-3.5 text-left transition-all duration-200 ease-in-out cursor-pointer',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1'
  ),
  badgeBase:
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border font-mono text-[15px] font-black transition-colors',
  stepperWrap:
    'flex items-center rounded-full border bg-background p-0.5 shadow-sm transition-opacity',
  stepBtn:
    'flex h-7 w-7 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none'
} as const

// ============================================================================
// Component
// ============================================================================

export const ItemRow = memo(function ItemRow({ item, selected, onQtyChange }: ItemRowProps) {
  const isSelected = selected > 0
  const totalLine = item.unitPrice * selected

  // Satır tıklaması ile "Artır" butonu birebir aynı işi yaptığı için tek fonksiyonda birleştirdik
  const handleInc = useCallback(() => {
    onQtyChange(item.id, Math.min(selected + 1, item.quantity))
  }, [item.id, item.quantity, selected, onQtyChange])

  const handleDec = useCallback(() => {
    onQtyChange(item.id, Math.max(selected - 1, 0))
  }, [item.id, selected, onQtyChange])

  // Klavye erişilebilirliği (Enter veya Boşluk tuşu ile seçme/artırma)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleInc()
      }
    },
    [handleInc]
  )

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleInc}
      onKeyDown={handleKeyDown}
      title={isSelected ? 'Artırmak için tekrar tıkla' : 'Seçmek için tıkla'}
      className={cn(
        STYLES.rowBase,
        isSelected
          ? 'border-primary/40 bg-primary/[0.03] shadow-sm'
          : 'border-border/40 bg-card hover:border-border hover:bg-muted/30'
      )}
    >
      {/* Sol Kısım: Ürün Bilgisi */}
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {/* Stok Rozeti */}
        <div
          aria-label={`Toplam adet: ${item.quantity}`}
          className={cn(
            STYLES.badgeBase,
            isSelected
              ? 'border-primary/50 bg-primary text-primary-foreground shadow-sm'
              : 'border-border/60 bg-muted/80 text-foreground group-hover:bg-muted'
          )}
        >
          {item.quantity}
        </div>

        <div className="flex flex-col min-w-0 justify-center">
          <span className="truncate text-[15px] font-semibold text-foreground leading-tight">
            {item.product?.name}
          </span>
          <span className="text-[11px] font-medium text-foreground/70 mt-0.5">
            {formatCurrency(item.unitPrice)} / adet
          </span>
        </div>
      </div>

      {/* Sağ Kısım: Kontroller ve Fiyat */}
      <div className="flex shrink-0 items-center gap-2.5">
        {/* Stepper Kontrolü */}
        <div
          onClick={(e) => e.stopPropagation()} // Tıklamanın satıra sıçramasını engeller
          className={cn(
            STYLES.stepperWrap,
            !isSelected &&
              'opacity-0 pointer-events-none group-hover:opacity-100 group-focus-visible:opacity-100'
          )}
        >
          <button
            type="button"
            title="Azalt"
            className={STYLES.stepBtn}
            onClick={handleDec}
            disabled={!isSelected}
          >
            <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>

          <span className="w-5 text-center font-mono text-[13px] font-bold text-foreground">
            {selected}
          </span>

          <button
            type="button"
            title="Artır"
            className={STYLES.stepBtn}
            onClick={handleInc}
            disabled={selected >= item.quantity}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Toplam Fiyat */}
        <div className="flex flex-col items-end min-w-[3.5rem] pr-3">
          <span
            className={cn(
              'font-mono text-[15px] font-bold transition-colors leading-tight',
              isSelected ? 'text-primary' : 'text-foreground/80'
            )}
          >
            {formatCurrency(totalLine)}
          </span>
          <span className="text-[9px] font-bold tracking-wider text-foreground/80 mt-0.5">
            Toplam
          </span>
        </div>
      </div>
    </div>
  )
})
