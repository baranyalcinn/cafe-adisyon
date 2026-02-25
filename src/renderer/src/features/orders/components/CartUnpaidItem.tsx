import { QuantitySelector } from '@/components/ui/QuantitySelector'
import type { Order } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import React from 'react'

// ============================================================================
// Types
// ============================================================================

type OrderItem = NonNullable<Order['items']>[number]
type ProcessedItem = OrderItem & { formattedName: string }

interface CartUnpaidItemProps {
  item: ProcessedItem
  isLocked: boolean
  onUpdateQuantity: (orderItemId: string, productId: string, newQty: number) => void
}

// ============================================================================
// Styles
// ============================================================================

const STYLES = {
  container:
    'relative origin-top flex items-center justify-between gap-2 p-1.5 pl-2.5 pr-1 rounded-xl border border-border/10 border-l-[4px] !border-l-primary transition-all duration-200 bg-card/40',
  locked: 'opacity-75',
  unlocked: 'hover:border-primary/15 hover:bg-card/60',
  quantity: 'shrink-0 text-[13px] leading-none font-black text-rose-500 tabular-nums',
  name: 'min-w-0 flex-1 font-bold text-[14px] leading-tight text-foreground tracking-tight truncate',
  priceBadge:
    'text-[13px] font-black tabular-nums text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-md whitespace-nowrap'
} as const

// ============================================================================
// Main Component
// ============================================================================

/**
 * Ödenmemiş ürünleri gösteren satır bileşeni.
 * Miktar seçici içerir ve masanın kilit durumuna göre etkileşimi yönetir.
 * 'memo' ve 'useMemo' kaldırılarak sığ karşılaştırma ve bellek yükü azaltılmıştır.
 */
export function CartUnpaidItem({
  item,
  isLocked,
  onUpdateQuantity
}: CartUnpaidItemProps): React.JSX.Element {
  const unitPrice = item.unitPrice ?? item.product?.price ?? 0
  const lineTotal = unitPrice * item.quantity

  return (
    <div
      className={
        isLocked ? `${STYLES.container} ${STYLES.locked}` : `${STYLES.container} ${STYLES.unlocked}`
      }
    >
      <div className="flex items-baseline gap-2 min-w-0 flex-1">
        {item.quantity > 1 && <span className={STYLES.quantity}>{item.quantity}x</span>}

        <p className={STYLES.name} title={item.formattedName}>
          {item.formattedName}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <p className={STYLES.priceBadge}>{formatCurrency(lineTotal)}</p>

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
}
