'use client'

import { cn } from '@/lib/utils'
import React from 'react'

// ============================================================================
// Types
// ============================================================================

interface SettingRowProps {
  label: string
  description?: string
  last?: boolean
  children: React.ReactNode
}

// ============================================================================
// Styles
// ============================================================================

const STYLES = {
  container:
    'px-4 py-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 transition-colors',
  border: 'border-b border-zinc-200/60 dark:border-zinc-800/70',
  content: 'min-w-0',
  label: 'text-[14px] font-medium text-foreground leading-tight',
  description: 'text-[12px] text-muted-foreground mt-0.5 leading-relaxed',
  control: 'shrink-0'
} as const

// ============================================================================
// Main Component
// ============================================================================

/**
 * Ayarlar listesi için standart satır bileşeni.
 * Gereksiz RAM kullanımını önlemek için 'memo' kaldırılmıştır.
 */
export const SettingRow = ({
  label,
  description,
  last,
  children
}: SettingRowProps): React.JSX.Element => {
  return (
    <div className={cn(STYLES.container, !last && STYLES.border)}>
      {/* Metin Alanı */}
      <div className={STYLES.content}>
        <p className={STYLES.label}>{label}</p>
        {description && <p className={STYLES.description}>{description}</p>}
      </div>

      {/* Kontrol Alanı (Switch, Button vb.) */}
      <div className={STYLES.control}>{children}</div>
    </div>
  )
}
