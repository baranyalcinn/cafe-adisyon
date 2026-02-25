'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

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
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { useDashboardContext } from '../context/DashboardContext'

// ============================================================================
// Types
// ============================================================================

interface HourlyDataPoint {
  hour: string
  revenue: number
  orderCount: number
}

interface ProductDataPoint {
  productName: string
  quantity: number
}

// ============================================================================
// Constants (Module level - stable references)
// ============================================================================

const CHART_COLORS = {
  revenue: '#2563EB', // muted indigo-blue
  hourly: '#059669', // deep emerald
  product: '#7C3AED' // refined violet
} as const

const CARD_BASE =
  'bg-card border border-border/50 rounded-[2rem] p-8 shadow-sm transition-[border-color,transform] duration-300 hover:border-primary/20 text-foreground'
const HEADER_WRAP = 'flex items-center gap-4 mb-10'
const TITLE = 'text-xl font-black text-foreground tracking-tight'
const SUBTITLE = 'text-[10px] text-muted-foreground/70 font-black tracking-[0.2em] uppercase'
const EMPTY_STATE = 'h-full flex flex-col items-center justify-center space-y-4'
const TOOLTIP_CARD = 'bg-card border border-border/80 p-4 rounded-2xl shadow-xl min-w-[160px]'
const TOOLTIP_LABEL =
  'text-[10px] font-black text-muted-foreground/60 tracking-[0.25em] mb-2 uppercase'
const TOOLTIP_VALUE = 'text-2xl font-black text-foreground tabular-nums'

// Chart margins (stable objects)
const AREA_CHART_MARGIN = { left: 10, right: 25, top: 10, bottom: 5 }
const BAR_CHART_MARGIN = { left: 10, right: 25, top: 10, bottom: 5 }
const VERTICAL_BAR_MARGIN = { left: 20, right: 40, top: 10, bottom: 10 }

// Tick styles (stable objects)
const XAXIS_TICK = { fill: 'currentColor', fontSize: 11, fontWeight: 800 }
const YAXIS_TICK = { fill: 'currentColor', fontSize: 11, fontWeight: 800 }
const HOUR_TICK = { fill: 'currentColor', fontSize: 10, fontWeight: 700 }
const PRODUCT_TICK = { fill: 'currentColor', fontSize: 10, fontWeight: 800 }

// Tooltip cursor (stable object)
const TOOLTIP_CURSOR = { fill: 'currentColor', opacity: 0.05 }

// Bar radius (stable arrays)
const BAR_RADIUS_TOP: [number, number, number, number] = [4, 4, 0, 0]
const BAR_RADIUS_RIGHT: [number, number, number, number] = [0, 4, 4, 0]

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

const formatFullDate = (str: string): string => {
  try {
    return parseISO(str).toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  } catch {
    return str
  }
}

// ============================================================================
// Tooltip Components (Memoized)
// ============================================================================

const RevenueTooltipContent = memo(function RevenueTooltipContent({
  active,
  payload,
  label
}: any): React.JSX.Element | null {
  if (!active || !payload?.length) return null
  const dateStr = formatFullDate(label || '')

  return (
    <div className={TOOLTIP_CARD}>
      <p className={TOOLTIP_LABEL}>{dateStr}</p>
      <p className={TOOLTIP_VALUE}>{formatCurrency(payload[0].value as number)}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="text-[9px] font-black text-primary tracking-[0.2em]">GÜNLÜK GELİR</span>
      </div>
    </div>
  )
})

const HourlyTooltipContent = memo(function HourlyTooltipContent({
  active,
  payload,
  label
}: any): React.JSX.Element | null {
  if (!active || !payload?.length) return null
  const data = payload[0].payload as HourlyDataPoint

  return (
    <div className={TOOLTIP_CARD}>
      <p className={TOOLTIP_LABEL}>SAAT {label}</p>
      <p className="text-xl font-black text-foreground tabular-nums">
        {formatCurrency(data.revenue)}
      </p>
      <p className="text-[9px] font-black text-primary/60 mt-1 uppercase">
        {data.orderCount} SİPARİŞ
      </p>
    </div>
  )
})

const ProductTooltipContent = memo(function ProductTooltipContent({
  active,
  payload
}: any): React.JSX.Element | null {
  if (!active || !payload?.length) return null
  const item = payload[0].payload as ProductDataPoint

  return (
    <div className={TOOLTIP_CARD}>
      <p className={TOOLTIP_LABEL}>{item.productName}</p>
      <p className="text-xl font-black text-primary">
        {item.quantity} <span className="text-[10px] opacity-50">ADET</span>
      </p>
    </div>
  )
})

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
}

