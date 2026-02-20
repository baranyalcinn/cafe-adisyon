import { soundManager } from '@/lib/sound'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from '@/store/useToastStore'
import { Plus, Star } from 'lucide-react'
import React, { memo, useCallback } from 'react'
import { getCategoryIcon } from './order-icons'

import type { Product } from '@/lib/api'

interface ProductCardProps {
  product: Product
  compact?: boolean
  showIcon?: boolean
  isLocked?: boolean
  onAdd?: (product: Product) => void
}

function ProductCardComponent({
  product,
  compact = false,
  showIcon = true,
  isLocked = false,
  onAdd
}: ProductCardProps): React.JSX.Element {
  const cardRef = React.useRef<HTMLButtonElement>(null)

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

  if (compact) {
    return (
      <button
        ref={cardRef}
        onClick={handleClick}
        disabled={isLocked}
        className={cn(
          'flex items-center gap-2.5 py-2.5 px-3.5 rounded-2xl bg-card transition-all w-full text-left group relative overflow-hidden shadow-sm border border-border/10',
          isLocked
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-primary/[0.04] hover:shadow-md hover:border-primary/20 active:scale-[0.98]'
        )}
      >
        {showIcon && (
          <div className="w-10 h-10 rounded-xl bg-muted/30 shrink-0 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
            {getCategoryIcon(
              product.category?.icon,
              'w-5 h-5 text-foreground/50 group-hover:text-primary transition-colors'
            )}
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
          <p className="font-bold text-[15px] line-clamp-2 text-foreground group-hover:text-primary transition-colors leading-[1.2] mb-0.5">
            {product.name.replace(/([a-z])([A-Z])/g, '$1 $2')}
          </p>
          <p className="text-[12px] font-bold text-emerald-600 tabular-nums tracking-tighter">
            {formatCurrency(product.price)}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/20 text-muted-foreground/60 group-hover:bg-primary/10 group-hover:text-primary transition-all shrink-0">
          <Plus className="w-4 h-4" />
        </div>
      </button>
    )
  }

  return (
    <button
      ref={cardRef}
      onClick={handleClick}
      disabled={isLocked}
      className={cn(
        'group relative flex flex-col p-3.5 w-full h-full rounded-[2rem] bg-card border border-border/40 shadow-sm overflow-hidden transition-all duration-300 ease-out',
        isLocked
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 active:shadow-sm'
      )}
    >
      {product.isFavorite && (
        <div className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 shadow-[0_4px_12px_rgba(245,158,11,0.4)] flex items-center justify-center text-white ring-4 ring-card group-hover:scale-110 transition-transform duration-300">
          <Star className="w-3.5 h-3.5 fill-current drop-shadow-md" />
        </div>
      )}

      {/* Top Section - Icon Area */}
      <div className="w-full h-24 rounded-2xl bg-muted/30 flex items-center justify-center group-hover:bg-primary/5 group-hover:shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-500 mb-3 overflow-hidden relative border border-transparent group-hover:border-primary/10">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        {getCategoryIcon(
          product.category?.icon,
          'w-10 h-10 text-foreground/40 group-hover:text-primary/70 transition-all duration-500 group-hover:scale-110 drop-shadow-sm'
        )}
      </div>

      {/* Bottom Section - Content */}
      <div className="flex flex-col items-start gap-1.5 px-1.5 flex-1 w-full mt-1">
        <h3 className="font-extrabold text-[15px] leading-[1.2] pl-[1px] pr-1 text-left line-clamp-2 text-foreground/90 group-hover:text-primary transition-colors">
          {product.name.replace(/([a-zğüşöçı])([A-ZĞÜŞÖÇİ])/g, '$1 $2')}
        </h3>
        <p className="text-[14px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tighter mt-auto bg-emerald-500/10 px-2 py-0.5 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
          {formatCurrency(product.price)}
        </p>
      </div>
    </button>
  )
}

// Memoize to prevent re-renders when parent updates but product doesn't change
export const ProductCard = memo(ProductCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.name === nextProps.product.name &&
    prevProps.product.isFavorite === nextProps.product.isFavorite &&
    prevProps.compact === nextProps.compact &&
    prevProps.showIcon === nextProps.showIcon &&
    prevProps.isLocked === nextProps.isLocked
  )
})
