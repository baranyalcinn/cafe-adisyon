// src/renderer/src/features/payments/components/PaymentSummary.tsx
import { PremiumAmount } from '@/components/PremiumAmount'
import { DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Banknote, ListChecks, LucideIcon, Users } from 'lucide-react'
import { PaymentMode } from '../hooks/usePaymentLogic'

interface PaymentSummaryProps {
  remainingAmount: number
  paidAmount: number
  paymentMode: PaymentMode
  setMode: (mode: PaymentMode) => void
  tableName: string
}

const PAYMENT_MODES: { id: PaymentMode; label: string; Icon: LucideIcon }[] = [
  { id: 'full', label: 'Tamamı', Icon: Banknote },
  { id: 'split', label: 'Bölüştür', Icon: Users },
  { id: 'items', label: 'Ürün Seç', Icon: ListChecks }
]

export function PaymentSummary({
  remainingAmount,
  paidAmount,
  paymentMode,
  setMode,
  tableName
}: PaymentSummaryProps) {
  return (
    <div className="p-6 pb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-baseline gap-3">
          <DialogTitle className="text-[22px] font-semibold tracking-tight text-foreground">
            Hesap Özeti
          </DialogTitle>

          <div className="flex items-center gap-2 text-foreground/80">
            <span className="text-[14px] font-bold opacity-30">|</span>
            <span className="text-[14px] font-black tracking-tight">{tableName}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="rounded-2xl border border-border/40 bg-muted/10 shadow-sm px-6 py-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col items-start gap-1.5 px-1 flex-1">
              <span className="text-[11px] font-bold text-foreground/70 tracking-wide">
                Kalan Tutar
              </span>
              <PremiumAmount amount={remainingAmount} size="3xl" color="primary" />
            </div>

            {paidAmount > 0 && (
              <div className="flex flex-col items-end gap-1.5 px-1 flex-1 animate-in fade-in duration-200">
                <span className="text-[11px] font-bold text-foreground/70 tracking-wide">
                  Ödenen
                </span>
                <PremiumAmount amount={paidAmount} size="2xl" color="success" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        {PAYMENT_MODES.map(({ id, label, Icon }) => {
          const isActive = paymentMode === id

          return (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={cn(
                'flex-1 h-12 flex items-center justify-center gap-2 rounded-xl transition-all duration-200 border',
                isActive
                  ? 'bg-primary border-primary text-primary-foreground shadow-md'
                  : 'bg-background border-border/40 text-foreground/90 hover:bg-muted/30 hover:text-foreground'
              )}
            >
              <div className="shrink-0 flex items-center">
                <Icon
                  className={cn(
                    'w-[18px] h-[18px]',
                    isActive ? 'text-primary-foreground' : 'text-foreground/60'
                  )}
                />
              </div>
              <span className="text-[13px] font-extrabold tracking-tight whitespace-nowrap">
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
