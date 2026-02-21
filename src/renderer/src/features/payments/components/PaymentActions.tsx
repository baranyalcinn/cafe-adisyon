import { Banknote, CreditCard } from 'lucide-react'
import { memo } from 'react'

import { Button } from '@/components/ui/button'
import { type PaymentMethod } from '@/lib/api'

interface PaymentActionsProps {
  canCashPay: boolean
  canCardPay: boolean
  onPayment: (method: PaymentMethod) => void
  itemsPartialBlocked: boolean
  tendered: number
  effectivePayment: number
}

export const PaymentActions = memo(function PaymentActions({
  canCashPay,
  canCardPay,
  onPayment,
  itemsPartialBlocked,
  tendered,
  effectivePayment
}: PaymentActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-2">
      <Button
        className="h-16 rounded-[1.25rem] bg-gradient-to-br from-primary to-primary/80 shadow-[0_12px_25px_-5px_rgba(var(--primary-rgb),0.3)] hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden group border-b-4 border-primary/20"
        onClick={() => onPayment('CASH')}
        disabled={!canCashPay}
        title={itemsPartialBlocked ? 'Ürün seç modunda parçalı tahsilat yok' : undefined}
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center gap-2.5 relative z-10 justify-center">
          <Banknote className="w-6 h-6 text-white" />
          <span className="text-[16px] font-black tracking-tighter text-white uppercase">
            NAKİT
          </span>
        </div>
      </Button>

      <Button
        className="h-16 rounded-[1.25rem] bg-zinc-950 border border-white/5 shadow-2xl hover:bg-zinc-900 hover:border-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden group border-b-4 border-black"
        onClick={() => onPayment('CARD')}
        disabled={!canCardPay}
        title={tendered > effectivePayment ? 'Kartta fazla tutar girilemez' : undefined}
      >
        <div className="absolute inset-0 bg-primary opacity-[0.05] group-hover:opacity-[0.1] transition-opacity" />
        <div className="flex items-center gap-2.5 relative z-10 justify-center">
          <CreditCard className="w-6 h-6 text-primary" />
          <span className="text-[16px] font-black tracking-tighter text-white uppercase">KART</span>
        </div>
      </Button>
    </div>
  )
})
