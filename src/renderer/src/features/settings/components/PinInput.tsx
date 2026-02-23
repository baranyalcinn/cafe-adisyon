import { cn } from '@/lib/utils'
import React from 'react'

interface SettingRowProps {
  label: string
  description?: string
  last?: boolean
  children: React.ReactNode
  className?: string
}

export const SettingRow = ({
  label,
  description,
  last,
  children,
  className
}: SettingRowProps): React.ReactNode => (
  <div
    className={cn(
      'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
      'px-4 py-3',
      !last && 'border-b border-border/20',
      className
    )}
  >
    <div className="min-w-0">
      <p className="text-[12px] font-bold text-foreground/90 leading-none">{label}</p>
      {description && (
        <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{description}</p>
      )}
    </div>

    <div className="shrink-0">{children}</div>
  </div>
)
