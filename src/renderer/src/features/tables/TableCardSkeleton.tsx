import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import React, { memo } from 'react'

// ============================================================================
// Styles (Centralized)
// ============================================================================

const STYLES = {
  card: 'relative overflow-hidden border-none bg-card/60 backdrop-blur-md shadow-lg h-32 md:h-40',
  header: 'flex flex-row items-center justify-between space-y-0 pb-2',
  content: 'flex flex-col gap-2 mt-2',
  badgeRow: 'flex justify-between items-center mt-4',
  // Parlama efekti simülasyonu
  shineEffect:
    'absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 -translate-x-full animate-pulse pointer-events-none'
} as const

// ============================================================================
// Main Component
// ============================================================================

export const TableCardSkeleton = memo((): React.JSX.Element => {
  return (
    <Card className={STYLES.card}>
      {/* Header Placeholder */}
      <CardHeader className={STYLES.header}>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-12" />
      </CardHeader>

      {/* Main Content Placeholder */}
      <CardContent>
        <div className={STYLES.content}>
          {/* Table ID Circle Placeholder */}
          <Skeleton className="h-8 w-16 mx-auto rounded-full" />

          {/* Footer Stats Placeholder */}
          <div className={STYLES.badgeRow}>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardContent>

      {/* Premium Shine Overlay */}
      <div className={STYLES.shineEffect} />
    </Card>
  )
})

TableCardSkeleton.displayName = 'TableCardSkeleton'
