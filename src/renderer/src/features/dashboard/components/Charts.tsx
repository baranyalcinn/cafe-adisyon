'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

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
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  XAxis,
  YAxis
} from 'recharts'
import { useDashboardContext } from '../context/DashboardContext'

const PieAny: any = Pie

const CHART_COLORS = {
  revenue: '#4F46E5', // indigo-600
  hourly: '#059669', // emerald-600
  product: '#7C3AED' // violet-600
} as const

const PIE_COLORS = [
  '#4F46E5', // Indigo
  '#059669', // Emerald
  '#D97706', // Amber
  '#7C3AED', // Violet
  '#DC2626', // Red
  '#2563EB', // Blue
  '#0891B2', // Cyan
  '#71717A' // Zinc
]

// Chart margins (stable objects)
const AREA_CHART_MARGIN = { left: 20, right: 20, top: 10, bottom: 5 }
const BAR_CHART_MARGIN = { left: 20, right: 20, top: 10, bottom: 5 }
const VERTICAL_BAR_MARGIN = { left: 20, right: 40, top: 10, bottom: 10 }

// Tick styles (stable objects - larger for better legibility)
const XAXIS_TICK = { fill: 'currentColor', fontSize: 13, fontWeight: 800 }
const YAXIS_TICK = { fill: 'currentColor', fontSize: 13, fontWeight: 800 }
const HOUR_TICK = { fill: 'currentColor', fontSize: 12, fontWeight: 800 }
const PRODUCT_TICK = { fill: 'currentColor', fontSize: 12, fontWeight: 800 }

const CARD_BASE =
  'bg-card border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm transition-all duration-300 ' +
  'hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 text-foreground'
const HEADER_WRAP = 'flex items-center gap-3 mb-6'
const TITLE = 'text-base font-black text-foreground tracking-tight'
const SUBTITLE =
  'text-[10px] text-zinc-800 dark:text-zinc-200 font-bold tracking-[0.2em] uppercase mt-0.5'
const EMPTY_STATE = 'h-full flex flex-col items-center justify-center gap-3'

// Bar radius (stable arrays)
const BAR_RADIUS_TOP: [number, number, number, number] = [6, 6, 0, 0]
const BAR_RADIUS_RIGHT: [number, number, number, number] = [0, 6, 6, 0]

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

// Active Shape for Donut Chart (Premium 2025 Feel)
const renderActiveShape = (props: any): React.JSX.Element => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="transition-all duration-300"
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 10}
        fill={fill}
        opacity={0.3}
      />
    </g>
  )
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

const ProductGradients = memo(function ProductGradients(): React.JSX.Element {
  return (
    <defs>
      <linearGradient id="productBarGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={CHART_COLORS.product} stopOpacity={1} />
        <stop offset="100%" stopColor={CHART_COLORS.product} stopOpacity={0.9} />
      </linearGradient>
      <linearGradient id="categoryBarGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={CHART_COLORS.revenue} stopOpacity={1} />
        <stop offset="100%" stopColor={CHART_COLORS.revenue} stopOpacity={0.9} />
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
  const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined)

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
  const topCategories = chartData.slice(0, 6)

  const onPieEnter = (_: any, index: number): void => {
    setActiveIndex(index)
  }

  const onPieLeave = (): void => {
    setActiveIndex(undefined)
  }

  return (
    <ChartCard
      title="Kategori Analizi"
      icon={PieChartIcon}
      delay="delay-[500ms]"
      accentColor="bg-indigo-600"
    >
      <div className="h-[300px] w-full pt-2">
        {hasData ? (
          <div className="flex h-full items-center">
            {/* Left: Pie Chart */}
            <div className="w-[45%] h-full relative group/pie">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <PieAny
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={5}
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                    isAnimationActive={true}
                    animationDuration={800}
                    stroke="none"
                  >
                    {chartData.map((entry: any, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]}
                        className="outline-none"
                      />
                    ))}
                  </PieAny>
                </PieChart>
              </ResponsiveContainer>

              {/* Central text indicator */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest blur-[0.2px]">
                  Toplam
                </span>
                <span className="text-sm font-black text-foreground tabular-nums tracking-tight">
                  {formatCurrency(totalRevenue).replace('₺', '')}
                  <span className="ml-0.5 text-[10px] font-bold text-foreground/60">₺</span>
                </span>
              </div>
            </div>

            {/* Right: Custom Legend */}
            <div className="w-[55%] flex flex-col justify-center pl-6 gap-3">
              {topCategories.map((category, index) => (
                <div
                  key={category.name}
                  className={cn(
                    'flex items-center justify-between group cursor-pointer transition-all duration-300',
                    activeIndex === index ? 'translate-x-1.5' : 'opacity-80 hover:opacity-100'
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(undefined)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-2.5 h-2.5 rounded-full shadow-sm transition-transform duration-300',
                        activeIndex === index ? 'scale-125' : ''
                      )}
                      style={{
                        backgroundColor: category.color || PIE_COLORS[index % PIE_COLORS.length]
                      }}
                    />
                    <span
                      className={cn(
                        'text-sm font-black transition-colors truncate max-w-[120px]',
                        activeIndex === index ? 'text-primary' : 'text-foreground/70'
                      )}
                    >
                      {category.name}
                    </span>
                  </div>
                  <span className="text-sm font-black tabular-nums text-foreground">
                    {formatCurrency(category.value)}
                  </span>
                </div>
              ))}
              {chartData.length > 6 && (
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pt-2.5 mt-1 border-t border-zinc-100 dark:border-zinc-800/50">
                  + {chartData.length - 6} Diğer Kategori
                </div>
              )}
            </div>
          </div>
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

  return (
    <ChartCard
      title="En Çok Satanlar"
      icon={TrendingUp}
      delay="delay-[800ms]"
      accentColor="bg-violet-600"
    >
      <div className="h-[300px] w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={VERTICAL_BAR_MARGIN}>
              <ProductGradients />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="productName"
                axisLine={false}
                tickLine={false}
                width={120}
                tick={PRODUCT_TICK}
              />
              <Bar
                dataKey="quantity"
                fill="url(#productBarGrad)"
                radius={BAR_RADIUS_RIGHT}
                barSize={14}
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
