import React, { memo, useCallback } from 'react'
import { Plus, Star } from 'lucide-react'
import { getCategoryIcon } from './order-icons'
import { cn, formatCurrency } from '@/lib/utils'
import { soundManager } from '@/lib/sound'
import { toast } from '@/store/useToastStore'
import type { Product } from '@/lib/api'

interface ProductCardProps {
  product: Product
  compact?: boolean
  isLocked?: boolean
  onAdd?: (product: Product) => void
}

function ProductCardComponent({
  product,
  compact = false,
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

  if (compact) {
    return (
      <button
        onClick={handleClick}
        disabled={isLocked}
        className={cn(
          'flex items-center gap-3 py-2.5 px-3 rounded-2xl bg-card transition-all w-full text-left group relative overflow-hidden shadow-sm border border-border/5',
          isLocked
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-primary/[0.02] hover:shadow-md hover:border-primary/10 active:scale-[0.98]'
        )}
      >
        <div className="w-12 h-12 rounded-xl bg-muted/40 shrink-0 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
          {getCategoryIcon(product.category?.icon, 'w-6 h-6 text-foreground/40 group-hover:text-primary transition-colors')}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <p className="font-bold text-[13px] line-clamp-1 text-foreground/90 group-hover:text-primary transition-colors leading-tight">
            {product.name.replace(/([a-z])([A-Z])/g, '$1 $2')}
          </p>
          <p className="text-[12px] font-black text-emerald-600 tabular-nums">
            {formatCurrency(product.price)}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground/30 group-hover:text-primary transition-all shrink-0">
          <Plus className="w-4 h-4" />
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLocked}
      className={cn(
        'group relative flex flex-col p-3 rounded-[1.75rem] bg-card w-full shadow-soft border border-border/5 hover:shadow-premium hover:-translate-y-1 active:scale-95 cursor-pointer transition-all duration-300',
        isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/20'
      )}
    >
      {product.isFavorite && (
        <div className="absolute top-4 right-4 z-10 w-6 h-6 rounded-full bg-amber-500 shadow-lg shadow-amber-500/20 flex items-center justify-center text-white ring-4 ring-card">
          <Star className="w-3 h-3 fill-current" />
        </div>
      )}

      {/* Top Section - Icon/Image Area */}
      <div className="w-full h-24 rounded-[1.25rem] bg-muted/30 flex items-center justify-center group-hover:bg-primary/5 transition-colors duration-500 mb-2 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        {getCategoryIcon(
          product.category?.icon,
          'w-8 h-8 text-foreground/20 group-hover:text-primary/40 transition-all duration-500 group-hover:scale-110'
        )}
      </div>

      {/* Bottom Section - Content */}
      <div className="flex flex-col items-start gap-1 px-1 min-h-[3.4rem]">
        <h3 className="font-bold text-[14px] leading-tight text-left line-clamp-2 text-foreground/90 group-hover:text-primary transition-colors">
          {product.name.replace(/([a-z])([A-Z])/g, '$1 $2')}
        </h3>
        <p className="text-[15px] font-black text-emerald-600 tabular-nums tracking-tight mt-auto">
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
    prevProps.isLocked === nextProps.isLocked // Added isLocked check
    // onAdd function reference might change, but typically we want to avoid re-render if logic hasn't changed.
    // However, if we pass a new anonymous function every time, this memo breaks.
    // Parent should use useCallback for onAdd.
  )
})
