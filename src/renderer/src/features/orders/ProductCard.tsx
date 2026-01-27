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
          'flex items-center gap-4 p-4 rounded-[1.25rem] bg-card/60 border border-white/5 transition-all w-full text-left group relative overflow-hidden',
          isLocked
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-primary/5 hover:border-primary/20 active:scale-[0.99] shadow-sm hover:shadow-lg'
        )}
      >
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 group-hover:rotate-6 transition-all duration-500 shadow-inner">
          {getCategoryIcon(product.category?.icon, 'w-6 h-6 text-primary')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm md:text-base truncate text-foreground/90 group-hover:text-primary transition-colors">
            {product.name.replace(/([a-z])([A-Z])/g, '$1 $2')}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1 h-1 rounded-full bg-emerald-500" />
            <p className="text-sm font-black text-emerald-600 tabular-nums">
              {formatCurrency(product.price)}
            </p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/5 group-hover:bg-primary text-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
          <Plus className="w-5 h-5 pointer-events-none" />
        </div>

        {/* Subtle Inner Glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLocked}
      className={cn(
        'group relative flex flex-col items-center p-6 rounded-[2rem] border bg-card/60 transition-all duration-500 w-full shadow-sm hover:shadow-2xl active:scale-[0.96] cursor-pointer h-full min-h-[180px] overflow-hidden',
        isLocked
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-primary/[0.02] hover:border-primary/20',
        product.isFavorite && 'border-amber-500/30 shadow-amber-500/5'
      )}
    >
      {product.isFavorite && (
        <div className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center border border-amber-500/20 backdrop-blur-md text-amber-500 shadow-sm animate-in zoom-in duration-500">
          <Star className="w-5 h-5 fill-amber-500" />
        </div>
      )}

      {/* Background Decorative Element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-colors" />

      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 relative z-10">
        <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-5 shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
          {getCategoryIcon(
            product.category?.icon,
            'w-8 h-8 text-primary transition-colors duration-300'
          )}
        </div>

        <h3 className="font-bold text-sm md:text-base text-center line-clamp-2 leading-tight w-full px-2 text-foreground/80 group-hover:text-primary transition-colors duration-300">
          {product.name.replace(/([a-z])([A-Z])/g, '$1 $2')}
        </h3>
      </div>

      {/* Price Badge */}
      <div className="mt-5 px-5 py-2 rounded-2xl bg-primary/5 border border-primary/10 transition-all duration-500 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105 shadow-sm group-hover:shadow-primary/20">
        <span className="text-sm font-black tabular-nums tracking-tight italic">
          {formatCurrency(product.price)}
        </span>
      </div>

      {/* Subtle Bottom Glow */}
      <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
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
