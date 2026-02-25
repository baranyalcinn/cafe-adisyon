import { cn, formatCurrency } from '@/lib/utils'
import { parseISO } from 'date-fns'
import { LucideIcon, PieChart as PieChartIcon, TrendingUp } from 'lucide-react'
import React, { memo, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis
} from 'recharts'
import { useDashboardContext } from '../context/DashboardContext'

// ============================================================================
// Types & Styles
// ============================================================================

interface PieDataPoint {
  name: string
  value: number
  quantity: number
  color: string
}

const CHART_COLORS = {
  revenue: '#007AFF',
  hourly: '#10b981',
  product: '#8b5cf6'
} as const

const STYLES = {
  cardBase:
    'bg-card border border-border/50 rounded-[2rem] p-8 shadow-sm transition-[border-color,transform] duration-300 hover:border-primary/20 text-foreground',
  headerWrap: 'flex items-center gap-4 mb-10',
  title: 'text-xl font-black text-foreground tracking-tight',
  subtitle: 'text-[10px] text-muted-foreground/70 font-black tracking-[0.2em] uppercase',
  emptyStateWrap: 'h-full flex flex-col items-center justify-center space-y-4',
  tooltipCard: 'bg-card border border-border/80 p-4 rounded-2xl shadow-xl min-w-[160px]'
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
}: TooltipProps<number, string>): React.JSX.Element | null => {
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
      <p className="text-[10px] font-black text-muted-foreground/60 tracking-[0.25em] mb-2">
        {dateStr}
      </p>
      <p className="text-2xl font-black text-foreground tabular-nums">
        {formatCurrency(payload[0].value as number)}
      </p>
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
                tickFormatter={(str) =>
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

export const CategoryPieChart = memo((): React.JSX.Element => {
  const { stats } = useDashboardContext()
  const [hovered, setHovered] = useState<PieDataPoint | null>(null)

  const pieData = useMemo<PieDataPoint[]>(() => {
    if (!stats?.categoryBreakdown) return []
    return stats.categoryBreakdown.map((c) => ({
      name: c.categoryName,
      value: c.revenue || 0.1,
      quantity: c.quantity,
      color: CHART_COLORS.revenue // Gerçek renk eşleştirme fonksiyonunuzu buraya ekleyin
    }))
  }, [stats?.categoryBreakdown])

  const renderSector = (props: any): React.JSX.Element => (
    <Sector
      {...props}
      fill={props.payload.color}
      className="focus:outline-none transition-all duration-300"
    />
  )

  return (
    <ChartCard title="Kategori Dağılımı" icon={PieChartIcon} delay="delay-[700ms]">
      <div className="flex-1 w-full flex flex-col items-center justify-center relative min-h-[320px]">
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius="70%"
                outerRadius="100%"
                paddingAngle={4}
                dataKey="value"
                stroke="none"
                isAnimationActive={false}
                shape={renderSector}
                onMouseEnter={(data: PieDataPoint) => setHovered(data)}
                onMouseLeave={() => setHovered(null)}
              />
              <Tooltip content={<div className="hidden" />} isAnimationActive={false} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className={STYLES.emptyStateWrap}>
            <PieChartIcon className="w-10 h-10 opacity-20" />
          </div>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {hovered ? (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-200">
              <span
                className="text-[10px] font-black tracking-widest mb-1"
                style={{ color: hovered.color }}
              >
                {hovered.name}
              </span>
              <span className="text-3xl font-black">{formatCurrency(hovered.value)}</span>
              <span className="text-[10px] opacity-30">{hovered.quantity} ADET</span>
            </div>
          ) : (
            <PieChartIcon className="w-10 h-10 opacity-10" />
          )}
        </div>
      </div>
    </ChartCard>
  )
})
