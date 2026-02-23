import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import React from 'react'

interface PinInputProps {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}

export const PinInput = ({
  label,
  value,
  onChange,
  disabled = false
}: PinInputProps): React.JSX.Element => {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
        {label}
      </span>

      <InputOTP
        maxLength={4}
        value={value}
        onChange={(v) => onChange(v.replace(/\D/g, '').slice(0, 4))}
        disabled={disabled}
      >
        <InputOTPGroup className="gap-2">
          {[0, 1, 2, 3].map((i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className={[
                'h-10 w-10 rounded-xl border text-sm font-semibold',
                'bg-white/80 dark:bg-zinc-900/70',
                'border-zinc-200/70 dark:border-zinc-700/70',
                'transition-all',
                'data-[active=true]:ring-2 data-[active=true]:ring-primary/25',
                'data-[active=true]:border-primary/40',
                'data-[has-value=true]:bg-primary/[0.03]',
                'disabled:opacity-50'
              ].join(' ')}
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  )
}
