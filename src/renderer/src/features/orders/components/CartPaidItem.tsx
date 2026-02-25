'use client'

import type { Order } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { CheckCircle } from 'lucide-react'
import React from 'react'

// ============================================================================
// Types
// ============================================================================

type OrderItem = NonNullable<Order['items']>[number]
type ProcessedItem = OrderItem & { formattedName: string }

interface CartPaidItemProps {
  item: ProcessedItem
}

// ============================================================================
// Styles
// ============================================================================

const STYLES = {
  container:
    'relative flex items-center justify-between gap-3 px-2.5 py-2 rounded-xl bg-muted/5 border border-border/10 border-l-4 border-l-emerald-500/35 opacity-85 transition-colors',
  quantity:
    'text-[12px] font-black text-emerald-600/70 dark:text-emerald-400/70 tabular-nums shrink-0',
  name: 'font-semibold text-[12px] text-foreground/75 tracking-tight truncate',
  priceBadge:
    'text-[11px] font-black tabular-nums text-emerald-700/80 dark:text-emerald-400/80 bg-emerald-500/5 px-2 py-0.5 rounded-md',
  iconBox: 'p-1 rounded-full bg-emerald-500/5 text-emerald-500/70'
} as const

// ============================================================================
// Main Component
// ============================================================================

/**
 * Ödenmiş ürünleri gösteren satır bileşeni.
 * Basit bir çarpma işlemi ve az sayıda DOM düğümü içerdiği için
 * 'memo' ve 'useMemo' kaldırılarak RAM tasarrufu sağlanmıştır.
 */
export function CartPaidItem({ item }: CartPaidItemProps): React.JSX.Element {
  // Basit hesaplamayı doğrudan yapıyoruz, useMemo yükünden kurtuluyoruz
  const lineTotal = (item.unitPrice ?? 0) * item.quantity

  return (
    <div
      className={STYLES.container}
      title={item.formattedName}
      aria-label={`${item.formattedName}, ${item.quantity} adet, ödendi`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {item.quantity > 1 && <span className={STYLES.quantity}>{item.quantity}x</span>}

        <p className={STYLES.name}>{item.formattedName}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <p className={STYLES.priceBadge}>{formatCurrency(lineTotal)}</p>

        <div className={STYLES.iconBox}>
          <CheckCircle className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  )
}
