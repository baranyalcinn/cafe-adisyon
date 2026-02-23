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
    // Element mount olana kadar denemeye devam et (React routing için güvenli)
    const interval = setInterval(() => {
      const el = document.getElementById('settings-header-actions')
      if (el) {
        setHeaderTarget(el)
        clearInterval(interval)
      }
    }, 100)
    return () => clearInterval(interval)
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
              className="gap-2 rounded-xl transition-all duration-300 border-2 border-transparent hover:border-zinc-100 dark:hover:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-400 hover:text-foreground font-black tracking-[0.2em] text-[10px] h-10 px-4"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              YENİLE
            </Button>

            <OrderHistoryModal />

            <Button
              onClick={() => setShowEndOfDayModal(true)}
              className="gap-2 h-10 px-5 rounded-xl font-black bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/10 active:scale-95 transition-all text-[10px] tracking-[0.2em]"
            >
              <Moon className="w-4 h-4" />
              GÜN SONU
            </Button>
          </>,
          headerTarget
        )}

      <div className="flex-1 overflow-y-auto px-8 pb-12 space-y-10 bg-background custom-scrollbar">
        {/* Header Section */}
        <div className="flex flex-col gap-1 pt-8 container-fade-in">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tighter text-foreground">Panel</h1>
            <div className="h-6 w-[2px] bg-zinc-100 dark:bg-zinc-800 mt-1" />
            <span className="text-primary font-black tracking-[0.3em] text-[12px] mt-2 uppercase">
              Dashboard
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
        </React.Suspense>

        <React.Suspense
          fallback={
            <div className="w-full h-[400px] flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-muted-foreground/30 animate-spin" />
            </div>
          }
        >
          <HourlyActivityChart />
        </React.Suspense>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <React.Suspense
            fallback={
              <div className="w-full h-[400px] flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-muted-foreground/30 animate-spin" />
              </div>
            }
          >
            <CategoryPieChart />
          </React.Suspense>
          <React.Suspense
            fallback={
              <div className="w-full h-[400px] flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-muted-foreground/30 animate-spin" />
              </div>
            }
          >
            <TopProductsChart />
          </React.Suspense>
        </div>

        <React.Suspense
          fallback={
            <div className="w-full h-[400px] flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-muted-foreground/30 animate-spin" />
            </div>
          }
        >
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
