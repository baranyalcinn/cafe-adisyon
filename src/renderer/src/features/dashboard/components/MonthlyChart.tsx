'use client'

import { cn, formatCurrency } from '@/lib/utils'
import { Calendar } from 'lucide-react'
import React, { memo, useMemo } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { useDashboardContext } from '../context/DashboardContext'

// ============================================================================
// Types
// ============================================================================

interface ChartDataPoint {
  month: string
  monthName: string
  fullMonth: string
  revenue: number
  profit: number
  expenses: number
}

// Recharts Tooltip Payload Tipi
interface TooltipPayload {
  dataKey: string
  name: string
  value: number
  color?: string
  fill?: string
  payload: ChartDataPoint
}

interface MonthlyTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}

// ============================================================================
// Styles
// ============================================================================

const STYLES = {
  card: 'bg-card border-2 border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 shadow-sm',
  headerWrapper: 'flex items-center justify-between mb-10',
  title: 'text-xl font-black text-foreground',
  subtitle: 'text-sm text-zinc-800 dark:text-zinc-200 font-bold tracking-wide',
  chartWrapper: 'h-[400px] w-full mt-4',

  // Empty State
  emptyWrapper: 'h-full flex flex-col items-center justify-center space-y-4',
  emptyText: 'text-muted-foreground/40 italic font-medium tracking-wide',

  // Tooltip
  tooltipCard: 'bg-card border border-border shadow-2xl rounded-2xl p-5 min-w-[200px] space-y-4',
  tooltipTitle:
    'text-[14px] font-black text-foreground tracking-widest border-b-2 border-primary/20 pb-2 mb-2',
  tooltipRow: 'flex items-center justify-between gap-6',
  tooltipValue: 'text-sm font-black tabular-nums tracking-tighter shadow-sm',
  marginBadge: 'text-xs font-black tabular-nums tracking-tight px-2 py-0.5 rounded-md'
} as const

// ============================================================================
// Constants & Cached Formatters (Performance Optimization)
// ============================================================================

// Recharts prop sabitlemesi: Her render'da yeni obje üretilmesini önler
const CHART_MARGIN = { top: 20, right: 20, bottom: 20, left: 20 }

// Tick formatter referans sabitlemesi
const formatYAxisTick = (val: number): string => formatCurrency(val).split(',')[0]

// JavaScript motorunu yormamak için DateTime formatlayıcıları dışarıda 1 kez oluşturulur.
const formatterShortMonth = new Intl.DateTimeFormat('tr-TR', { month: 'short' })
const formatterLongMonth = new Intl.DateTimeFormat('tr-TR', { month: 'long' })
const formatterFullMonth = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' })

// ============================================================================
// Sub-Components
// ============================================================================

/** Animasyonlu Sarmalayıcı */
const ChartContainer = memo(
  ({ children, delayUrl }: { children: React.ReactNode; delayUrl?: string }): React.JSX.Element => (
    <div
      className={cn(
        'animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both',
        delayUrl
      )}
    >
      {children}
    </div>
  )
)
ChartContainer.displayName = 'ChartContainer'

/** Recharts için Özel Tooltip */
const MonthlyTooltip = memo(
  ({ active, payload, label }: MonthlyTooltipProps): React.JSX.Element | null => {
    if (!active || !payload || !payload.length) return null

    const monthName = payload[0]?.payload?.monthName || label || ''
    const revenue = payload.find((p) => p.dataKey === 'revenue')?.value || 0
    const profit = payload.find((p) => p.dataKey === 'profit')?.value || 0
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0

    return (
      <div className={STYLES.tooltipCard}>
        <p className={STYLES.tooltipTitle}>{monthName.toLocaleUpperCase('tr-TR')}</p>

        <div className="space-y-3">
          {payload.map((entry, index) => (
            <div key={index} className={STYLES.tooltipRow}>
              <div className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                <span className="text-[14px] font-black text-foreground tracking-widest">
                  {entry.name}
                </span>
              </div>
              <span
                className={cn(
                  STYLES.tooltipValue,
                  entry.dataKey === 'profit'
                    ? entry.value >= 0
                      ? 'text-emerald-500'
                      : 'text-rose-500'
                    : entry.dataKey === 'expenses'
                      ? 'text-rose-500'
                      : 'text-foreground'
                )}
              >
                {formatCurrency(entry.value).split(',')[0]}
              </span>
            </div>
          ))}
        </div>

        {revenue > 0 && (
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <span className="text-[10px] font-black text-zinc-700 dark:text-zinc-300 tracking-widest uppercase">
              KÂR MARJI
            </span>
            <span
              className={cn(
                STYLES.marginBadge,
                margin >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              )}
            >
              %{margin.toFixed(1)}
            </span>
          </div>
        )}
      </div>
    )
  }
)
MonthlyTooltip.displayName = 'MonthlyTooltip'

// ============================================================================
// Main Component
// ============================================================================

export const MonthlyPerformanceChart = memo((): React.JSX.Element => {
  const { monthlyReports } = useDashboardContext()

  // Veri Seti Hesaplaması: Cached Intl nesneleri ile çok daha hızlı çalışır.
  const monthlyData = useMemo(() => {
    return [...monthlyReports]
      .sort((a, b) => new Date(a.monthDate).getTime() - new Date(b.monthDate).getTime())
      .map((report): ChartDataPoint => {
        const date = new Date(report.monthDate)
        return {
          month: formatterShortMonth.format(date),
          monthName: formatterLongMonth.format(date),
          fullMonth: formatterFullMonth.format(date),
          revenue: report.totalRevenue,
          profit: report.netProfit,
          expenses: report.totalExpenses
        }
      })
  }, [monthlyReports])

  return (
    <ChartContainer delayUrl="delay-[900ms]">
      <div className={STYLES.card}>
        <div className={STYLES.headerWrapper}>
          <div className="flex items-center gap-4">
            <Calendar className="w-6 h-6 text-foreground/70 drop-shadow-sm" />
            <div>
              <h3 className={STYLES.title}>Aylık Performans</h3>
            </div>
          </div>
        </div>

        <div className={STYLES.chartWrapper}>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" debounce={50} minWidth={0}>
              <ComposedChart
                data={monthlyData}
                margin={CHART_MARGIN} // Sabit referans kullanıldı
              >
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-border)"
                  opacity={0.7}
                />

                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'currentColor', fontSize: 13, fontWeight: 800 }}
                  dy={15}
                  padding={{ left: 20, right: 20 }}
                />

                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'currentColor', fontSize: 13, fontWeight: 800 }}
                  tickMargin={12}
                  tickFormatter={formatYAxisTick} // Sabit referans kullanıldı
                  width={100}
                />

                <Tooltip content={<MonthlyTooltip />} isAnimationActive={false} />

                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  name="Toplam Gelir"
                  fill="var(--color-primary)"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  isAnimationActive={false}
                />
                <Bar
                  yAxisId="left"
                  dataKey="expenses"
                  name="Toplam Gider"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="profit"
                  name="Net Kâr"
                  stroke="#10b981"
                  strokeWidth={4}
                  dot={{ r: 4, strokeWidth: 2, fill: 'var(--color-background)' }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className={STYLES.emptyWrapper}>
              <Calendar className="w-10 h-10 text-zinc-200 dark:text-zinc-800 animate-pulse" />
              <p className="text-zinc-500 font-bold italic tracking-wide">
                Henüz aylık rapor verisi oluşmadı.
              </p>
            </div>
          )}
        </div>
      </div>
    </ChartContainer>
  )
})
MonthlyPerformanceChart.displayName = 'MonthlyPerformanceChart'
