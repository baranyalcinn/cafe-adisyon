import { PremiumAmount } from '@/components/PremiumAmount'
import { type PaymentMethod } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'
import { RotateCcw } from 'lucide-react'

interface PaymentDisplayProps {
  effectivePayment: number
  tenderedInput: string
  onClear: () => void
  onFocus: () => void
  hoveredMethod?: PaymentMethod | null
}

export function PaymentDisplay({
  effectivePayment,
  tenderedInput,
  onClear,
  onFocus,
  hoveredMethod
}: PaymentDisplayProps): React.JSX.Element {
  const isHovering = !!hoveredMethod && !tenderedInput

  return (
    <div className="px-8 pt-4 pb-2 flex flex-col items-center">
      <div className="flex gap-4 w-full max-w-[640px] mb-8">
        {/* Total Amount */}
        <div className="flex-[1.6]">
          <div className="h-full rounded-2xl border border-border/40 bg-background shadow-sm px-6 py-4 flex flex-col items-center justify-center">
            <span className="text-[13px] font-semibold text-foreground/90 tracking-wide mb-1">
              Toplam Tutar
            </span>
            <PremiumAmount amount={effectivePayment} size="4xl" color="primary" />
          </div>
        </div>

        {/* Tendered Input Area */}
        <div className="flex-1">
          <div className="h-full rounded-2xl border border-border/40 bg-background shadow-sm px-6 py-4 flex flex-col justify-between focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-foreground/90 tracking-wide">
                Alınacak
              </span>
              <button
                onClick={onClear}
                className="flex h-11 items-center gap-2 rounded-xl border border-transparent px-4 transition-all text-foreground/80 hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 active:scale-[0.99]"
                title="Sıfırla (Backspace/Delete)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <button
              className="mt-2 w-full text-right rounded-xl px-2 py-2 hover:bg-muted/40 transition active:scale-[0.99]"
              onClick={onFocus}
              type="button"
            >
              <span
                className={cn(
                  'font-sans tabular-nums tracking-tight transition-all duration-300 text-3xl font-bold',
                  tenderedInput
                    ? 'text-teal-600 dark:text-teal-500'
                    : isHovering
                      ? 'text-foreground/80 scale-105 inline-block origin-right'
                      : 'text-foreground/20'
                )}
              >
                {tenderedInput || (isHovering ? formatCurrency(effectivePayment) : '0 ₺')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
