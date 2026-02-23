import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import React from 'react'

interface PinInputProps {
  label: string
  value: string
  onChange: (v: string) => void
}

export const PinInput = ({ label, value, onChange }: PinInputProps): React.ReactNode => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[9px] font-bold text-muted-foreground tracking-tight">{label}</span>
    <InputOTP maxLength={4} value={value} onChange={onChange}>
      <InputOTPGroup className="gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <InputOTPSlot
            key={i}
            index={i}
            className="rounded-lg border-[1.5px] h-10 w-10 text-sm font-bold bg-muted/20"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  </div>
)
