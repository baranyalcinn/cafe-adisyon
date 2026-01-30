import React from 'react'
import { Minus, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TitleBar(): React.JSX.Element {
  const handleMinimize = (): void => {
    window.api.window.minimize()
  }

  const handleMaximize = (): void => {
    window.api.window.maximize()
  }

  const handleClose = (): void => {
    window.api.window.close()
  }

  return (
    <div className="titlebar-drag h-8 bg-background/95 border-b border-border/10 flex items-center justify-between px-3 select-none backdrop-blur-md">
      {/* App Title */}
      <div className="flex items-center gap-3 titlebar-no-drag">
        <span className="text-sm font-bold text-foreground/80 tracking-wide pl-2">Caffio</span>
      </div>

      {/* Window Controls */}
      <div className="flex items-center gap-1 titlebar-no-drag">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMinimize}
          className="h-7 w-7 rounded-sm hover:bg-muted/50 transition-colors"
        >
          <Minus className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMaximize}
          className="h-7 w-7 rounded-sm hover:bg-muted/50 transition-colors"
        >
          <Square className="w-3 h-3 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-7 w-7 rounded-sm hover:bg-red-500/10 hover:text-red-500 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
