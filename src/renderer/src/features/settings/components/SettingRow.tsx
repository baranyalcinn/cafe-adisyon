import { cn } from '@/lib/utils'
import React from 'react'

interface SettingRowProps {
  label: string
  description?: string
  last?: boolean
  children: React.ReactNode
}

export const SettingRow = ({
  label,
  description,
  last,
  children
}: SettingRowProps): React.ReactNode => (
  <div
    className={cn(
      'flex items-center justify-between px-4 py-2.5',
      !last && 'border-b border-border/20'
    )}
  >
    <div>
      <p className="text-[14px] font-semibold text-foreground/90">{label}</p>
      {description && <p className="text-[12px] text-muted-foreground mt-0.5">{description}</p>}
    </div>
    {children}
  </div>
)
