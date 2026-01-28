import { Plus, Minus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuantitySelectorProps {
  quantity: number
  onUpdate: (newQuantity: number) => void
  isLocked?: boolean
  className?: string
}

export function QuantitySelector({
  quantity,
  onUpdate,
  isLocked,
  className
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
          'h-6 w-6 flex items-center justify-center rounded-full transition-all duration-200 active:scale-90',
          quantity === 1
            ? 'hover:bg-destructive/20 text-destructive/60 hover:text-destructive'
            : 'hover:bg-muted text-foreground/40 hover:text-foreground'
        )}
      >
        {quantity === 1 ? (
          <Trash2 className="w-3 h-3" />
        ) : (
          <Minus className="w-3 h-3" />
        )}
      </button>

      <span className="w-5 text-center font-black text-[10px] tabular-nums text-foreground/90 select-none">
        {quantity}
      </span>

      <button
        type="button"
        disabled={isLocked}
        onClick={(e) => {
          e.stopPropagation()
          onUpdate(quantity + 1)
        }}
        className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-success/20 text-success/60 hover:text-success transition-all duration-200 active:scale-90"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  )
}
