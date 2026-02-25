'use client'

import { cn, formatCurrency } from '@/lib/utils'
import { parseISO } from 'date-fns'
import { LucideIcon, PieChart as PieChartIcon, TrendingUp } from 'lucide-react'
import React, { memo, useCallback, useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { useDashboardContext } from '../context/DashboardContext'

// ============================================================================
// Types
// ============================================================================

interface PieDataPoint {
  name: string
  value: number
  quantity: number
  color: string
}

interface RevenueTooltipPayload {
  name: string
  value: number
  color?: string
  payload: {
    date: string
    revenue: number
  }
}

interface RevenueTooltipProps {
  active?: boolean
  payload?: RevenueTooltipPayload[]
  label?: string
}

/** Recharts Sector Props tanımı */

const CHART_COLORS = {
  revenue: '#007AFF',
  hourly: '#10b981',
  product: '#8b5cf6'
} as const

// ============================================================================
// Styles
// ============================================================================

const STYLES = {
  cardBase:
    'bg-card border border-border/50 rounded-[2rem] p-8 shadow-sm transition-[border-color,transform] duration-300 hover:border-primary/20 text-foreground',
  headerWrap: 'flex items-center gap-4 mb-10',
  title: 'text-xl font-black text-foreground tracking-tight',
  subtitle: 'text-[10px] text-muted-foreground/70 font-black tracking-[0.2em] uppercase',
  emptyStateWrap: 'h-full flex flex-col items-center justify-center space-y-4',
  tooltipCard: 'bg-card border border-border/80 p-4 rounded-2xl shadow-xl min-w-[160px]',
  tooltipLabel: 'text-[10px] font-black text-muted-foreground/60 tracking-[0.25em] mb-2 uppercase',
  tooltipValue: 'text-2xl font-black text-foreground tabular-nums'
} as const

// ============================================================================
// Shared Sub-Components
// ============================================================================

const ChartCard = ({
  title,
  subtitle,
  icon: Icon,
  children,
  delay,
  className
}: {
  title: string
  subtitle?: string
  icon: LucideIcon
  children: React.ReactNode
  delay: string
  className?: string
}): React.JSX.Element => (
  <div
    className={cn(
      'animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both',
      delay,
      className
    )}
  >
    <div className={STYLES.cardBase}>
      <div className={STYLES.headerWrap}>
        <Icon className="w-6 h-6 text-primary drop-shadow-sm" />
        <div>
          <h3 className={STYLES.title}>{title}</h3>
          {subtitle && <p className={STYLES.subtitle}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  </div>
)

const RevenueTooltip = ({
  active,
  label,
  payload
}: RevenueTooltipProps): React.JSX.Element | null => {
  if (!active || !payload?.length) return null

  const dateStr =
    label && !isNaN(parseISO(label).getTime())
      ? parseISO(label).toLocaleDateString('tr-TR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        })
      : label

  return (
    <div className={STYLES.tooltipCard}>
      <p className={STYLES.tooltipLabel}>{dateStr}</p>
      <p className={STYLES.tooltipValue}>{formatCurrency(payload[0].value)}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="text-[9px] font-black text-primary tracking-[0.2em]">GÜNLÜK GELİR</span>
      </div>
    </div>
  )
}

// ============================================================================
// Main Charts
// ============================================================================

export const WeeklyTrendChart = memo((): React.JSX.Element => {
  const { revenueTrend } = useDashboardContext()

  return (
    <ChartCard
      title="Haftalık Performans"
      subtitle="SON 7 GÜNLÜK CİRO ANALİZİ"
      icon={TrendingUp}
      delay="delay-[400ms]"
    >
      <div className="h-[300px] w-full">
        {revenueTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueTrend} margin={{ left: 10, right: 25, top: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.revenue} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                dy={10}
                tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 800 }}
                tickFormatter={(str): string =>
                  parseISO(str).toLocaleDateString('tr-TR', { weekday: 'short' })
                }
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={80}
                tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 800 }}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<RevenueTooltip />} isAnimationActive={false} />
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
          <div className={STYLES.emptyStateWrap}>
            <TrendingUp className="w-10 h-10 opacity-20 animate-pulse" />
          </div>
        )}
      </div>
    </ChartCard>
  )
})
WeeklyTrendChart.displayName = 'WeeklyTrendChart'

