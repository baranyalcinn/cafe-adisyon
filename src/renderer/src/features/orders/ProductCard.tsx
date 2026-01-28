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
          'flex items-center gap-3 p-3 rounded-2xl bg-card border border-white/5 transition-all w-full text-left group relative overflow-hidden',
          isLocked
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-primary/[0.03] hover:border-primary/20 active:scale-[0.98] shadow-sm'
        )}
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-inner">
          {getCategoryIcon(product.category?.icon, 'w-5 h-5 text-primary')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] line-clamp-2 text-foreground/90 group-hover:text-primary transition-colors leading-tight mb-0.5">
            {product.name.replace(/([a-z])([A-Z])/g, '$1 $2')}
          </p>
          <div className="px-2.5 py-1 rounded-lg bg-success/[0.08] border border-success/10 group-hover:bg-success/15 group-hover:border-success/20 transition-all w-fit">
            <p className="text-xs font-black text-success tabular-nums tracking-tight">
              {formatCurrency(product.price)}
            </p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
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
        'group relative flex items-center gap-4 p-4 rounded-3xl border bg-card w-full shadow-sm hover:shadow-xl active:scale-95 cursor-pointer transition-all duration-300',
        isLocked
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-primary/[0.01] hover:border-primary/30',
        product.isFavorite && 'border-amber-500/40'
      )}
    >
      {product.isFavorite && (
        <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500">
          <Star className="w-3 h-3 fill-amber-500" />
        </div>
      )}

      {/* Modern Gradient Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Left side - Icon */}
      <div className="relative z-10 shrink-0">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 shadow-inner">
          {getCategoryIcon(product.category?.icon, 'w-7 h-7 text-primary')}
        </div>
      </div>

      {/* Right side - Content */}
      <div className="relative z-10 flex-1 flex flex-col items-start min-w-0 py-1">
        <h3
          className={cn(
            'font-bold text-sm leading-tight text-left line-clamp-2 w-full text-foreground/90 group-hover:text-primary transition-colors mb-2',
            product.isFavorite && 'pr-6'
          )}
        >
          {product.name.replace(/([a-z])([A-Z])/g, '$1 $2')}
        </h3>

        <div className="px-3 py-1 rounded-xl bg-success/[0.08] border border-success/10 shadow-sm backdrop-blur-md group-hover:bg-success/20 group-hover:border-success/30 transition-all duration-500">
          <span className="text-[13px] font-black text-success tabular-nums tracking-tighter drop-shadow-[0_0_8px_rgba(16,185,129,0.1)]">
            {formatCurrency(product.price)}
          </span>
        </div>
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
