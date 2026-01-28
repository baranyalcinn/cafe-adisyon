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
    <div className="titlebar-drag h-10 bg-background/95 border-b border-white/5 flex items-center justify-between px-4 select-none backdrop-blur-md">
      {/* App Title */}
      <div className="flex items-center gap-3 titlebar-no-drag">
        <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
          <span className="text-primary font-black text-xs">C</span>
        </div>
        <span className="text-sm font-bold text-foreground/80 tracking-wide">Caffio</span>
      </div>

      {/* Window Controls */}
      <div className="flex items-center gap-1 titlebar-no-drag">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMinimize}
          className="h-8 w-8 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <Minus className="w-4 h-4 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMaximize}
          className="h-8 w-8 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <Square className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
