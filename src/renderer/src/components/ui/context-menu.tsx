'use client'

import { cn } from '@/lib/utils'
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu'
import * as React from 'react'

// ============================================================================
// Styles
// ============================================================================

const STYLES = {
  content:
    'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
  item: 'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
} as const

// ============================================================================
// Core Components
// ============================================================================

const ContextMenu = ContextMenuPrimitive.Root
const ContextMenuTrigger = ContextMenuPrimitive.Trigger

// ============================================================================
// Sub-Components
// ============================================================================

const ContextMenuContent = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Content>, // ElementRef -> ComponentRef
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(
  ({ className, ...props }, ref): React.JSX.Element => (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        ref={ref}
        className={cn(STYLES.content, className)}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  )
)
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName

const ContextMenuItem = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Item>, // ElementRef -> ComponentRef
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean
  }
>(
  ({ className, inset, ...props }, ref): React.JSX.Element => (
    <ContextMenuPrimitive.Item
      ref={ref}
      className={cn(
        STYLES.item,
        inset && 'pl-8', // Inset özelliği varsa soldan boşluk bırak
        className
      )}
      {...props}
    />
  )
)
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName

export { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger }
