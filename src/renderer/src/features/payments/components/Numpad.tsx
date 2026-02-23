import { Delete } from 'lucide-react'
import { memo, useCallback } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NumpadProps {
  onAppend: (chunk: string) => void
  onBackspace: () => void
  onQuickCash: (value: string) => void
  onSetExact: () => void
}

const NUMPAD_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, '00', 0] as const

const QUICK_CASH_OPTIONS = [
  { val: 50, color: 'amber' },
  { val: 100, color: 'blue' },
  { val: 200, color: 'pink' }
] as const

export const Numpad = memo(function Numpad({
  onAppend,
  onBackspace,
  onQuickCash,
  onSetExact
}: NumpadProps) {
  const handleNumKey = useCallback(
    (n: (typeof NUMPAD_KEYS)[number]) => onAppend(n.toString()),
    [onAppend]
  )

  const keyBase =
    'h-14 rounded-xl border bg-background text-2xl font-semibold ' +
    'border-border/50 shadow-sm ' +
    'hover:bg-muted/60 active:scale-[0.99] transition'

  return (
    <div className="flex gap-3">
      {/* NUMPAD */}
      <div className="flex-1 grid grid-cols-3 gap-2">
        {NUMPAD_KEYS.map((n) => (
          <Button
            key={n}
            variant="ghost"
            className={cn(keyBase, 'text-foreground')}
            onClick={() => handleNumKey(n)}
          >
            {n === '00' ? <span className="text-xl">00</span> : n}
          </Button>
        ))}

        {/* BACKSPACE */}
        <Button
          variant="ghost"
          className={cn(
            keyBase,
            'text-destructive border-destructive/30 bg-destructive/5 hover:bg-destructive/10'
          )}
          onClick={onBackspace}
          aria-label="Sil"
        >
          <Delete className="w-5 h-5" />
        </Button>
      </div>

      {/* QUICK CASH */}
      <div className="w-[120px] flex flex-col gap-2">
        {QUICK_CASH_OPTIONS.map(({ val, color }) => (
          <Button
            key={val}
            variant="outline"
            className={cn(
              'flex-1 rounded-xl text-sm font-bold shadow-sm transition active:scale-[0.99]',

              // ₺50 – Amber
              color === 'amber' &&
                'border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-600 hover:text-white',

              // ₺100 – Blue
              color === 'blue' &&
                'border-blue-500/30 bg-blue-500/10 text-blue-700 hover:bg-blue-600 hover:text-white',

              // ₺200 – Pink
              color === 'pink' &&
                'border-pink-500/30 bg-pink-500/10 text-pink-700 hover:bg-pink-600 hover:text-white'
            )}
            onClick={() => onQuickCash(val.toString())}
          >
            ₺{val}
          </Button>
        ))}

        {/* EXACT */}
        <Button
          variant="outline"
          className={cn(
            'flex-1 rounded-xl border border-success/40 bg-success/10',
            'text-[11px] font-bold tracking-wider',
            'text-success-foreground hover:bg-success hover:text-white transition active:scale-[0.99]'
          )}
          onClick={onSetExact}
          title="Tamamı"
        >
          TAMAMI
        </Button>
      </div>
    </div>
  )
})
