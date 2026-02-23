import React from 'react'

export function DashboardSkeleton(): React.JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto px-8 pb-12 space-y-10 bg-background custom-scrollbar w-full">
      <div className="flex flex-col gap-1 pt-8">
        <div className="h-10 w-64 bg-muted/60 animate-pulse rounded-lg" />
        <div className="h-4 w-32 bg-muted/40 animate-pulse rounded-md mt-2" />
      </div>

      {/* KPI Skeletons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border/50 rounded-2xl px-5 py-4 space-y-3">
            <div className="w-6 h-6 rounded-lg bg-muted/50 animate-pulse" />
            <div className="space-y-2">
              <div className="h-8 w-28 bg-muted/60 animate-pulse rounded-md" />
              <div className="h-3 w-20 bg-muted/30 animate-pulse rounded-sm" />
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Trend Skeleton */}
      <div className="bg-card border border-border/50 rounded-[2rem] p-10 h-[400px] flex items-center justify-center">
        <div className="w-full h-full bg-muted/20 animate-pulse rounded-xl" />
      </div>

      {/* Hourly & Payments Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-[2rem] p-10 h-[350px]">
          <div className="w-full h-full bg-muted/20 animate-pulse rounded-xl" />
        </div>
        <div className="bg-card border border-border/50 rounded-[2rem] p-10 h-[350px]">
          <div className="w-full h-full bg-muted/20 animate-pulse rounded-xl" />
        </div>
      </div>

      {/* Category & Top Products Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card border border-border/50 rounded-[2rem] p-10 h-[500px]">
          <div className="w-full h-full bg-muted/20 animate-pulse rounded-full max-w-[300px] max-h-[300px] mx-auto mt-10" />
        </div>
        <div className="bg-card border border-border/50 rounded-[2rem] p-10 h-[500px]">
          <div className="w-full h-full bg-muted/20 animate-pulse rounded-xl" />
        </div>
      </div>
    </div>
  )
}
