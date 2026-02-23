import { AlertCircle, Moon, RefreshCw } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { EndOfDayModal } from '@/components/modals/EndOfDayModal'
import { OrderHistoryModal } from '@/components/modals/OrderHistoryModal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Context & Components
import { DashboardSkeleton } from './components/DashboardSkeleton'
import { KPICards } from './components/KPICards'
import { RecentZReports } from './components/RecentZReports'
import { DashboardProvider, useDashboardContext } from './context/DashboardContext'

const CategoryPieChart = React.lazy(() =>
  import('./components/Charts').then((m) => ({ default: m.CategoryPieChart }))
)
const HourlyActivityChart = React.lazy(() =>
  import('./components/Charts').then((m) => ({ default: m.HourlyActivityChart }))
)
const TopProductsChart = React.lazy(() =>
  import('./components/Charts').then((m) => ({ default: m.TopProductsChart }))
)
const WeeklyTrendChart = React.lazy(() =>
  import('./components/Charts').then((m) => ({ default: m.WeeklyTrendChart }))
)
const MonthlyPerformanceChart = React.lazy(() =>
  import('./components/MonthlyChart').then((m) => ({ default: m.MonthlyPerformanceChart }))
)

function DashboardContent(): React.JSX.Element {
  const { isLoading, isError, refetchAll, showEndOfDayModal, setShowEndOfDayModal } =
    useDashboardContext()
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setHeaderTarget(document.getElementById('settings-header-actions'))
  }, [])

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-3xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-foreground">Veri Yüklenemedi</h2>
            <p className="text-muted-foreground font-medium max-w-md">
              Dashboard verileri alınırken bir sorun oluştu. Lütfen tekrar deneyin.
            </p>
          </div>
          <Button onClick={refetchAll} className="gap-2 mt-2 rounded-xl font-bold">
            <RefreshCw className="w-4 h-4" />
            Tekrar Dene
          </Button>
        </div>
      </div>
    )
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
        <React.Suspense
          fallback={
            <div className="w-full h-[400px] flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-muted-foreground/30 animate-spin" />
            </div>
          }
        >
          <WeeklyTrendChart />
          <HourlyActivityChart />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <CategoryPieChart />
            <TopProductsChart />
          </div>

          <MonthlyPerformanceChart />
        </React.Suspense>
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
