'use client'

import { getCategoryColor } from '@/features/orders/order-icons'
import { cn, formatCurrency } from '@/lib/utils'
import { parseISO } from 'date-fns'
import { LucideIcon, PieChart as PieChartIcon, TrendingUp } from 'lucide-react'
import React, { memo, useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis
} from 'recharts'
import { useDashboardContext } from '../context/DashboardContext'

const CHART_COLORS = {
  revenue: '#4F46E5', // indigo-600
  hourly: '#059669', // emerald-600
  product: '#7C3AED' // violet-600
} as const

// Chart margins (stable objects)
const AREA_CHART_MARGIN = { left: 20, right: 20, top: 10, bottom: 5 }
const BAR_CHART_MARGIN = { left: 20, right: 20, top: 10, bottom: 5 }

// Tick styles (stable objects - larger for better legibility)
const XAXIS_TICK = { fill: 'currentColor', fontSize: 13, fontWeight: 800 }
const YAXIS_TICK = { fill: 'currentColor', fontSize: 13, fontWeight: 800 }
const HOUR_TICK = { fill: 'currentColor', fontSize: 12, fontWeight: 800 }

const CARD_BASE =
  'h-full flex flex-col bg-card border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm transition-all duration-300 ' +
  'hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 text-foreground'
const HEADER_WRAP = 'flex items-center gap-3 mb-6'
const TITLE = 'text-base font-black text-foreground tracking-tight'
const SUBTITLE =
  'text-[10px] text-zinc-800 dark:text-zinc-200 font-bold tracking-[0.2em] uppercase mt-0.5'
const EMPTY_STATE = 'h-full flex flex-col items-center justify-center gap-3'

// Bar radius (stable arrays)
const BAR_RADIUS_TOP: [number, number, number, number] = [6, 6, 0, 0]

// ============================================================================
// Utility Functions (Stable references)
// ============================================================================

const formatWeekday = (str: string): string => {
  try {
    return parseISO(str).toLocaleDateString('tr-TR', { weekday: 'short' })
  } catch {
    return str
  }
}

// ============================================================================
// SVG Gradient Defs (reusable)
// ============================================================================

const RevenueGradients = memo(function RevenueGradients(): React.JSX.Element {
  return (
    <defs>
      <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CHART_COLORS.revenue} stopOpacity={0.4} />
        <stop offset="75%" stopColor={CHART_COLORS.revenue} stopOpacity={0.1} />
        <stop offset="100%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
      </linearGradient>
    </defs>
  )
})

const HourlyGradients = memo(function HourlyGradients(): React.JSX.Element {
  return (
    <defs>
      <linearGradient id="hourlyBarGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CHART_COLORS.hourly} stopOpacity={1} />
        <stop offset="100%" stopColor={CHART_COLORS.hourly} stopOpacity={0.8} />
      </linearGradient>
    </defs>
  )
})

// Tooltip Components (Removed for minimalist design)
// ============================================================================

// ============================================================================
// Shared Chart Card Component
// ============================================================================

interface ChartCardProps {
  title: string
  subtitle?: string
  icon: LucideIcon
  children: React.ReactNode
  delay: string
  className?: string
  accentColor?: string
}

