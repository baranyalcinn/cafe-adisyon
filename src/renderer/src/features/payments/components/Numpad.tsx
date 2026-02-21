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
  { val: 50, color: 'blue' as const },
  { val: 100, color: 'indigo' as const },
  { val: 200, color: 'violet' as const }
]

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

  return (
    <div className="flex gap-4">
      {/* Numpad */}
      <div className="flex-1 grid grid-cols-3 gap-2.5">
        {NUMPAD_KEYS.map((n) => (
          <Button
            key={n}
            variant="ghost"
            className="h-[68px] rounded-2xl bg-background border border-border/10 text-2xl font-black shadow-sm active:scale-95 transition-all hover:bg-muted/50 hover:border-primary/30 hover:text-primary"
            onClick={() => handleNumKey(n)}
          >
            {n}
          </Button>
        ))}
        <Button
          variant="ghost"
          className="h-[68px] rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white shadow-sm active:scale-95 transition-all border border-destructive/20 flex items-center justify-center group"
          onClick={onBackspace}
          title="Backspace"
        >
          <Delete className="w-5 h-5 transition-transform group-hover:scale-110" />
        </Button>
      </div>

      {/* Quick cash */}
      <div className="w-[110px] flex flex-col gap-2.5">
        {QUICK_CASH_OPTIONS.map(({ val, color }) => (
          <Button
            key={val}
            variant="outline"
            className={cn(
              'flex-1 rounded-2xl font-black text-[15px] transition-all shadow-sm active:scale-95',
              color === 'blue' &&
                'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-600 hover:text-white hover:border-blue-600',
              color === 'indigo' &&
                'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 hover:bg-indigo-600 hover:text-white hover:border-indigo-600',
              color === 'violet' &&
                'bg-violet-500/10 text-violet-600 border-violet-500/20 hover:bg-violet-600 hover:text-white hover:border-violet-600'
            )}
            onClick={() => onQuickCash(val.toString())}
          >
            ₺{val}
          </Button>
        ))}

        <Button
          variant="outline"
          className="flex-1 rounded-2xl bg-emerald-500/10 border-emerald-500/30 text-emerald-600 font-black text-[11px] uppercase hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-md active:scale-95"
          onClick={onSetExact}
          title="Exact"
        >
          TAMAMI
        </Button>
      </div>
    </div>
  )
})
