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
        'group relative flex flex-col p-4 w-full h-full rounded-[1.75rem] bg-card border border-border/10 shadow-sm overflow-hidden transition-all duration-300',
        isLocked
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:border-primary/20 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
      )}
    >
      {product.isFavorite && (
        <div className="absolute top-4 right-4 z-10 w-6 h-6 rounded-full bg-amber-500 shadow-lg shadow-amber-500/20 flex items-center justify-center text-white ring-4 ring-card">
          <Star className="w-3 h-3 fill-current" />
        </div>
      )}

      {/* Top Section - Icon Area */}
      <div className="w-full h-24 rounded-[1.25rem] bg-muted/20 flex items-center justify-center group-hover:bg-primary/5 transition-colors duration-500 mb-3 overflow-hidden relative border border-transparent group-hover:border-primary/10">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        {getCategoryIcon(
          product.category?.icon,
          'w-10 h-10 text-foreground/35 group-hover:text-primary/50 transition-all duration-500 group-hover:scale-110'
        )}
      </div>

      {/* Bottom Section - Content */}
      <div className="flex flex-col items-start gap-1 px-1 flex-1 w-full">
        <h3 className="font-bold text-[16px] leading-tight text-left line-clamp-2 text-foreground group-hover:text-primary transition-colors">
          {product.name.replace(/([a-z])([A-Z])/g, '$1 $2')}
        </h3>
        <p className="text-[15px] font-bold text-emerald-600 tabular-nums tracking-tighter mt-auto">
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
