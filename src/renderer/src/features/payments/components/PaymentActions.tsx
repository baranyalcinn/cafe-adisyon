import { Banknote, CreditCard, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { type PaymentMethod } from '@/lib/api'
import { cn } from '@/lib/utils'
import { memo } from 'react'

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
    'relative h-[56px] w-full rounded-2xl justify-center gap-2.5 text-[15px] font-bold tracking-wide overflow-hidden',
    'transition-all duration-150 active:scale-[0.97] hover:scale-[1.02]',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none'
  ),
  cash: [
    'bg-gradient-to-br from-primary to-primary/85',
    'text-primary-foreground',
    'shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30',
    'border border-primary/30'
  ].join(' '),
  card: [
    'bg-gradient-to-br from-zinc-700 to-zinc-900',
    'dark:from-zinc-800 dark:to-zinc-950',
    'text-white',
    'shadow-md shadow-black/20 hover:shadow-lg hover:shadow-black/30',
    'border border-white/10'
  ].join(' '),
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
}: PaymentActionsProps): React.JSX.Element {
  // Hover ve Focus olaylarını yöneten tek ve stabil fonksiyon
  const handleHover = (method: PaymentMethod | null): void => {
    if (onHoverChange) onHoverChange(method)
  }

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
            {/* inner light overlay for depth */}
            <span className="absolute inset-0 rounded-2xl bg-white/5 pointer-events-none" />
            {isProcessingThis ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>İşleniyor...</span>
              </>
            ) : (
              <>
                <Icon className={cn('w-5 h-5', iconClass)} strokeWidth={2.5} />
                <span>{label}</span>
              </>
            )}
          </Button>
        )
      })}
    </div>
  )
})

PaymentActions.displayName = 'PaymentActions'
