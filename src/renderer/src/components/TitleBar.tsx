import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Minus, Square, X } from 'lucide-react'
import React, { memo, useCallback } from 'react'

// ============================================================================
// Styles
// ============================================================================

const STYLES = {
  container:
    'titlebar-drag h-8 bg-background/95 border-b border-border/20 flex items-center justify-between px-3 select-none backdrop-blur-md',
  titleWrap: 'flex items-center gap-3 titlebar-no-drag',
  titleText: 'text-sm font-bold text-foreground tracking-wide pl-2',
  controlsWrap: 'flex items-center gap-1 titlebar-no-drag',
  btnBase: 'h-7 w-7 rounded-sm transition-colors',
  btnStandard: 'hover:bg-muted/50 text-muted-foreground',
  btnClose: 'hover:bg-red-500/10 hover:text-red-500 text-muted-foreground'
} as const

// ============================================================================
// Sub-Components
// ============================================================================

interface WindowButtonProps {
  onClick: () => void
  icon: React.ElementType
  label: string
  isClose?: boolean
}

const WindowButton = memo(
  ({ onClick, icon: Icon, label, isClose }: WindowButtonProps): React.JSX.Element => (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(STYLES.btnBase, isClose ? STYLES.btnClose : STYLES.btnStandard)}
    >
      <Icon className={cn(isClose ? 'w-3.5 h-3.5' : 'w-3 h-3')} />
    </Button>
  )
)
WindowButton.displayName = 'WindowButton'

// ============================================================================
// Main Component
// ============================================================================

export const TitleBar = memo((): React.JSX.Element => {
  // Handlers - useCallback ile sabitlendi
  const handleMinimize = useCallback((): void => {
    window.api.window.minimize()
  }, [])

  const handleMaximize = useCallback((): void => {
    window.api.window.maximize()
  }, [])

  const handleClose = useCallback((): void => {
    window.api.window.close()
  }, [])

  return (
    <div className={STYLES.container}>
      {/* App Title */}
      <div className={STYLES.titleWrap}>
        <span className={STYLES.titleText}>Caffio</span>
      </div>

      {/* Window Controls */}
      <div className={STYLES.controlsWrap}>
        <WindowButton icon={Minus} label="Küçült" onClick={handleMinimize} />
        <WindowButton icon={Square} label="Tam Ekran" onClick={handleMaximize} />
        <WindowButton icon={X} label="Kapat" onClick={handleClose} isClose />
      </div>
    </div>
  )
})

TitleBar.displayName = 'TitleBar'
