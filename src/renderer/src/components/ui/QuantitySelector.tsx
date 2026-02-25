'use client'

import { cn } from '@/lib/utils'
import { LucideIcon, Minus, Plus, Trash2 } from 'lucide-react'
import * as React from 'react'
import { memo, useCallback } from 'react'

// ============================================================================
// Types
// ============================================================================

interface QuantitySelectorProps {
  quantity: number
  onUpdate: (newQuantity: number) => void
  isLocked?: boolean
  className?: string
  showNumber?: boolean
}

interface ActionButtonProps {
  icon: LucideIcon
  onClick: (e: React.MouseEvent) => void
  disabled?: boolean
  variant?: 'default' | 'danger' | 'success'
  label: string
}

// ============================================================================
// Styles
// ============================================================================

const STYLES = {
  container:
    'inline-flex items-center gap-0.5 rounded-full p-0.5 border shadow-sm transition-colors',
  unlocked: 'border-white/10 bg-background/40 backdrop-blur-sm',
  locked: 'border-border/25 bg-background/20 opacity-70',

  btnBase:
    'h-6 w-6 flex items-center justify-center rounded-full transition-all duration-150 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-transparent',
  btnDefault: 'text-foreground/90 hover:bg-muted/80 hover:text-foreground',
  btnDanger: 'text-red-600 dark:text-red-400 hover:bg-red-500/15 hover:text-red-500',
  btnSuccess:
    'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-500',

  number: 'min-w-[20px] text-center font-black text-[11px] tabular-nums text-foreground select-none'
} as const

// ============================================================================
// Sub-Components
// ============================================================================

const ActionButton = memo(
  ({
    icon: Icon,
    onClick,
    disabled,
    variant = 'default',
    label
  }: ActionButtonProps): React.JSX.Element => {
    const variantClass =
      variant === 'danger'
        ? STYLES.btnDanger
        : variant === 'success'
          ? STYLES.btnSuccess
          : STYLES.btnDefault

    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(STYLES.btnBase, variantClass)}
        aria-label={label}
        title={label}
      >
        <Icon className="w-3.5 h-3.5" strokeWidth={variant === 'default' ? 3.2 : 2.8} />
      </button>
    )
  }
)
ActionButton.displayName = 'ActionButton'

// ============================================================================
// Main Component
// ============================================================================

export const QuantitySelector = memo(
  ({
    quantity,
    onUpdate,
    isLocked,
    className,
    showNumber = true
  }: QuantitySelectorProps): React.JSX.Element => {
    const handleDecrease = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onUpdate(quantity - 1)
      },
      [quantity, onUpdate]
    )

    const handleIncrease = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onUpdate(quantity + 1)
      },
      [quantity, onUpdate]
    )

    const isRemoving = quantity === 1

    return (
      <div className={cn(STYLES.container, isLocked ? STYLES.locked : STYLES.unlocked, className)}>
        {/* Decrease / Remove Button */}
        <ActionButton
          disabled={isLocked}
          onClick={handleDecrease}
          icon={isRemoving ? Trash2 : Minus}
          variant={isRemoving ? 'danger' : 'default'}
          label={isRemoving ? 'Kaldır' : 'Azalt'}
        />

        {/* Value Display */}
        {showNumber && <span className={STYLES.number}>{quantity}</span>}

        {/* Increase Button */}
        <ActionButton
          disabled={isLocked}
          onClick={handleIncrease}
          icon={Plus}
          variant="success"
          label="Artır"
        />
      </div>
    )
  }
)

QuantitySelector.displayName = 'QuantitySelector'
