import { memo, useCallback } from 'react'
import { Plus, Star, Coffee, IceCream, Cookie, Utensils, Wine, Cake, Sandwich } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useOrderStore } from '@/store/useOrderStore'
import { toast } from '@/store/useToastStore'
import { soundManager } from '@/lib/sound'
import type { Product } from '@/lib/api'

interface ProductCardProps {
  product: Product
  compact?: boolean
}

// Get lucide icon component from icon name with colors
function getCategoryIcon(iconName?: string): React.ReactNode {
  switch (iconName) {
    case 'coffee':
      return <Coffee className="w-5 h-5 text-amber-600" />
    case 'ice-cream-cone':
      return <IceCream className="w-5 h-5 text-cyan-400" />
    case 'cookie':
      return <Cookie className="w-5 h-5 text-yellow-500" />
    case 'wine':
      return <Wine className="w-5 h-5 text-rose-500" />
    case 'cake':
      return <Cake className="w-5 h-5 text-pink-400" />
    case 'sandwich':
      return <Sandwich className="w-5 h-5 text-orange-400" />
    case 'utensils':
    default:
      return <Utensils className="w-5 h-5 text-emerald-500" />
  }
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
          'flex items-center gap-3 p-3 rounded-lg bg-card border transition-colors w-full text-left',
          isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent'
        )}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{product.name}</p>
          <p className="text-sm text-primary font-semibold tabular-nums">
            {formatCurrency(product.price)}
          </p>
        </div>
        <Plus className="w-4 h-4 text-muted-foreground" />
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLocked}
      className={cn(
        'group relative flex flex-col items-center p-4 rounded-xl border bg-card transition-all duration-200 w-full hover:shadow-lg hover:scale-[1.02] cursor-pointer h-full min-h-[150px]',
        isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent/50'
      )}
    >
      {product.isFavorite && (
        <Star className="absolute top-2 right-2 w-4 h-4 text-yellow-500 fill-yellow-500" />
      )}

      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2 flex-shrink-0">
          {getCategoryIcon(product.category?.icon)}
        </div>

        <h3 className="font-medium text-sm text-center line-clamp-2 leading-tight w-full px-1">
          {product.name}
        </h3>
      </div>

      <span className="text-base font-bold text-primary mt-2 tabular-nums">
        {formatCurrency(product.price)}
      </span>

      <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
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
