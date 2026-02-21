// src/renderer/src/features/orders/components/CartPaidItem.tsx
import type { Order } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { CheckCircle } from 'lucide-react'
import { memo } from 'react'

type OrderItem = NonNullable<Order['items']>[number]
type ProcessedItem = OrderItem & { formattedName: string }

interface CartPaidItemProps {
  item: ProcessedItem
}

export const CartPaidItem = memo(function CartPaidItem({ item }: CartPaidItemProps) {
  return (
    <div className="relative flex items-center justify-between gap-3 p-1.5 pl-2.5 pr-3 rounded-xl bg-muted/5 border border-border/10 border-l-[4px] !border-l-emerald-500/40 opacity-90 group/paid transition-all hover:opacity-100">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {item.quantity > 1 && (
          <span className="text-[13px] font-black text-rose-500/80 tabular-nums shrink-0">
            {item.quantity}x
          </span>
        )}
        <p className="font-bold text-[13px] pl-0.5 text-foreground/85 tracking-tight break-words leading-tight">
          {item.formattedName}
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <p className="text-[12px] font-black tabular-nums text-emerald-600/80 dark:text-emerald-400/80 bg-emerald-500/5 px-2 py-0.5 rounded-md">
          {formatCurrency(item.unitPrice * item.quantity)}
        </p>
        <div className="p-1 rounded-full bg-emerald-500/5 text-emerald-500/70">
          <CheckCircle className="w-3 h-3" />
        </div>
      </div>
    </div>
  )
})
