import { Banknote, CreditCard, Loader2 } from 'lucide-react'
import { memo, useCallback } from 'react'

import { Button } from '@/components/ui/button'
import { type PaymentMethod } from '@/lib/api'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface PaymentActionsProps {
  canCashPay: boolean
  canCardPay: boolean
  processingMethod: PaymentMethod | null
  onPayment: (method: PaymentMethod) => void
  onHoverChange?: (method: PaymentMethod | null) => void
  itemsPartialBlocked: boolean
  tendered: number
  effectivePayment: number
}

// ============================================================================
// Constants & Styles
// ============================================================================

const STYLES = {
  base: cn(
    'h-14 w-full rounded-xl justify-center gap-2 text-base font-bold tracking-wide',
    'transition-colors active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed'
  ),
  cash: 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm border border-primary/20',
  card: 'bg-zinc-800 text-white hover:bg-zinc-900 dark:bg-zinc-900 dark:hover:bg-black shadow-md border border-zinc-700 dark:border-zinc-800',
  processingDim: 'opacity-50 grayscale pointer-events-none'
} as const

// ============================================================================
// Component
// ============================================================================

export const PaymentActions = memo(function PaymentActions({
  canCashPay,
  canCardPay,
  processingMethod,
  onPayment,
  onHoverChange,
  itemsPartialBlocked,
  tendered,
  effectivePayment
}: PaymentActionsProps) {
  // Hover ve Focus olaylarını yöneten tek ve stabil fonksiyon
  const handleHover = useCallback(
    (method: PaymentMethod | null) => {
      if (onHoverChange) onHoverChange(method)
    },
    [onHoverChange]
  )

  // Buton varyasyonlarını dinamik olarak haritalıyoruz
  const BUTTONS = [
    {
      id: 'CASH' as const,
      label: 'Nakit',
      Icon: Banknote,
      canPay: canCashPay,
      theme: STYLES.cash,
      iconClass: '',
      title: itemsPartialBlocked ? 'Ürün seç modunda parçalı tahsilat yok' : undefined
    },
    {
      id: 'CARD' as const,
      label: 'Kart',
      Icon: CreditCard,
      canPay: canCardPay,
      theme: STYLES.card,
      iconClass: 'text-white',
      title: tendered > effectivePayment ? 'Kartta fazla tutar girilemez' : undefined
    }
  ]

  return (
    <div className="grid grid-cols-2 gap-3 mb-2">
      {BUTTONS.map(({ id, label, Icon, canPay, theme, iconClass, title }) => {
        const isProcessingThis = processingMethod === id
        const isProcessingOther = processingMethod !== null && processingMethod !== id

        return (
          <Button
            key={id}
            className={cn(STYLES.base, theme, isProcessingOther && STYLES.processingDim)}
            onClick={() => onPayment(id)}
            onMouseEnter={() => handleHover(id)}
            onMouseLeave={() => handleHover(null)}
            onFocus={() => handleHover(id)}
            onBlur={() => handleHover(null)}
            disabled={!canPay || processingMethod !== null}
            title={title}
          >
            {isProcessingThis ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>İşleniyor...</span>
              </>
            ) : (
              <>
                <Icon className={cn('w-6 h-6', iconClass)} strokeWidth={2.75} />
                <span>{label}</span>
              </>
            )}
          </Button>
        )
      })}
    </div>
  )
})
