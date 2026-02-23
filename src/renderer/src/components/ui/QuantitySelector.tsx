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
        'flex items-center gap-0.5 bg-background/40 backdrop-blur-sm rounded-full p-0.5 border border-white/10 shadow-sm transition-all duration-300',
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
          'h-6 w-6 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95',
          quantity === 1
            ? 'hover:bg-red-500/20 text-red-600 dark:text-red-400 hover:text-red-500'
            : 'hover:bg-muted text-foreground/90 hover:text-foreground'
        )}
      >
        {quantity === 1 ? (
          <Trash2 className="w-3.5 h-3.5" strokeWidth={3} />
        ) : (
          <Minus className="w-3.5 h-3.5" strokeWidth={3.5} />
        )}
      </button>

      {showNumber && (
        <span className="w-5 text-center font-black text-[11px] tabular-nums text-foreground select-none">
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
        className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-all duration-200 active:scale-90"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={3.5} />
      </button>
    </div>
  )
}
