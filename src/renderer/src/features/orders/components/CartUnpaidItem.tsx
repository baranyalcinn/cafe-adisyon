// src/renderer/src/features/orders/components/CartUnpaidItem.tsx
import { QuantitySelector } from '@/components/ui/QuantitySelector'
import type { Order } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { memo } from 'react'

type OrderItem = NonNullable<Order['items']>[number]
type ProcessedItem = OrderItem & { formattedName: string }

interface CartUnpaidItemProps {
  item: ProcessedItem
  isLocked: boolean
  onUpdateQuantity: (orderItemId: string, productId: string, newQty: number) => void
}

export const CartUnpaidItem = memo(function CartUnpaidItem({
  item,
  isLocked,
  onUpdateQuantity
}: CartUnpaidItemProps) {
  return (
    <div className="relative origin-top flex items-center justify-between gap-3 p-1.5 pl-2.5 pr-3 group/item rounded-xl border border-border/10 border-l-[4px] !border-l-primary transition-all duration-300 bg-card/40 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 active:scale-[0.99] animate-in fade-in slide-in-from-right-2 duration-500">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {item.quantity > 1 && (
          <span className="shrink-0 text-[14px] font-black text-rose-500 tabular-nums">
            {item.quantity}x
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[13px] pl-0.5 text-foreground tracking-tight break-words leading-tight">
            {item.formattedName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <p className="text-[14px] font-black tabular-nums text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md whitespace-nowrap">
          {formatCurrency(item.unitPrice * item.quantity)}
        </p>
        <div className="opacity-0 group-hover/item:opacity-100 transition-opacity">
          <QuantitySelector
            quantity={item.quantity}
            onUpdate={(newQty) => onUpdateQuantity(item.id, item.productId, newQty)}
            isLocked={isLocked}
            showNumber={false}
          />
        </div>
      </div>
    </div>
  )
})
