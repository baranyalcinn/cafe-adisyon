import React from 'react'
import { cn, formatCurrency } from '@/lib/utils'

interface PremiumAmountProps {
  amount: number
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'
  color?: 'primary' | 'foreground' | 'muted' | 'success' | 'warning' | 'destructive'
  fontWeight?: 'semibold' | 'bold' | 'extrabold' | 'black'
}

export const PremiumAmount: React.FC<PremiumAmountProps> = ({
  amount,
  className,
  size = 'md',
  color = 'foreground',
  fontWeight = 'extrabold'
}) => {
  const formatted = formatCurrency(amount)
  // Split symbol and amount (assuming format is "₺ 100")
  const parts = formatted.split(' ')
  const symbol = parts[0] || '₺'
  const value = parts[1] || '0'

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
    '2xl': 'text-4xl',
    '3xl': 'text-5xl',
    '4xl': 'text-6xl',
    '5xl': 'text-7xl',
    '6xl': 'text-8xl',
    '7xl': 'text-9xl'
  }

  const colorClasses = {
    primary: 'text-primary',
    foreground: 'text-foreground',
    muted: 'text-muted-foreground',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive'
  }

  const weightClasses = {
    semibold: 'font-semibold',
    bold: 'font-bold',
    extrabold: 'font-extrabold',
    black: 'font-black'
  }

  return (
    <div className={cn('inline-flex items-baseline tabular-nums leading-none', className)}>
      <span
        className={cn(
          'font-medium opacity-50 mr-[0.15em] transition-opacity',
          sizeClasses[size],
          colorClasses[color]
        )}
      >
        {symbol}
      </span>
      <span
        className={cn(
          'tracking-tight transition-all',
          sizeClasses[size],
          colorClasses[color],
          weightClasses[fontWeight]
        )}
      >
        {value}
      </span>
    </div>
  )
}
