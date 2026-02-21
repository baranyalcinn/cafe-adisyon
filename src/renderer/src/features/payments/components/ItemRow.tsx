import { Minus, Plus } from 'lucide-react'
import { memo, useCallback } from 'react'

import { type OrderItem } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'

interface ItemRowProps {
  item: OrderItem
  selected: number
  onQtyChange: (itemId: string, qty: number) => void
}

export const ItemRow = memo(function ItemRow({ item, selected, onQtyChange }: ItemRowProps) {
  const totalLine = item.unitPrice * selected

  const inc = useCallback(
    () => onQtyChange(item.id, Math.min(selected + 1, item.quantity)),
    [item.id, item.quantity, selected, onQtyChange]
  )

  const dec = useCallback(
    () => onQtyChange(item.id, Math.max(selected - 1, 0)),
    [item.id, selected, onQtyChange]
  )

  const handleRowClick = useCallback(() => {
    if (selected <= 0) onQtyChange(item.id, 1)
    else onQtyChange(item.id, Math.min(selected + 1, item.quantity))
  }, [item.id, item.quantity, selected, onQtyChange])

  return (
    <button
      key={item.id}
      type="button"
      onClick={handleRowClick}
      className={cn(
        'w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        selected > 0
          ? 'bg-primary/[0.05] border-primary/25 shadow-sm'
          : 'bg-muted/10 border-transparent hover:border-border/15 hover:bg-muted/15'
      )}
      title={selected <= 0 ? 'Seçmek için tıkla' : 'Artırmak için tekrar tıkla'}
    >
      {/* Left */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {/* Quantity badge */}
          <div
            className={cn(
              'shrink-0 h-7 min-w-[28px] px-2 rounded-lg flex items-center justify-center',
              'text-[12px] font-black tabular-nums border',
              selected > 0
                ? 'bg-primary text-white border-primary/30 shadow-sm'
                : 'bg-background text-foreground/70 border-border/25'
            )}
            aria-label={`Adet: ${item.quantity}`}
          >
            {item.quantity}
          </div>

          <div className="min-w-0">
            <div className="text-[14px] font-bold text-foreground/90 truncate">
              {item.product?.name}
            </div>

            <div className="text-[10px] font-black text-muted-foreground/55 uppercase tracking-widest">
              {selected > 0 ? `${selected} seçildi` : 'Tıkla: seç / artır'}
            </div>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div
        className="flex items-center bg-background border border-border/20 rounded-xl overflow-hidden shadow-sm shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="w-10 h-10 flex items-center justify-center hover:bg-muted active:bg-muted/80 text-foreground/70 transition-colors disabled:opacity-40"
          onClick={dec}
          disabled={selected <= 0}
          title="Azalt"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <div className="w-10 text-center text-[12px] font-black tabular-nums">{selected}</div>

        <button
          type="button"
          className="w-10 h-10 flex items-center justify-center hover:bg-muted active:bg-muted/80 text-foreground/70 transition-colors disabled:opacity-40"
          onClick={inc}
          disabled={selected >= item.quantity}
          title="Artır"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right */}
      <div className="text-right shrink-0">
        <div className="text-[14px] font-black tabular-nums text-foreground/85 min-w-[84px]">
          {formatCurrency(totalLine)}
        </div>
        <div className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">
          Toplam
        </div>
      </div>
    </button>
  )
})
