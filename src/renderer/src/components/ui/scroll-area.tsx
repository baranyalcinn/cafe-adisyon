'use client'

import { cn } from '@/lib/utils'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import * as React from 'react'

// ============================================================================
// Styles
// ============================================================================

const STYLES = {
  root: 'relative',
  viewport:
    'focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1 [&>div]:!block',
  scrollbarBase: 'flex touch-none p-px transition-colors select-none',
  scrollbarVertical: 'h-full w-2.5 border-l border-l-transparent absolute right-0 top-0',
  scrollbarHorizontal: 'h-2.5 flex-col border-t border-t-transparent',
  thumb: 'bg-border relative flex-1 rounded-full'
} as const

// ============================================================================
// Components
// ============================================================================

const ScrollArea = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.Root>, // <-- ElementRef yerine ComponentRef kullanıldı
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(
  ({ className, children, ...props }, ref): React.JSX.Element => (
    <ScrollAreaPrimitive.Root
      ref={ref}
      data-slot="scroll-area"
      className={cn(STYLES.root, className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport data-slot="scroll-area-viewport" className={STYLES.viewport}>
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
)
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>, // <-- ElementRef yerine ComponentRef kullanıldı
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(
  ({ className, orientation = 'vertical', ...props }, ref): React.JSX.Element => (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      ref={ref}
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        STYLES.scrollbarBase,
        orientation === 'vertical' && STYLES.scrollbarVertical,
        orientation === 'horizontal' && STYLES.scrollbarHorizontal,
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb data-slot="scroll-area-thumb" className={STYLES.thumb} />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
)
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
