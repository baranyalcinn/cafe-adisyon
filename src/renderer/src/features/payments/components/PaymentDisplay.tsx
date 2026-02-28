import { PremiumAmount } from '@/components/PremiumAmount'
import { type PaymentMethod } from '@/lib/api'
import { soundManager } from '@/lib/sound'
import { cn } from '@/lib/utils'
import { RotateCcw } from 'lucide-react'

interface PaymentDisplayProps {
  effectivePayment: number
  tenderedInput: string
  onClear: () => void
  hoveredMethod?: PaymentMethod | null
}

export function PaymentDisplay({
  effectivePayment,
  tenderedInput,
  onClear,
  hoveredMethod
}: PaymentDisplayProps): React.JSX.Element {
  const isHovering = !!hoveredMethod && !tenderedInput
  const hasInput = !!tenderedInput

  return (
    <div className="px-8 pt-5 pb-2 flex flex-col items-center">
      <div className="flex gap-4 w-full max-w-[640px] mb-8">
        {/* ── Total Amount Card ─────────────────────────────────── */}
        <div className="flex-[1.6]">
          <div
            className={cn(
              'relative h-full rounded-3xl px-6 py-6 flex flex-col items-center justify-center overflow-hidden',
              'bg-gradient-to-br from-primary via-primary/95 to-primary/85',
              'shadow-lg shadow-primary/25 border border-primary/20'
            )}
          >
            {/* grid texture */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg,transparent,transparent 24px,white 24px,white 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,white 24px,white 25px)'
              }}
            />
            {/* radial glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(255,255,255,0.12),transparent_60%)]" />
            <div
              className={cn(
                'absolute inset-0 bg-white/5 opacity-0 transition-opacity duration-300',
                'animate-in fade-in'
              )}
            />
            <span className="relative text-[10px] font-bold text-white/80 tracking-[0.2em] uppercase mb-2 select-none">
              Toplam Tutar
            </span>
            <PremiumAmount
              key={effectivePayment}
              amount={effectivePayment}
              size="4xl"
              color="foreground"
              className="relative [&_span]:!text-white animate-in zoom-in-95 duration-300"
            />
          </div>
        </div>

        {/* ── Tendered Input Card ───────────────────────────────── */}
        <div className="flex-1">
          <div
            className={cn(
              'h-full rounded-3xl border px-6 py-4 flex flex-col justify-between',
              'transition-all duration-300',
              hasInput
                ? 'border-teal-500/40 bg-teal-500/5 shadow-sm shadow-teal-500/10 ring-2 ring-teal-500/10'
                : 'border-border/30 bg-card shadow-sm'
            )}
          >
            {/* Header row */}
            <div className="flex items-center justify-between min-h-[2.2rem]">
              <span
                className={cn(
                  'text-[10px] font-bold tracking-[0.2em] uppercase transition-colors duration-300',
                  hasInput ? 'text-teal-600 dark:text-teal-400' : 'text-foreground/50'
                )}
              >
                Alınacak
              </span>

              {/* Clear button */}
              <button
                onClick={() => {
                  soundManager.playClick()
                  onClear()
                }}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-lg border border-transparent px-2.5',
                  'text-xs font-medium transition-all duration-200',
                  'text-foreground/60 hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 active:scale-[0.97]',
                  hasInput ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                )}
                title="Sıfırla (Delete)"
                tabIndex={-1}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Amount display */}
            <div className="mt-2 flex items-baseline justify-end gap-1 px-1 py-1 select-none">
              <PremiumAmount
                key={tenderedInput}
                amount={
                  tenderedInput
                    ? parseFloat(tenderedInput) * 100
                    : isHovering
                      ? effectivePayment
                      : 0
                }
                size="2xl"
                color={hasInput ? 'teal' : isHovering ? 'primary' : 'muted'}
                className={cn(
                  'transition-all duration-300',
                  !hasInput && !isHovering && 'opacity-25',
                  isHovering && !hasInput && 'opacity-80 scale-105 origin-right',
                  hasInput && 'animate-in zoom-in-95 duration-200'
                )}
              />
              {/* Blinking cursor */}
              <span
                className={cn(
                  'w-[2px] h-7 rounded-full mb-0.5 transition-opacity duration-300',
                  'bg-teal-500 animate-pulse',
                  hasInput ? 'opacity-80' : 'opacity-0'
                )}
              />
            </div>
            {/* Hover method hint */}
            <div
              className={cn(
                'text-[10px] font-bold tracking-[0.15em] uppercase transition-all duration-200 text-right px-1 pb-1',
                isHovering && !hasInput
                  ? 'opacity-50 translate-y-0'
                  : 'opacity-0 -translate-y-1 pointer-events-none'
              )}
            >
              {hoveredMethod === 'CASH' ? 'Nakit Tahsilat' : 'Kart Tahsilat'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
