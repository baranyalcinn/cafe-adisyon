import { Banknote, CreditCard, Loader2 } from 'lucide-react'
import { memo } from 'react'

import { Button } from '@/components/ui/button'
import { type PaymentMethod } from '@/lib/api'
import { cn } from '@/lib/utils'

interface PaymentActionsProps {
  canCashPay: boolean
  canCardPay: boolean
  isProcessing: boolean
  onPayment: (method: PaymentMethod) => void
  onHoverChange?: (hovering: boolean) => void
  itemsPartialBlocked: boolean
  tendered: number
  effectivePayment: number
}

export const PaymentActions = memo(function PaymentActions({
  canCashPay,
  canCardPay,
  isProcessing,
  onPayment,
  onHoverChange,
  itemsPartialBlocked,
  tendered,
  effectivePayment
}: PaymentActionsProps) {
  const cashTitle = itemsPartialBlocked ? 'Ürün seç modunda parçalı tahsilat yok' : undefined
  const cardTitle = tendered > effectivePayment ? 'Kartta fazla tutar girilemez' : undefined

  const base =
    'h-14 rounded-xl w-full justify-center gap-2 text-sm font-semibold tracking-wide ' +
    'transition-colors active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="grid grid-cols-2 gap-3 mb-2">
      <Button
        className={cn(
          base,
          'bg-primary text-primary-foreground hover:bg-primary/95',
          'shadow-sm border border-primary/20'
        )}
        onClick={() => onPayment('CASH')}
        onMouseEnter={() => !tendered && onHoverChange?.(true)}
        onMouseLeave={() => onHoverChange?.(false)}
        disabled={!canCashPay}
        title={cashTitle}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>İşleniyor...</span>
          </>
        ) : (
          <>
            <Banknote className="w-5 h-5" />
            <span>Nakit</span>
          </>
        )}
      </Button>

      <Button
        className={cn(
          base,
          'bg-background text-foreground hover:bg-muted/50',
          'shadow-sm border border-border/80'
        )}
        onClick={() => onPayment('CARD')}
        onMouseEnter={() => !tendered && onHoverChange?.(true)}
        onMouseLeave={() => onHoverChange?.(false)}
        disabled={!canCardPay}
        title={cardTitle}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>İşleniyor...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 text-primary" />
            <span>Kart</span>
          </>
        )}
      </Button>
    </div>
  )
})
