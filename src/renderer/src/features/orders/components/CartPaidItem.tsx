import type { Order } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'
import { CheckCircle } from 'lucide-react'
import { memo, useMemo } from 'react'

type OrderItem = NonNullable<Order['items']>[number]
type ProcessedItem = OrderItem & { formattedName: string }

interface CartPaidItemProps {
  item: ProcessedItem
}

export const CartPaidItem = memo(function CartPaidItem({
  item
}: CartPaidItemProps): React.JSX.Element {
  const lineTotal = useMemo(
    () => (item.unitPrice ?? 0) * item.quantity,
    [item.unitPrice, item.quantity]
  )

  return (
    <div
      className={cn(
        'relative flex items-center justify-between gap-3',
        'px-2.5 py-2 rounded-xl',
        'bg-muted/5 border border-border/10 border-l-4 border-l-emerald-500/35',
        'opacity-85 transition-colors'
      )}
      title={item.formattedName}
      aria-label={`${item.formattedName}, ${item.quantity} adet, ödendi`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {item.quantity > 1 && (
          <span className="text-[12px] font-black text-emerald-600/70 dark:text-emerald-400/70 tabular-nums shrink-0">
            {item.quantity}x
          </span>
        )}

        <p className="font-semibold text-[12px] text-foreground/75 tracking-tight truncate">
          {item.formattedName}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <p className="text-[11px] font-black tabular-nums text-emerald-700/80 dark:text-emerald-400/80 bg-emerald-500/5 px-2 py-0.5 rounded-md">
          {formatCurrency(lineTotal)}
        </p>

        <div className="p-1 rounded-full bg-emerald-500/5 text-emerald-500/70">
          <CheckCircle className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  )
})
