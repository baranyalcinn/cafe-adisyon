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
}: SettingRowProps): React.JSX.Element => {
  return (
    <div
      className={cn(
        'px-4 py-3',
        'flex flex-col gap-2.5',
        'sm:flex-row sm:items-center sm:justify-between sm:gap-3',
        !last && 'border-b border-zinc-200/60 dark:border-zinc-800/70'
      )}
    >
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-foreground leading-tight">{label}</p>
        {description && (
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>

      <div className="shrink-0">{children}</div>
    </div>
  )
}
