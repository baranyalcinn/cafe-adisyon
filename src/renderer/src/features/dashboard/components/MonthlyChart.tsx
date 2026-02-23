import { cn, formatCurrency } from '@/lib/utils'
import { Calendar } from 'lucide-react'
import React from 'react'
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

/* --- ANIMATION WRAPPERS --- */
function ChartContainer({
  children,
  delayUrl
}: {
  children: React.ReactNode
  delayUrl?: string
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both',
        delayUrl
      )}
    >
      {children}
    </div>
  )
}

function MonthlyTooltip({
  active,
  payload,
  label
}: {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any
  label?: string
}): React.JSX.Element | null {
  if (active && payload && payload.length) {
    const revenue = (payload.find((p) => p.dataKey === 'revenue')?.value as number) || 0
    const profit = (payload.find((p) => p.dataKey === 'profit')?.value as number) || 0
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0

    return (
      <div className="bg-card border border-border shadow-2xl rounded-2xl p-5 min-w-[200px] space-y-4">
        <p className="text-[10px] font-black text-muted-foreground/60 tracking-[0.25em] uppercase border-b border-border pb-2 mb-2">
          {(label || '').toLocaleUpperCase('tr-TR')} PERFORMANSI
        </p>
        <div className="space-y-3">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: entry.color || entry.fill
                  }}
                />
                <span className="text-[11px] font-black text-muted-foreground tracking-widest uppercase">
                  {entry.name}
                </span>
              </div>
              <span
                className={cn(
                  'text-sm font-black tabular-nums tracking-tighter shadow-sm',
                  entry.dataKey === 'profit'
                    ? (entry.value as number) >= 0
                      ? 'text-emerald-500'
                      : 'text-rose-500'
                    : 'text-foreground'
                )}
              >
                {formatCurrency(entry.value as number)}
              </span>
            </div>
          ))}
        </div>

        {revenue > 0 && (
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
              KÂR MARJI
            </span>
            <span
              className={cn(
                'text-xs font-black tabular-nums tracking-tight px-2 py-0.5 rounded-md',
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
  return null
}

export function MonthlyPerformanceChart(): React.JSX.Element {
  const { monthlyReports } = useDashboardContext()
  const monthlyData = React.useMemo(() => {
    return [...monthlyReports]
      .sort((a, b) => new Date(a.monthDate).getTime() - new Date(b.monthDate).getTime())
      .map((report) => {
        const date = new Date(report.monthDate)
        return {
          month: date.toLocaleDateString('tr-TR', { month: 'short' }),
          fullMonth: date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
          revenue: report.totalRevenue,
          profit: report.netProfit,
          expenses: report.totalExpenses
        }
      })
  }, [monthlyReports])

  return (
    <ChartContainer delayUrl="delay-[900ms]">
      <div className="bg-card border border-border/50 rounded-[2rem] p-8 shadow-sm">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <Calendar className="w-6 h-6 text-foreground/70 drop-shadow-sm" />
            <div>
              <h3 className="text-xl font-black text-foreground">Aylık Performans</h3>
              <p className="text-sm text-muted-foreground/60 font-medium tracking-wide">
                Gelir, gider ve kârlılık analizi (Yıllık Görünüm)
              </p>
            </div>
          </div>
        </div>
        <div className="h-[400px] w-full mt-4">
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" debounce={50} minWidth={0}>
              <ComposedChart
                data={monthlyData}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-border)"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 800 }}
                  dy={15}
                />
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 800 }}
                  tickFormatter={(val) => `${(val / 100).toLocaleString('tr-TR')} ₺`}
                  width={90}
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
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <Calendar className="w-10 h-10 text-muted-foreground/30 animate-pulse" />
              <p className="text-muted-foreground/40 italic font-medium tracking-wide">
                Henüz aylık rapor verisi oluşmadı.
              </p>
            </div>
          )}
        </div>
      </div>
    </ChartContainer>
  )
}
