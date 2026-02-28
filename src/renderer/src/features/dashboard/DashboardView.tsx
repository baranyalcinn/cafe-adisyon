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

// ============================================================================
// Lazy Loaded Charts
// ============================================================================

const CategoryRevenueChart = React.lazy(
  (): Promise<{ default: React.ComponentType }> =>
    import('./components/Charts').then((m) => ({ default: m.CategoryRevenueChart }))
)
const HourlyActivityChart = React.lazy(
  (): Promise<{ default: React.ComponentType }> =>
    import('./components/Charts').then((m) => ({ default: m.HourlyActivityChart }))
)
const TopProductsChart = React.lazy(
  (): Promise<{ default: React.ComponentType }> =>
    import('./components/Charts').then((m) => ({ default: m.TopProductsChart }))
)
const WeeklyTrendChart = React.lazy(
  (): Promise<{ default: React.ComponentType }> =>
    import('./components/Charts').then((m) => ({ default: m.WeeklyTrendChart }))
)
const MonthlyPerformanceChart = React.lazy(
  (): Promise<{ default: React.ComponentType }> =>
    import('./components/MonthlyChart').then((m) => ({ default: m.MonthlyPerformanceChart }))
)

// ============================================================================
// Constants & Styles
// ============================================================================

const STYLES = {
  container: 'h-full flex flex-col overflow-hidden text-foreground',
  scrollArea: 'flex-1 overflow-y-auto px-8 pb-12 space-y-6 bg-background custom-scrollbar',

  // Header Actions
  refreshBtn:
    'gap-2 rounded-xl transition-all duration-300 border-2 border-transparent hover:border-zinc-100 dark:hover:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-400 hover:text-foreground font-black tracking-[0.2em] text-[10px] h-10 px-4',
  endOfDayBtn:
    'gap-2 h-10 px-5 rounded-xl font-black bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/10 active:scale-95 transition-all text-[10px] tracking-[0.2em]',

  // Title Section
  titleSection: 'flex flex-col gap-1 pt-6 container-fade-in',
  titleWrap: 'flex items-end gap-4',
  title: 'text-3xl font-black tracking-tighter text-foreground leading-none',
  titleDivider: 'h-5 w-[2px] bg-border mb-0.5',
  subtitle: 'text-primary font-black tracking-[0.3em] text-[12px] uppercase',
  dateLabel: 'text-s font-bold text-foreground tracking-wider ml-auto mb-0.5',

  // Section Headers
  sectionWrap: 'flex items-center gap-4',
  sectionLabel:
    'text-[10px] font-black uppercase tracking-[0.3em] text-zinc-800 dark:text-zinc-200 whitespace-nowrap',
  sectionLine: 'flex-1 h-px bg-border/60',

  // Grid Layouts
  chartsGrid: 'grid grid-cols-1 lg:grid-cols-2 gap-6',

  // Fallback
  chartFallback: 'w-full h-[340px] flex items-center justify-center'
} as const

// ============================================================================
// Sub-Components
// ============================================================================

const ChartFallback = (): React.JSX.Element => (
  <div className={STYLES.chartFallback}>
    <RefreshCw className="w-6 h-6 text-zinc-400 dark:text-zinc-600 animate-spin" />
  </div>
)

const SectionHeader = ({ label }: { label: string }): React.JSX.Element => (
  <div className={STYLES.sectionWrap}>
    <span className={STYLES.sectionLabel}>{label}</span>
    <div className={STYLES.sectionLine} />
  </div>
)

const DashboardErrorState = ({ onRetry }: { onRetry: () => void }): React.JSX.Element => (
  <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-3xl bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-foreground">Veri Yüklenemedi</h2>
        <p className="text-foreground font-semibold max-w-md">
          Dashboard verileri alınırken bir sorun oluştu. Lütfen tekrar deneyin.
        </p>
      </div>
      <Button onClick={onRetry} className="gap-2 mt-2 rounded-xl font-bold">
        <RefreshCw className="w-4 h-4" />
        Tekrar Dene
      </Button>
    </div>
  </div>
)

// ============================================================================
// Main Component
// ============================================================================

function DashboardContent(): React.JSX.Element {
  const { isLoading, isError, refetchAll, showEndOfDayModal, setShowEndOfDayModal } =
    useDashboardContext()
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      const el = document.getElementById('settings-header-actions')
      if (el) {
        setHeaderTarget(el)
        clearInterval(interval)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  // Current date formatted in Turkish
  const currentDate = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long'
  })

  if (isLoading) return <DashboardSkeleton />
  if (isError) return <DashboardErrorState onRetry={refetchAll} />

  return (
    <div className={STYLES.container}>
      {/* Header Actions via Portal */}
      {headerTarget &&
        createPortal(
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={refetchAll}
              disabled={isLoading}
              className={STYLES.refreshBtn}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              YENİLE
            </Button>

            <OrderHistoryModal />

            <Button onClick={() => setShowEndOfDayModal(true)} className={STYLES.endOfDayBtn}>
              <Moon className="w-4 h-4" />
              GÜN SONU
            </Button>
          </>,
          headerTarget
        )}

      {/* Main Content Area */}
      <div className={STYLES.scrollArea}>
        {/* Header Title Section */}
        <div className={STYLES.titleSection}>
          <div className={STYLES.titleWrap}>
            <h1 className={STYLES.title}>Panel</h1>
            <div className={STYLES.titleDivider} />
            <span className={STYLES.subtitle}>Dashboard</span>
            <span className={STYLES.dateLabel}>{currentDate}</span>
          </div>
        </div>

        {/* KPI Cards */}
        <KPICards />

        {/* Weekly Trend */}
        <SectionHeader label="Satış Analizi" />
        <React.Suspense fallback={<ChartFallback />}>
          <WeeklyTrendChart />
        </React.Suspense>

        {/* Hourly Activity */}
        <React.Suspense fallback={<ChartFallback />}>
          <HourlyActivityChart />
        </React.Suspense>

        {/* 2-Column Charts */}
        <SectionHeader label="Kategori ve Ürünler" />
        <div className={STYLES.chartsGrid}>
          <React.Suspense fallback={<ChartFallback />}>
            <CategoryRevenueChart />
          </React.Suspense>

          <React.Suspense fallback={<ChartFallback />}>
            <TopProductsChart />
          </React.Suspense>
        </div>

        {/* Monthly */}
        <SectionHeader label="Aylık Performans" />
        <React.Suspense fallback={<ChartFallback />}>
          <MonthlyPerformanceChart />
        </React.Suspense>

        <RecentZReports />
      </div>

      {/* Modals */}
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
