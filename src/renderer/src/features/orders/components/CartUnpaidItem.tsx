import { QuantitySelector } from '@/components/ui/QuantitySelector'
import type { Order } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'
import { memo, useMemo } from 'react'

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
}: CartUnpaidItemProps): React.JSX.Element {
  const unitPrice = item.unitPrice ?? item.product?.price ?? 0
  const lineTotal = useMemo(() => unitPrice * item.quantity, [unitPrice, item.quantity])

  return (
    <div
      className={cn(
        'relative origin-top flex items-center justify-between gap-2',
        'p-1.5 pl-2.5 pr-1 rounded-xl border border-border/10 border-l-[4px] !border-l-primary',
        'transition-all duration-200 bg-card/40',
        isLocked ? 'opacity-75' : 'hover:border-primary/15 hover:bg-card/60'
      )}
    >
      <div className="flex items-baseline gap-2 min-w-0 flex-1">
        {item.quantity > 1 && (
          <span className="shrink-0 text-[13px] leading-none font-black text-rose-500 tabular-nums">
            {item.quantity}x
          </span>
        )}

        <p
          className="min-w-0 flex-1 font-bold text-[13px] leading-tight text-foreground tracking-tight truncate"
          title={item.formattedName}
        >
          {item.formattedName}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <p className="text-[13px] font-black tabular-nums text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-md whitespace-nowrap">
          {formatCurrency(lineTotal)}
        </p>

        <QuantitySelector
          quantity={item.quantity}
          onUpdate={(newQty) => onUpdateQuantity(item.id, item.productId, newQty)}
          isLocked={isLocked}
          showNumber={false}
          className="shrink-0"
        />
      </div>
    </div>
  )
})
