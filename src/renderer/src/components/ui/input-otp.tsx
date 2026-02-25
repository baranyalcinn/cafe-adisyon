'use client'

import { cn } from '@/lib/utils'
import { OTPInput, OTPInputContext } from 'input-otp'
import { Dot } from 'lucide-react'
import * as React from 'react'

// ============================================================================
// Styles (Centralized)
// ============================================================================

const STYLES = {
  container: 'flex items-center gap-2 has-[:disabled]:opacity-50',
  base: 'disabled:cursor-not-allowed',
  group: 'flex items-center',
  slotBase:
    'relative flex h-10 w-10 items-center justify-center border-2 border-input text-sm font-bold transition-all first:rounded-l-lg first:border-l-2 last:rounded-r-lg bg-background/50 backdrop-blur-sm',
  slotActive: 'z-10 ring-2 ring-primary ring-offset-2 border-primary',
  caretWrapper: 'pointer-events-none absolute inset-0 flex items-center justify-center',
  caretBlink: 'h-4 w-px animate-caret-blink bg-primary duration-1000'
} as const

// ============================================================================
// Components
// ============================================================================

const InputOTP = React.forwardRef<
  React.ComponentRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>(
  ({ className, containerClassName, ...props }, ref): React.JSX.Element => (
    <OTPInput
      ref={ref}
      containerClassName={cn(STYLES.container, containerClassName)}
      className={cn(STYLES.base, className)}
      {...props}
    />
  )
)
InputOTP.displayName = 'InputOTP'

const InputOTPGroup = React.forwardRef<
  React.ComponentRef<'div'>,
  React.ComponentPropsWithoutRef<'div'>
>(
  ({ className, ...props }, ref): React.JSX.Element => (
    <div ref={ref} className={cn(STYLES.group, className)} {...props} />
  )
)
InputOTPGroup.displayName = 'InputOTPGroup'

const InputOTPSlot = React.forwardRef<
  React.ComponentRef<'div'>,
  React.ComponentPropsWithoutRef<'div'> & { index: number }
>(({ index, className, ...props }, ref): React.JSX.Element => {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index]

  return (
    <div
      ref={ref}
      className={cn(STYLES.slotBase, isActive && STYLES.slotActive, className)}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className={STYLES.caretWrapper}>
          <div className={STYLES.caretBlink} />
        </div>
      )}
    </div>
  )
})
InputOTPSlot.displayName = 'InputOTPSlot'

const InputOTPSeparator = React.forwardRef<
  React.ComponentRef<'div'>,
  React.ComponentPropsWithoutRef<'div'>
>(
  ({ ...props }, ref): React.JSX.Element => (
    <div ref={ref} role="separator" {...props}>
      <Dot />
    </div>
  )
)
InputOTPSeparator.displayName = 'InputOTPSeparator'

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot }
