import React, { memo, useCallback } from 'react'
import { Plus, Star } from 'lucide-react'
import { getCategoryIcon } from './order-icons'
import { cn, formatCurrency } from '@/lib/utils'
import { useOrderStore } from '@/store/useOrderStore'
import { toast } from '@/store/useToastStore'
import { soundManager } from '@/lib/sound'
import type { Product } from '@/lib/api'

interface ProductCardProps {
  product: Product
  compact?: boolean
}

function ProductCardComponent({ product, compact = false }: ProductCardProps): React.JSX.Element {
  const { addItemToOrder, isLocked } = useOrderStore()

  const handleClick = useCallback(async (): Promise<void> => {
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
    await addItemToOrder(product.id, 1, product.price)
    soundManager.playClick()
  }, [isLocked, addItemToOrder, product.id, product.price])

  if (compact) {
    return (
      <button
        onClick={handleClick}
        disabled={isLocked}
        className={cn(
          'flex items-center gap-3 p-3 rounded-2xl bg-card border border-white/5 transition-all w-full text-left group',
          isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent/10 active:scale-[0.99]'
        )}
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
          {getCategoryIcon(product.category?.icon)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate uppercase tracking-tight">{product.name}</p>
          <p className="text-xs text-primary font-black tabular-nums">
            {formatCurrency(product.price)}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/5 group-hover:bg-primary text-primary group-hover:text-primary-foreground transition-all">
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
        'group relative flex flex-col items-center p-6 rounded-2xl border bg-card transition-all duration-200 w-full hover:shadow-md active:scale-[0.98] cursor-pointer h-full min-h-[160px] overflow-hidden',
        isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent/5',
        product.isFavorite && 'border-amber-500/20'
      )}
    >
      {product.isFavorite && (
        <div className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 backdrop-blur-sm text-amber-500">
          <Star className="w-4 h-4 fill-amber-500" />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-primary/10">
          {/* Bigger icon in card center */}
          {getCategoryIcon(product.category?.icon, 'w-7 h-7 transition-colors duration-300')}
        </div>

        <h3 className="font-bold text-xs md:text-sm text-center line-clamp-2 leading-tight uppercase tracking-tight w-full px-2 text-foreground group-hover:text-primary transition-colors">
          {product.name}
        </h3>
      </div>

      {/* Price Badge */}
      <div className="mt-4 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/10 transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
        <span className="text-sm font-bold tabular-nums">{formatCurrency(product.price)}</span>
      </div>

      {/* Decorative Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
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
    prevProps.compact === nextProps.compact
  )
})
