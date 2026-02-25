import type { Product } from '@/lib/api'
import { soundManager } from '@/lib/sound'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from '@/store/useToastStore'
import { Plus, Star } from 'lucide-react'
import React, { memo, useCallback, useMemo } from 'react'
import { getCategoryIcon } from './order-icons'

// ============================================================================
// Types & Helpers
// ============================================================================

interface ProductCardProps {
  product: Product
  compact?: boolean
  showIcon?: boolean
  isLocked?: boolean
  onAdd?: (product: Product) => void
}

const formatProductName = (name: string): string => {
  return name.replace(/([a-zğüşöçı])([A-ZĞÜŞÖÇİ])/g, '$1 $2')
}

// ============================================================================
// Constants & Styles
// ============================================================================

const STYLES = {
  buttonBase:
    'group relative w-full text-left transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',

  // Compact (Liste) Görünümü Stilleri
  compact:
    'flex items-center gap-2.5 py-2.5 px-3.5 rounded-xl bg-card shadow-sm border border-border/10 overflow-hidden hover:bg-primary/[0.04] hover:shadow-md hover:border-primary/20 active:scale-[0.98]',
  iconBox:
    'w-10 h-10 rounded-xl bg-muted/30 shrink-0 flex items-center justify-center group-hover:bg-primary/5 transition-colors',
  plusBtn:
    'w-8 h-8 rounded-full flex items-center justify-center bg-muted/20 text-muted-foreground/60 group-hover:bg-primary/10 group-hover:text-primary transition-all shrink-0',

  // Grid (Kutu) Görünümü Stilleri
  grid: 'flex flex-col p-3.5 h-full rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 active:shadow-sm',
  favoriteBadge:
    'absolute top-3 right-3 z-10 w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 shadow-[0_4px_12px_rgba(245,158,11,0.4)] flex items-center justify-center text-white ring-4 ring-card group-hover:scale-110 transition-transform duration-300',
  gridIconArea:
    'w-full h-24 rounded-xl bg-muted/30 flex items-center justify-center group-hover:bg-primary/5 transition-all duration-500 mb-3 overflow-hidden relative border border-transparent group-hover:border-primary/10',
  priceBadge:
    'text-[14px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tighter mt-auto bg-emerald-500/10 px-2 py-0.5 rounded-lg group-hover:bg-emerald-500/20 transition-colors'
} as const

// ============================================================================
// Component
// ============================================================================

function ProductCardComponent({
  product,
  compact = false,
  showIcon = true,
  isLocked = false,
  onAdd
}: ProductCardProps): React.JSX.Element {
  const handleClick = useCallback((): void => {
    if (isLocked) {
      soundManager.playError()
      toast({
        title: 'Masa Kilitli',
        description: 'Sipariş eklemek için önce kilidi açınız.',
        variant: 'warning',
        duration: 2000
      })
      return
    }

    if (onAdd) {
      onAdd(product)
      soundManager.playClick()
    }
  }, [isLocked, onAdd, product])

  const formattedName = useMemo(() => formatProductName(product.name), [product.name])

  // --- Görünüm Render Fonksiyonları ---

  const renderCompact = (): React.JSX.Element => (
    <>
      {showIcon && (
        <div className={STYLES.iconBox}>
          {getCategoryIcon(
            product.category?.icon,
            'w-5 h-5 text-foreground/50 group-hover:text-primary transition-colors'
          )}
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
        <p className="font-bold text-[15px] line-clamp-2 text-foreground group-hover:text-primary transition-colors leading-[1.2] mb-0.5">
          {formattedName}
        </p>
        <p className="text-[12px] font-bold text-emerald-600 tabular-nums tracking-tighter">
          {formatCurrency(product.price)}
        </p>
      </div>
      <div className={STYLES.plusBtn}>
        <Plus className="w-4 h-4" />
      </div>
    </>
  )

  const renderGrid = (): React.JSX.Element => (
    <>
      {product.isFavorite && (
        <div className={STYLES.favoriteBadge}>
          <Star className="w-3.5 h-3.5 fill-current drop-shadow-md" />
        </div>
      )}

      <div className={STYLES.gridIconArea}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        {getCategoryIcon(
          product.category?.icon,
          'w-10 h-10 text-foreground/40 group-hover:text-primary/70 transition-all duration-500 group-hover:scale-110 drop-shadow-sm'
        )}
      </div>

      <div className="flex flex-col items-start gap-1.5 px-1.5 flex-1 w-full mt-1">
        <span className="font-extrabold text-[15px] leading-[1.2] pl-[1px] pr-1 text-left line-clamp-2 text-foreground/90 group-hover:text-primary transition-colors">
          {formattedName}
        </span>
        <span className={STYLES.priceBadge}>{formatCurrency(product.price)}</span>
      </div>
    </>
  )

  return (
    <button
      onClick={handleClick}
      disabled={isLocked}
      type="button"
      className={cn(
        STYLES.buttonBase,
        isLocked && 'opacity-50 cursor-not-allowed',
        compact ? STYLES.compact : STYLES.grid
      )}
    >
      {compact ? renderCompact() : renderGrid()}
    </button>
  )
}

// ============================================================================
// Memoization
// ============================================================================

export const ProductCard = memo(ProductCardComponent, (prev, next) => {
  // Manuel karşılaştırma: Referans değişse bile değerler aynıysa render etme
  return (
    prev.product.id === next.product.id &&
    prev.product.price === next.product.price &&
    prev.product.name === next.product.name &&
    prev.product.isFavorite === next.product.isFavorite &&
    prev.compact === next.compact &&
    prev.showIcon === next.showIcon &&
    prev.isLocked === next.isLocked
  )
})
