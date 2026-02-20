import { Moon, RefreshCw } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { EndOfDayModal } from '@/components/modals/EndOfDayModal'
import { OrderHistoryModal } from '@/components/modals/OrderHistoryModal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Context & Components
import {
  CategoryPieChart,
  HourlyActivityChart,
  TopProductsChart,
  WeeklyTrendChart
} from './components/Charts'
import { KPICards } from './components/KPICards'
import { MonthlyPerformanceChart } from './components/MonthlyChart'
import { RecentZReports } from './components/RecentZReports'
import { DashboardProvider, useDashboardContext } from './context/DashboardContext'

function DashboardSkeleton(): React.JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto px-8 pb-12 space-y-10 bg-background custom-scrollbar w-full">
      <div className="flex flex-col gap-1 pt-8">
        <div className="h-10 w-64 bg-muted/60 animate-pulse rounded-lg" />
        <div className="h-4 w-32 bg-muted/40 animate-pulse rounded-md mt-2" />
      </div>

      {/* KPI Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border/50 rounded-[2rem] p-6 h-[140px] flex flex-col justify-center space-y-4"
          >
            <div className="w-8 h-8 rounded-full bg-muted/50 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted/30 animate-pulse rounded-md" />
              <div className="h-8 w-32 bg-muted/60 animate-pulse rounded-lg" />
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

function DashboardContent(): React.JSX.Element {
  const { isLoading, refetchAll, showEndOfDayModal, setShowEndOfDayModal } = useDashboardContext()
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setHeaderTarget(document.getElementById('settings-header-actions'))
  }, [])

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="h-full flex flex-col overflow-hidden text-foreground">
      {/* Header Actions via Portal */}
      {headerTarget &&
        createPortal(
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={refetchAll}
              disabled={isLoading}
              className="gap-2 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground font-bold tracking-[0.1em] text-[10px] uppercase h-9 px-4"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              Yenile
            </Button>

            <OrderHistoryModal />

            <Button
              onClick={() => setShowEndOfDayModal(true)}
              className="gap-3 h-9 px-5 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20 active:scale-95 transition-all text-xs tracking-widest uppercase"
            >
              <Moon className="w-3.5 h-3.5" />
              Gün Sonu
            </Button>
          </>,
          headerTarget
        )}

      <div className="flex-1 overflow-y-auto px-8 pb-12 space-y-10 bg-background custom-scrollbar">
        {/* Header Section */}
        <div className="flex flex-col gap-1 pt-8 animate-in fade-in duration-500 fill-mode-both">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tight text-foreground">Yönetim Paneli</h1>
            <div className="h-6 w-[1px] bg-border mt-1" />
            <span className="text-muted-foreground/70 font-black tracking-[0.3em] text-[12px] uppercase mt-2">
              DASHBOARD
            </span>
          </div>
        </div>

        {/* Dashboard Components */}
        <KPICards />
        <WeeklyTrendChart />
        <HourlyActivityChart />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CategoryPieChart />
          <TopProductsChart />
        </div>

        <MonthlyPerformanceChart />
        <RecentZReports />
      </div>

      {showEndOfDayModal && (
        <EndOfDayModal open={showEndOfDayModal} onClose={() => setShowEndOfDayModal(false)} />
      )}
    </div>
  )
}

export function DashboardView(): React.JSX.Element {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  )
}
