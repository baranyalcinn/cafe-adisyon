import { Delete } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface NumpadProps {
  onAppend: (chunk: string) => void
  onBackspace: () => void
  onQuickCash: (value: string) => void
  onSetExact: () => void
  partialPaymentsBlocked?: boolean
  effectivePayment?: number
}

type QuickCashColor = 'amber' | 'blue' | 'pink'

interface QuickCashOption {
  val: number
  color: QuickCashColor
}

// ============================================================================
// Constants & Configurations
// ============================================================================

const NUMPAD_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, '00', 0] as const

const QUICK_CASH_OPTIONS: readonly QuickCashOption[] = [
  { val: 50, color: 'amber' },
  { val: 100, color: 'blue' },
  { val: 200, color: 'pink' }
]

// Tailwind sınıflarını objede topluyoruz (Okunabilirlik ve bakım kolaylığı için)
const QUICK_CASH_STYLES: Record<QuickCashColor, string> = {
  amber:
    'border-amber-500/50 bg-amber-500/25 text-amber-900 dark:text-amber-400 hover:bg-amber-600 hover:text-white',
  blue: 'border-blue-500/50 bg-blue-500/25 text-blue-900 dark:text-blue-400 hover:bg-blue-600 hover:text-white',
  pink: 'border-pink-500/50 bg-pink-500/25 text-pink-900 dark:text-pink-400 hover:bg-pink-600 hover:text-white'
}

const COMMON_KEY_BASE = cn(
  'h-[58px] rounded-xl border bg-card text-2xl font-black',
  'border-border/40 shadow-sm transition-all duration-100',
  'hover:scale-[1.04] hover:bg-zinc-700 hover:text-white dark:hover:bg-zinc-600 hover:border-zinc-600 hover:shadow-md',
  'active:scale-[0.90] active:bg-zinc-800 active:text-white active:border-zinc-800'
)

const ACTION_BUTTON_BASE =
  'flex-1 min-h-[56px] rounded-xl text-sm font-bold shadow-sm transition active:scale-[0.97]'

// ============================================================================
// Component
// ============================================================================

export function Numpad({
  onAppend,
  onBackspace,
  onQuickCash,
  onSetExact,
  partialPaymentsBlocked = false,
  effectivePayment = 0
}: NumpadProps): React.JSX.Element {
  const handleNumKey = (n: (typeof NUMPAD_KEYS)[number]): void => {
    onAppend(n.toString())
  }

  return (
    <div className="flex gap-3">
      {/* NUMPAD GRID */}
      <div className="flex-1 grid grid-cols-3 gap-2.5">
        {NUMPAD_KEYS.map((n) => (
          <Button
            key={n}
            variant="ghost"
            className={cn(COMMON_KEY_BASE, 'text-foreground')}
            onClick={() => handleNumKey(n)}
          >
            {n === '00' ? <span className="text-lg">00</span> : n}
          </Button>
        ))}

        {/* BACKSPACE BUTTON */}
        <Button
          variant="ghost"
          className={cn(
            COMMON_KEY_BASE,
            'text-destructive border-destructive/50 bg-destructive/20',
            'hover:bg-red-500 dark:hover:bg-red-600 dark:hover:border-red-500'
          )}
          onClick={onBackspace}
          aria-label="Sil"
        >
          <Delete className="!w-7 !h-7 -translate-x-0.5" strokeWidth={2.25} />
        </Button>
      </div>

      {/* QUICK ACTIONS SIDEBAR */}
      <div className="w-[120px] flex flex-col gap-2">
        {/* QUICK CASH BUTTONS */}
        {QUICK_CASH_OPTIONS.map(({ val, color }) => {
          const isInsufficient = partialPaymentsBlocked && val * 100 < effectivePayment

          return (
            <Button
              key={val}
              variant="outline"
              className={cn(ACTION_BUTTON_BASE, QUICK_CASH_STYLES[color])}
              onClick={() => onQuickCash(val.toString())}
              disabled={isInsufficient}
              title={isInsufficient ? 'Ürün seç modunda tutar yetersiz' : undefined}
            >
              ₺{val}
            </Button>
          )
        })}

        {/* EXACT PAYMENT BUTTON */}
        <Button
          variant="outline"
          className={cn(
            ACTION_BUTTON_BASE,
            'border border-success/60 bg-success/25',
            'text-[11px] tracking-wider text-success-foreground',
            'hover:bg-success hover:text-white'
          )}
          onClick={onSetExact}
          title="Tamamı"
        >
          TAMAMI
        </Button>
      </div>
    </div>
  )
}