const ChartCard = memo(function ChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
  delay,
  className
}: ChartCardProps): React.JSX.Element {
  return (
    <div
      className={cn('animate-in fade-in slide-in-from-bottom-4 fill-mode-both', delay, className)}
    >
      <div className={CARD_BASE}>
        <div className={HEADER_WRAP}>
          <Icon className="w-6 h-6 text-primary drop-shadow-sm" />
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

const AreaGradient = memo(function AreaGradient(): React.JSX.Element {
  return (
    <defs>
      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CHART_COLORS.revenue} stopOpacity={0.15} />
        <stop offset="100%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
      </linearGradient>
    </defs>
  )
})

export const WeeklyTrendChart = memo(function WeeklyTrendChart(): React.JSX.Element {
  const { revenueTrend } = useDashboardContext()
  const hasData = revenueTrend.length > 0

  return (
    <ChartCard
      title="Haftalık Performans"
      subtitle="SON 7 GÜNLÜK CİRO ANALİZİ"
      icon={TrendingUp}
      delay="delay-[400ms]"
    >
      <div className="h-[300px] w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueTrend} margin={AREA_CHART_MARGIN}>
              <AreaGradient />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                dy={10}
                tick={XAXIS_TICK}
                tickFormatter={formatWeekday}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={80}
                tick={YAXIS_TICK}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<RevenueTooltipContent />} isAnimationActive={false} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={CHART_COLORS.revenue}
                strokeWidth={5}
                fill="url(#revGrad)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className={EMPTY_STATE}>
            <TrendingUp className="w-10 h-10 opacity-20 animate-pulse" />
          </div>
        )}
      </div>
    </ChartCard>
  )
})

// ============================================================================
// Category Revenue Chart (Horizontal Bar Chart for better readability)
// ============================================================================

export const CategoryRevenueChart = memo(function CategoryRevenueChart(): React.JSX.Element {
  const { stats } = useDashboardContext()

  const chartData = useMemo(() => {
    if (!stats?.categoryBreakdown) return []
    // Gelire göre sırala (Büyükten küçüğe)
    return [...stats.categoryBreakdown]
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 8) // Sadece ilk 8 kategori (Görsel düzen için)
      .map((c) => ({
        name: c.categoryName,
        value: c.revenue || 0,
        quantity: c.quantity
      }))
  }, [stats?.categoryBreakdown])

  const hasData = chartData.length > 0

  return (
    <ChartCard
      title="Kategori Analizi"
      subtitle="KATEGORİ BAZLI GELİR DAĞILIMI"
      icon={PieChartIcon}
      delay="delay-[500ms]"
    >
      <div className="h-[320px] w-full pt-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              barGap={12}
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                width={100}
                tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500, opacity: 0.7 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)', radius: 8 }}
                content={<ProductTooltipContent />}
              />
              <Bar
                dataKey="value"
                radius={[0, 8, 8, 0]}
                barSize={24}
                fill={CHART_COLORS.revenue}
                animationDuration={1500}
                animationEasing="ease-out"
              >
                {/* Her çubuğun üzerine değerini yazan etiket (isteğe bağlı) */}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className={EMPTY_STATE}>
            <PieChartIcon className="w-10 h-10 opacity-20" />
            <span className="text-xs font-medium opacity-40 mt-2">Veri Bulunamadı</span>
          </div>
        )}
      </div>
    </ChartCard>
  )
})

export const HourlyActivityChart = memo(function HourlyActivityChart(): React.JSX.Element {
  const { stats } = useDashboardContext()
  const data = useMemo(() => stats?.hourlyActivity || [], [stats?.hourlyActivity])
  const hasData = data.length > 0

  return (
    <ChartCard
      title="Saatlik Yoğunluk"
      subtitle="GÜNLÜK SATIŞ DAĞILIMI"
      icon={TrendingUp}
      delay="delay-[600ms]"
    >
      <div className="h-[300px] w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={BAR_CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
              <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={HOUR_TICK} />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={80}
                tick={HOUR_TICK}
                tickFormatter={formatCurrency}
              />
              <Tooltip cursor={TOOLTIP_CURSOR} content={<HourlyTooltipContent />} />
              <Bar
                dataKey="revenue"
                fill={CHART_COLORS.hourly}
                radius={BAR_RADIUS_TOP}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className={EMPTY_STATE}>
            <TrendingUp className="w-10 h-10 opacity-20" />
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
    <ChartCard title="En Çok Satanlar" icon={TrendingUp} delay="delay-[800ms]">
      <div className="h-[320px] w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={VERTICAL_BAR_MARGIN}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="productName"
                axisLine={false}
                tickLine={false}
                width={120}
                tick={PRODUCT_TICK}
              />
              <Tooltip cursor={TOOLTIP_CURSOR} content={<ProductTooltipContent />} />
              <Bar
                dataKey="quantity"
                fill={CHART_COLORS.product}
                radius={BAR_RADIUS_RIGHT}
                barSize={12}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className={EMPTY_STATE}>
            <TrendingUp className="w-10 h-10 opacity-20" />
          </div>
        )}
      </div>
    </ChartCard>
  )
})