export const CategoryPieChart = memo((): React.JSX.Element => {
  const { stats } = useDashboardContext()

  const pieData = useMemo<PieDataPoint[]>(() => {
    if (!stats?.categoryBreakdown) return []
    return stats.categoryBreakdown.map((c) => ({
      name: c.categoryName,
      value: c.revenue || 0.1,
      quantity: c.quantity,
      color: CHART_COLORS.revenue
    }))
  }, [stats?.categoryBreakdown])

  // activeShape için any yerine tanımladığımız tipi kullanıyoruz
  const renderShape = useCallback((props: any): React.JSX.Element => {
    const { isActive, ...restProps } = props
    return (
      <Sector
        {...restProps}
        fill={isActive ? props.payload?.color : props.fill}
        className="focus:outline-none transition-all duration-300"
      />
    )
  }, [])

  return (
    <ChartCard
      title="Kategori Dağılımı"
      subtitle="KATEGORİ BAZLI GELİR"
      icon={PieChartIcon}
      delay="delay-[500ms]"
    >
      <div className="h-[300px] w-full">
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                shape={renderShape}
              />
              <Tooltip
                content={({ active, payload }): React.JSX.Element | null => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload as PieDataPoint
                  return (
                    <div className={STYLES.tooltipCard}>
                      <p className={STYLES.tooltipLabel}>{item.name}</p>
                      <p className="text-xl font-black text-foreground">
                        {formatCurrency(item.value)}
                      </p>
                      <p className="text-[9px] font-black text-primary/60 mt-1 uppercase">
                        {item.quantity} ÜRÜN
                      </p>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className={STYLES.emptyStateWrap}>
            <PieChartIcon className="w-10 h-10 opacity-20" />
          </div>
        )}
      </div>
    </ChartCard>
  )
})
CategoryPieChart.displayName = 'CategoryPieChart'

export const HourlyActivityChart = memo((): React.JSX.Element => {
  const { stats } = useDashboardContext()
  const data = stats?.hourlyActivity || []

  return (
    <ChartCard
      title="Saatlik Yoğunluk"
      subtitle="GÜNLÜK SATIŞ DAĞILIMI"
      icon={TrendingUp}
      delay="delay-[600ms]"
    >
      <div className="h-[300px] w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 10, right: 25, top: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 700 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={80}
                tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 700 }}
                tickFormatter={formatCurrency}
              />
              <Tooltip
                cursor={{ fill: 'currentColor', opacity: 0.05 }}
                content={({ active, payload, label }): React.JSX.Element | null => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className={STYLES.tooltipCard}>
                      <p className={STYLES.tooltipLabel}>SAAT {label}</p>
                      <p className="text-xl font-black text-foreground tabular-nums">
                        {formatCurrency(payload[0].value as number)}
                      </p>
                      <p className="text-[9px] font-black text-primary/60 mt-1 uppercase">
                        {payload[0].payload.orderCount} SİPARİŞ
                      </p>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="revenue"
                fill={CHART_COLORS.hourly}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className={STYLES.emptyStateWrap}>
            <TrendingUp className="w-10 h-10 opacity-20" />
          </div>
        )}
      </div>
    </ChartCard>
  )
})
HourlyActivityChart.displayName = 'HourlyActivityChart'

export const TopProductsChart = memo((): React.JSX.Element => {
  const { stats } = useDashboardContext()
  const data = stats?.topProducts || []

  return (
    <ChartCard title="En Çok Satanlar" icon={TrendingUp} delay="delay-[800ms]">
      <div className="h-[320px] w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 20, right: 40, top: 10, bottom: 10 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="productName"
                axisLine={false}
                tickLine={false}
                width={120}
                tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 800 }}
              />
              <Tooltip
                cursor={{ fill: 'currentColor', opacity: 0.05 }}
                content={({ active, payload }): React.JSX.Element | null => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload
                  return (
                    <div className={STYLES.tooltipCard}>
                      <p className={STYLES.tooltipLabel}>{item.productName}</p>
                      <p className="text-xl font-black text-primary">
                        {item.quantity} <span className="text-[10px] opacity-50">ADET</span>
                      </p>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="quantity"
                fill={CHART_COLORS.product}
                radius={[0, 4, 4, 0]}
                barSize={12}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className={STYLES.emptyStateWrap}>
            <TrendingUp className="w-10 h-10 opacity-20" />
          </div>
        )}
      </div>
    </ChartCard>
  )
})
TopProductsChart.displayName = 'TopProductsChart'