const ChartCard = memo(function ChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
  delay,
  className,
  accentColor = 'bg-primary'
}: ChartCardProps): React.JSX.Element {
  return (
    <div
      className={cn('animate-in fade-in slide-in-from-bottom-4 fill-mode-both', delay, className)}
    >
      <div className={cn(CARD_BASE, 'relative overflow-hidden')}>
        {/* Top accent line */}
        <div className={cn('absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl', accentColor)} />

        <div className={HEADER_WRAP}>
          <Icon className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <h3 className={TITLE}>{title}</h3>
            {subtitle && <p className={SUBTITLE}>{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  )
})

// ============================================================================
// Chart Components
// ============================================================================

export const WeeklyTrendChart = memo(function WeeklyTrendChart(): React.JSX.Element {
  const { revenueTrend } = useDashboardContext()
  const hasData = revenueTrend.length > 0

  return (
    <ChartCard
      title="Ciro Trendi"
      icon={TrendingUp}
      delay="delay-[400ms]"
      accentColor="bg-indigo-600"
    >
      <div className="h-[280px] w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueTrend} margin={AREA_CHART_MARGIN}>
              <RevenueGradients />
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                strokeOpacity={0.3}
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                dy={10}
                padding={{ left: 25, right: 25 }}
                tick={XAXIS_TICK}
                tickFormatter={formatWeekday}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={85}
                tickMargin={12}
                tick={YAXIS_TICK}
                tickFormatter={formatCurrency}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={CHART_COLORS.revenue}
                strokeWidth={2.5}
                fill="url(#revAreaGrad)"
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 6, fill: CHART_COLORS.revenue, strokeWidth: 3, stroke: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className={EMPTY_STATE}>
            <TrendingUp className="w-10 h-10 text-zinc-200 dark:text-zinc-800" />
            <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">
              Veri Bulunamadı
            </span>
          </div>
        )}
      </div>
    </ChartCard>
  )
})

// ============================================================================
// Category Revenue Chart
// ============================================================================

export const CategoryRevenueChart = memo(function CategoryRevenueChart(): React.JSX.Element {
  const { stats } = useDashboardContext()

  const chartData = useMemo(() => {
    if (!stats?.categoryBreakdown) return []
    return [...stats.categoryBreakdown]
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 8)
      .map((c) => ({
        name: c.categoryName,
        value: c.revenue || 0,
        quantity: c.quantity,
        color: getCategoryColor(c.icon)
      }))
  }, [stats?.categoryBreakdown])

  const totalRevenue = useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.value, 0),
    [chartData]
  )
  const hasData = chartData.length > 0

  return (
    <ChartCard
      title="Kategori Analizi"
      icon={PieChartIcon}
      delay="delay-[500ms]"
      accentColor="bg-indigo-600"
    >
      <div className="flex-1 min-h-[300px] w-full mt-3 mb-2 flex flex-col gap-3 px-1">
        {/* Summary Header */}
        {hasData && (
          <div className="flex items-center justify-between pb-2 mb-0.5 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.25em]">
              Kategori
            </span>
            <span className="text-[11px] font-black text-foreground/50 tabular-nums">
              Toplam {formatCurrency(totalRevenue)}
            </span>
          </div>
        )}
        {hasData ? (
          chartData.map((category, index) => {
            const percentage = totalRevenue > 0 ? (category.value / totalRevenue) * 100 : 0
            return (
              <div
                key={category.name}
                className="flex flex-col gap-1.5 group hover:translate-x-0.5 transition-transform duration-200"
              >
                {/* Row: rank + color bar + name/qty + percent + amount */}
                <div className="flex items-center gap-2.5">
                  {/* Rank */}
                  <span className="text-[11px] font-black tabular-nums w-4 text-right text-foreground/20 shrink-0">
                    {index + 1}
                  </span>
                  {/* Vertical Color Bar */}
                  <div
                    className="w-[3px] h-9 rounded-full shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  {/* Name + Quantity */}
                  <div className="flex-1 min-w-0 flex flex-col gap-0">
                    <span
                      className="text-[13px] font-black text-foreground truncate leading-tight"
                      title={category.name}
                    >
                      {category.name}
                    </span>
                    <span className="text-[10.5px] font-bold text-foreground/40 leading-tight">
                      {category.quantity} adet
                    </span>
                  </div>
                  {/* Percent + Amount */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-black text-foreground/35 tabular-nums">
                      %{percentage.toFixed(0)}
                    </span>
                    <span className="text-[13px] font-black text-foreground tabular-nums min-w-[58px] text-right">
                      {formatCurrency(category.value)}
                    </span>
                  </div>
                </div>
                {/* Progress Bar with Glow */}
                <div className="ml-8 h-2 bg-zinc-100 dark:bg-zinc-800/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: category.color,
                      boxShadow: `0 0 8px 2px ${category.color}4D`
                    }}
                  />
                </div>
              </div>
            )
          })
        ) : (
          <div className={EMPTY_STATE}>
            <PieChartIcon className="w-10 h-10 text-zinc-200 dark:text-zinc-800" />
            <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">
              Veri Bulunamadı
            </span>
          </div>
        )}
      </div>
    </ChartCard>
  )
})

