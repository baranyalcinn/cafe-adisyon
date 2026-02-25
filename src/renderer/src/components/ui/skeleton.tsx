import { cn } from '@/lib/utils'
import * as React from 'react'

/** * Skeleton bileşeni için temel stiller.
 * animate-pulse: Klasik yavaşça yanıp sönme efekti.
 * bg-muted/50: Uygulamanın genel renk paletiyle uyumlu hafif gri ton.
 */
const SKELETON_BASE_STYLE = 'animate-pulse rounded-md bg-muted/50'

const Skeleton = React.forwardRef<React.ComponentRef<'div'>, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref): React.JSX.Element => {
    return (
      <div
        ref={ref}
        data-slot="skeleton"
        className={cn(SKELETON_BASE_STYLE, className)}
        {...props}
      />
    )
  }
)

Skeleton.displayName = 'Skeleton'

export { Skeleton }
