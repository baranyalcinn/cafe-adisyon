import { cn } from '@/lib/utils'
import { Minus, Plus, Trash2 } from 'lucide-react'

interface QuantitySelectorProps {
  quantity: number
  onUpdate: (newQuantity: number) => void
  isLocked?: boolean
  className?: string
  showNumber?: boolean
}

export function QuantitySelector({
  quantity,
  onUpdate,
  isLocked,
  className,
  showNumber = true
}: QuantitySelectorProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full p-0.5 border shadow-sm transition-colors',
        isLocked
          ? 'border-border/25 bg-background/20 opacity-70'
          : 'border-white/10 bg-background/40 backdrop-blur-sm',
        className
      )}
    >
      <button
        type="button"
        disabled={isLocked}
        onClick={(e) => {
          e.stopPropagation()
          onUpdate(quantity - 1)
        }}
        className={cn(
          'h-6 w-6 flex items-center justify-center rounded-full transition-all duration-150 active:scale-95',
          isLocked
            ? 'opacity-60 cursor-not-allowed hover:bg-transparent'
            : quantity === 1
              ? 'text-red-600 dark:text-red-400 hover:bg-red-500/15 hover:text-red-500'
              : 'text-foreground/90 hover:bg-muted/80 hover:text-foreground'
        )}
        aria-label={quantity === 1 ? 'Ürünü kaldır' : 'Adedi azalt'}
        title={quantity === 1 ? 'Kaldır' : 'Azalt'}
      >
        {quantity === 1 ? (
          <Trash2 className="w-3.5 h-3.5" strokeWidth={2.8} />
        ) : (
          <Minus className="w-3.5 h-3.5" strokeWidth={3.2} />
        )}
      </button>

      {showNumber && (
        <span className="min-w-[20px] text-center font-black text-[11px] tabular-nums text-foreground select-none">
          {quantity}
        </span>
      )}

      <button
        type="button"
        disabled={isLocked}
        onClick={(e) => {
          e.stopPropagation()
          onUpdate(quantity + 1)
        }}
        className={cn(
          'h-6 w-6 flex items-center justify-center rounded-full transition-all duration-150 active:scale-95',
          isLocked
            ? 'opacity-60 cursor-not-allowed hover:bg-transparent'
            : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-500'
        )}
        aria-label="Adedi artır"
        title="Artır"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={3.2} />
      </button>
    </div>
  )
}