export const HourlyActivityChart = memo(function HourlyActivityChart(): React.JSX.Element {
  const { stats } = useDashboardContext()
  const data = useMemo(() => {
    const rawData = stats?.hourlyActivity || []
    if (rawData.length === 0) return []

    // Dynamic cropping: find first and last hours with data
    let firstIdx = -1
    let lastIdx = -1

    for (let i = 0; i < rawData.length; i++) {
      if ((rawData[i]?.revenue || 0) > 0) {
        if (firstIdx === -1) firstIdx = i
        lastIdx = i
      }
    }

    // Fallback: If no revenue at all, show 08:00 - 23:00 or similar
    if (firstIdx === -1) return rawData.slice(8, 23)

    // Padding: add one hour before and one after for context if bounds allow
    const start = Math.max(0, firstIdx - 1)
    const end = Math.min(rawData.length, lastIdx + 2)

    return rawData.slice(start, end)
  }, [stats?.hourlyActivity])
  const hasData = data.length > 0

  return (
    <ChartCard
      title="Saatlik Yoğunluk"
      icon={TrendingUp}
      delay="delay-[600ms]"
      accentColor="bg-emerald-600"
    >
      <div className="h-[280px] w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={BAR_CHART_MARGIN}>
              <HourlyGradients />
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                strokeOpacity={0.06}
              />
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={HOUR_TICK}
                padding={{ left: 15, right: 15 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={85}
                tickMargin={12}
                tick={HOUR_TICK}
                tickFormatter={formatCurrency}
              />
              <Bar
                dataKey="revenue"
                fill="url(#hourlyBarGrad)"
                radius={BAR_RADIUS_TOP}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className={EMPTY_STATE}>
            <TrendingUp className="w-10 h-10 opacity-15" />
            <span className="text-xs font-medium opacity-30">Veri Bulunamadı</span>
          </div>
        )}
      </div>
    </ChartCard>
  )
})

export const TopProductsChart = memo(function TopProductsChart(): React.JSX.Element {
  const { stats } = useDashboardContext()
  const data = useMemo(() => stats?.topProducts || [], [stats?.topProducts])
  const hasData = data.length > 0
  const maxQuantity = useMemo(
    () => (hasData ? Math.max(...data.map((d) => d.quantity)) : 0),
    [data, hasData]
  )

  return (
    <ChartCard
      title="En Çok Satanlar"
      icon={TrendingUp}
      delay="delay-[800ms]"
      accentColor="bg-violet-600"
    >
      <div className="flex-1 min-h-[300px] w-full mt-5 mb-2 flex flex-col justify-center gap-3.5 px-2">
        {hasData ? (
          data.map((item, i) => {
            const percentage = Math.max((item.quantity / maxQuantity) * 100, 2)
            return (
              <div key={item.productName || i} className="flex items-center gap-4 group">
                {/* Left Side: Quantity & Name */}
                <div className="flex items-center gap-2 w-[45%] shrink-0">
                  <span className="text-xs font-black text-violet-600 w-6 text-right">
                    {item.quantity}x
                  </span>
                  <span
                    className="text-[13px] font-black text-foreground truncate"
                    title={item.productName}
                  >
                    {item.productName}
                  </span>
                </div>

                {/* Right Side: Track & Fill */}
                <div className="flex-1 h-3.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden relative">
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-violet-600 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })
        ) : (
          <div className={EMPTY_STATE}>
            <TrendingUp className="w-10 h-10 opacity-15" />
            <span className="text-xs font-medium opacity-30">Veri Bulunamadı</span>
          </div>
        )}
      </div>
    </ChartCard>
  )
})
