import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  TrendingUp,
  CreditCard,
  Banknote,
  ShoppingBag,
  Users,
  RefreshCw,
  X,
  ReceiptText,
  Moon,
  Calendar,
  AlertCircle,
  History,
  PieChart as PieChartIcon,
  BarChart3,
  Wallet,
  ArrowDownRight,
  TrendingDown,
  ChevronRight
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  cafeApi,
  type ExtendedDashboardStats,
  type RevenueTrendItem,
  type DailySummary
} from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'
import {
  AreaChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ComposedChart,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { EndOfDayModal } from '@/components/modals/EndOfDayModal'
import { OrderHistoryModal } from '@/components/modals/OrderHistoryModal'
import { type MonthlyReport } from '@/lib/api'

// Custom Tooltip Components for theme compatibility
interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    name: string
    dataKey: string | number
    payload: Record<string, unknown>
  }>
  label?: string
}

function RevenueTooltip({ active, payload, label }: CustomTooltipProps): React.JSX.Element | null {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card text-card-foreground border border-border rounded-lg px-4 py-3 shadow-lg">
        <p className="text-sm font-semibold mb-1">{label}</p>
        <p className="text-lg font-bold text-success tabular-nums">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}

function ProductTooltip({ active, payload }: CustomTooltipProps): React.JSX.Element | null {
  if (active && payload && payload.length) {
    const data = payload[0].payload as { name: string; quantity: number; fullName?: string }
    return (
      <div className="bg-card text-card-foreground border border-border rounded-lg px-4 py-3 shadow-lg">
        <p className="text-sm font-semibold mb-1">{data.fullName || data.name}</p>
        <p className="text-lg font-bold text-success tabular-nums">{payload[0].value} adet satış</p>
      </div>
    )
  }
  return null
}

function MonthlyTooltip({ active, payload, label }: CustomTooltipProps): React.JSX.Element | null {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card text-card-foreground border border-border rounded-xl px-4 py-3 shadow-xl">
        <p className="text-sm font-bold mb-2 text-muted-foreground">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      ((entry.payload as Record<string, unknown>).fill as string) ||
                      (entry as unknown as { color: string }).color
                  }}
                />
                <span className="text-xs font-medium">{entry.name}:</span>
              </div>
              <span
                className={cn(
                  'text-sm font-bold tabular-nums',
                  entry.dataKey === 'profit'
                    ? (entry.value as number) >= 0
                      ? 'text-success'
                      : 'text-destructive'
                    : 'text-foreground'
                )}
              >
                {formatCurrency(entry.value as number)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

interface ChartTickProps {
  x?: number
  y?: number
  payload?: { value: string | number }
  fontSize?: number
  formatter?: (value: number) => string
}

const CustomYAxisTick = ({
  x,
  y,
  payload,
  fontSize = 11,
  formatter
}: ChartTickProps): React.JSX.Element | null => {
  if (x === undefined || y === undefined || !payload) return null

  const formattedValue = formatter ? formatter(payload.value as number) : payload.value

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-8}
        y={0}
        dy={4}
        textAnchor="end"
        fill="currentColor"
        fontSize={fontSize}
        className="fill-muted-foreground/80 font-medium whitespace-nowrap"
      >
        {formattedValue}
      </text>
    </g>
  )
}

export function DashboardView(): React.JSX.Element {
  const [stats, setStats] = useState<ExtendedDashboardStats | null>(null)
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendItem[]>([])
  const [zReportHistory, setZReportHistory] = useState<DailySummary[]>([])
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<DailySummary | null>(null)
  const [showEndOfDayModal, setShowEndOfDayModal] = useState(false)

  // Filtering state
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString())

  const loadStats = useCallback(async (): Promise<void> => {
    try {
      let zReportOptions: { limit?: number; startDate?: Date; endDate?: Date } = { limit: 30 }

      if (filterMonth !== 'all') {
        const month = parseInt(filterMonth)
        const year = parseInt(filterYear)
        const startDate = new Date(year, month, 1, 0, 0, 0)
        const endDate = new Date(year, month + 1, 0, 23, 59, 59)
        zReportOptions = { startDate, endDate, limit: 100 } // Increase limit for month view
      }

      const results = await Promise.allSettled([
        cafeApi.dashboard.getExtendedStats(),
        cafeApi.dashboard.getRevenueTrend(7),
        cafeApi.zReport.getHistory(zReportOptions),
        cafeApi.reports.getMonthly(12)
      ])

      const [statsResult, trendResult, historyResult, monthlyResult] = results

      if (statsResult.status === 'fulfilled') setStats(statsResult.value)
      else console.error('Failed to load stats:', statsResult.reason)

      if (trendResult.status === 'fulfilled') setRevenueTrend(trendResult.value)
      else console.error('Failed to load revenue trend:', trendResult.reason)

      if (historyResult.status === 'fulfilled') {
        setZReportHistory(historyResult.value)
      } else {
        console.error('Failed to load Z-report history:', historyResult.reason)
        setZReportHistory([]) // Clear history on error to prevent stale data
      }

      if (monthlyResult.status === 'fulfilled') setMonthlyReports(monthlyResult.value)
      else console.error('Failed to load monthly reports:', monthlyResult.reason)
    } catch (error) {
      console.error('Critical error in loadStats:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filterMonth, filterYear])

  useEffect(() => {
    loadStats()

    // Listen for real-time updates from backend
    const removeListener = (
      window as {
        electron?: { ipcRenderer: { on: (channel: string, callback: () => void) => () => void } }
      }
    ).electron?.ipcRenderer.on('dashboard:update', () => {
      loadStats()
    })

    return () => {
      removeListener?.()
    }
  }, [loadStats])

  // Portal target for header actions (must be before any early returns)
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setHeaderTarget(document.getElementById('settings-header-actions'))
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  const productData =
    stats?.topProducts.map((p) => ({
      name: p.productName.length > 15 ? p.productName.slice(0, 15) + '...' : p.productName,
      fullName: p.productName,
      quantity: p.quantity
    })) || []

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header Actions via Portal */}
      {headerTarget &&
        createPortal(
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadStats}
              disabled={isLoading}
              className="gap-2 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground font-black tracking-wide text-[10px]"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              Yenile
            </Button>

            <OrderHistoryModal />

            <Button
              onClick={() => setShowEndOfDayModal(true)}
              className="gap-4 h-9 px-5 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20 active:scale-95 transition-all text-xs tracking-wide"
            >
              <Moon className="w-3.5 h-3.5" />
              Gün Sonu
            </Button>
          </>,
          headerTarget
        )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-background to-muted/20 pb-12">
        {/* Main KPI Bento Grid Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-4">
          {/* Daily Revenue - The Hero Card */}
          <div className="lg:col-span-6 premium-card ambient-glow relative overflow-hidden group p-6 flex flex-col justify-between">
            <div className="absolute right-0 top-0 h-64 w-64 translate-x-16 -translate-y-16 rounded-full bg-success/10 transition-all duration-700 group-hover:bg-success/15" />

            <div className="relative z-10 flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground/60 tracking-widest">
                  Bugünkü Toplam Ciro
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                  <span className="text-[10px] font-bold text-success">Güncel Veriler</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-success/10 flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-[0_0_15px_rgba(var(--color-success),0.15)]">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </div>

            <div className="relative z-10 mt-4">
              <div className="text-5xl font-black tabular-nums tracking-tighter text-foreground filter drop-shadow-sm">
                {formatCurrency(stats?.dailyRevenue || 0)}
              </div>
              {(() => {
                const today = revenueTrend[revenueTrend.length - 1]?.revenue || 0
                const yesterday = revenueTrend[revenueTrend.length - 2]?.revenue || 0
                const change = yesterday > 0 ? ((today - yesterday) / yesterday) * 100 : 0
                if (yesterday === 0 && today === 0) return null
                return (
                  <div className="flex items-center gap-3 mt-3">
                    <div
                      className={cn(
                        'px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider',
                        change >= 0
                          ? 'bg-success/10 border-success/20 text-success'
                          : 'bg-destructive/10 border-destructive/20 text-destructive'
                      )}
                    >
                      {change >= 0 ? '+' : ''}
                      {change.toFixed(1)}%
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 tracking-wide uppercase">
                      DÜNE GÖRE PERFORMANS
                    </p>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Orders & Today's Expense Container */}
          <div className="lg:col-span-3 grid grid-rows-2 gap-4">
            {/* Total Orders */}
            <div className="premium-card ambient-glow px-5 py-4 flex items-center justify-between group">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground/60 tracking-widest mb-0.5">
                  SİPARİŞLER
                </p>
                <p className="text-2xl font-black text-info tabular-nums">
                  {stats?.totalOrders || 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-5 h-5 text-info" />
              </div>
            </div>

            {/* Today's Expense */}
            <div className="premium-card ambient-glow px-5 py-4 flex items-center justify-between group">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground/60 tracking-widest mb-0.5 text-destructive/80">
                  Bugünkü Gider
                </p>
                <p className="text-2xl font-black text-destructive tabular-nums">
                  {formatCurrency(stats?.dailyExpenses || 0)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowDownRight className="w-5 h-5 text-destructive" />
              </div>
            </div>
          </div>

          {/* Open Tables & Pending Orders Container */}
          <div className="lg:col-span-3 grid grid-rows-2 gap-4">
            {/* Open Tables */}
            <div className="premium-card ambient-glow px-5 py-4 flex items-center justify-between group">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground/60 tracking-widest mb-0.5">
                  Dolu Masa
                </p>
                <p className="text-2xl font-black text-warning tabular-nums">
                  {stats?.openTables || 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5 text-warning" />
              </div>
            </div>

            {/* Avg Order Value (Replaced Pending Orders) */}
            <div className="premium-card ambient-glow px-5 py-4 flex items-center justify-between group">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground/60 tracking-widest mb-0.5">
                  Ortalama Sipariş Tutarı
                </p>
                <p className="text-2xl font-black text-success tabular-nums">
                  {formatCurrency(
                    stats?.totalOrders
                      ? Math.round((stats.dailyRevenue || 0) / stats.totalOrders)
                      : 0
                  )}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet className="w-5 h-5 text-success" />
              </div>
            </div>
          </div>
        </div>

        {/* Hourly Activity & Payment Summary Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Hourly Activity Chart */}
          <div className="lg:col-span-2 premium-card ambient-glow p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-black text-foreground tracking-wider">
                  Saatlik Satış Yoğunluğu
                </h3>
                <p className="text-[10px] font-bold text-muted-foreground/80 tracking-wide">
                  Günün En Yoğun Saatleri
                </p>
              </div>
            </div>
            <div className="h-[200px] w-full">
              {stats?.hourlyActivity && stats.hourlyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.hourlyActivity.filter((h) => h.revenue > 0)}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="hour"
                      stroke="currentColor"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      stroke="currentColor"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={85}
                      tick={
                        <CustomYAxisTick
                          formatter={(value: number) =>
                            `${((value || 0) / 100).toLocaleString('tr-TR', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0
                            })} ₺`
                          }
                        />
                      }
                      className="fill-muted-foreground"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background/95 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl">
                              <p className="text-xs font-bold text-foreground mb-1">
                                {payload[0].payload.hour}
                              </p>
                              <p className="text-sm font-black text-primary">
                                {formatCurrency(payload[0].value as number)}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {payload[0].payload.orderCount} Sipariş
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="url(#hourlyGradient)"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Henüz veri yok
                </div>
              )}
            </div>
          </div>

          {/* Compact Payment Summary */}
          <div className="premium-card ambient-glow p-5 flex flex-col justify-center gap-6">
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-success/10 rounded-xl group-hover:scale-110 transition-transform">
                  <Banknote className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-muted-foreground/60 tracking-widest">
                    Nakit
                  </p>
                  <p className="text-3xl font-black text-foreground tabular-nums">
                    {formatCurrency(stats?.paymentMethodBreakdown?.cash || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-border/50" />

            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-info/10 rounded-xl group-hover:scale-110 transition-transform">
                  <CreditCard className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-muted-foreground/60 tracking-widest">
                    Kart
                  </p>
                  <p className="text-3xl font-black text-foreground tabular-nums">
                    {formatCurrency(stats?.paymentMethodBreakdown?.card || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Trend Chart */}
        <div className="premium-card ambient-glow p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-black text-foreground tracking-wider">
              Son 7 Gün Hasılat Trendi
            </h3>
          </div>
          <div className="h-[280px] w-full">
            {revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="currentColor"
                    fontSize={13}
                    tickLine={false}
                    axisLine={false}
                    className="fill-foreground"
                  />
                  <YAxis
                    stroke="currentColor"
                    fontSize={13}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                    tick={
                      <CustomYAxisTick
                        fontSize={13}
                        formatter={(value: number) =>
                          `${((value || 0) / 100).toLocaleString('tr-TR', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          })} ₺`
                        }
                      />
                    }
                    className="fill-foreground"
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="url(#revenueAreaGradient)"
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Henüz veri yok
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown & Top/Bottom Products */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category Breakdown Donut */}
          <div className="premium-card ambient-glow p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <PieChartIcon className="w-4 h-4 text-warning" />
              </div>
              <h3 className="text-sm font-black text-foreground tracking-wider">
                Kategori Bazlı Satış Dağılımı
              </h3>
            </div>
            <div className="h-[280px] w-full">
              {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.categoryBreakdown.map((c) => ({
                        name: c.categoryName,
                        value: c.revenue,
                        quantity: c.quantity
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.categoryBreakdown.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            [
                              'hsl(142, 71%, 45%)',
                              'hsl(217, 91%, 60%)',
                              'hsl(38, 92%, 50%)',
                              'hsl(0, 84%, 60%)',
                              'hsl(262, 83%, 58%)',
                              'hsl(180, 60%, 45%)',
                              'hsl(330, 80%, 55%)'
                            ][index % 7]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as {
                            name: string
                            value: number
                            quantity: number
                          }
                          return (
                            <div className="bg-card text-card-foreground border border-border rounded-lg px-4 py-3 shadow-lg">
                              <p className="text-sm font-bold mb-1">{data.name}</p>
                              <p className="text-sm font-bold text-success tabular-nums">
                                {formatCurrency(data.value)}
                              </p>
                              <p className="text-xs text-muted-foreground">{data.quantity} adet</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Henüz veri yok
                </div>
              )}
            </div>
            {/* Legend */}
            {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-4 justify-center">
                {stats.categoryBreakdown.map((cat, index) => (
                  <div key={cat.categoryName} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: [
                          'hsl(142, 71%, 45%)',
                          'hsl(217, 91%, 60%)',
                          'hsl(38, 92%, 50%)',
                          'hsl(0, 84%, 60%)',
                          'hsl(262, 83%, 58%)',
                          'hsl(180, 60%, 45%)',
                          'hsl(330, 80%, 55%)'
                        ][index % 7]
                      }}
                    />
                    <span className="text-sm font-bold text-foreground/80">{cat.categoryName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Products - Horizontal Bar Chart */}
          <div className="lg:col-span-2 premium-card ambient-glow p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-success" />
              </div>
              <h3 className="text-sm font-black text-foreground tracking-wider">
                En Çok Satan Ürünler
              </h3>
            </div>
            <div className="h-[280px] w-full">
              {productData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      stroke="currentColor"
                      fontSize={13}
                      tickLine={false}
                      axisLine={false}
                      className="fill-foreground"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      stroke="currentColor"
                      fontSize={13}
                      tickLine={false}
                      axisLine={false}
                      className="fill-foreground"
                    />
                    <Tooltip
                      content={<ProductTooltip />}
                      cursor={{ fill: '#10b981', fillOpacity: 0.1 }}
                    />
                    <Bar
                      dataKey="quantity"
                      fill="url(#barGradient)"
                      radius={[0, 6, 6, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Henüz satış verisi yok
                </div>
              )}
            </div>

            {/* Bottom Products */}
            {stats?.bottomProducts && stats.bottomProducts.length > 0 && (
              <div className="mt-6 pt-5 border-t border-border/20">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown className="w-4 h-4 text-destructive/70" />
                  <h4 className="text-xs font-black text-muted-foreground tracking-widest">
                    En Az Satan Ürünler
                  </h4>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {stats.bottomProducts.map((product, index) => (
                    <div
                      key={product.productId}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/20 border border-border/10 hover:bg-muted/30 transition-colors group/card h-full min-h-[110px]"
                    >
                      <span className="text-lg font-black text-destructive/70 tabular-nums group-hover/card:scale-110 transition-transform">
                        {product.quantity}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground text-center leading-[1.3] w-full line-clamp-2 px-1">
                        {product.productName}
                      </span>
                      <div className="mt-auto flex flex-col items-center">
                        <span className="text-[9px] font-black text-muted-foreground/30 group-hover/card:text-muted-foreground/50 transition-colors uppercase tracking-[0.2em]">
                          #{index + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Monthly analysis section */}
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Aylık Analiz</h2>
              <p className="text-[10px] font-bold text-muted-foreground/80 tracking-wide uppercase">
                Son 12 Ayın Gelir, Gider ve Kar Durumu
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-rows-2 gap-6">
            {/* Monthly Sales Chart */}
            <div className="xl:col-span-3 lg:row-span-2 premium-card ambient-glow p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm font-black text-foreground tracking-wider">
                  Aylık Gelir-Gider Analizi
                </h3>
              </div>
              <div className="h-[300px] w-full">
                {monthlyReports.length > 0 ? (
                  <ResponsiveContainer width="100%" height={380}>
                    <ComposedChart
                      data={[...monthlyReports].reverse().map((r) => ({
                        name: new Date(r.monthDate).toLocaleDateString('tr-TR', {
                          month: 'short',
                          year: '2-digit'
                        }),
                        revenue: r.totalRevenue,
                        expenses: r.totalExpenses,
                        profit: r.netProfit
                      }))}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                      <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        width={75}
                        tick={
                          <CustomYAxisTick
                            fontSize={10}
                            formatter={(val: number) => `${(val / 100000).toFixed(0)}k ₺`}
                          />
                        }
                      />
                      <Tooltip content={<MonthlyTooltip />} />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Bar
                        dataKey="revenue"
                        name="Ciro"
                        fill="var(--color-success)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={40}
                      />
                      <Bar
                        dataKey="expenses"
                        name="Gider"
                        fill="var(--color-destructive)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={40}
                      />
                      <Line
                        type="monotone"
                        dataKey="profit"
                        name="Net Kar"
                        stroke="var(--color-primary)"
                        strokeWidth={4}
                        dot={{ r: 5, fill: 'var(--color-primary)', strokeWidth: 2, stroke: '#fff' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[380px] text-muted-foreground italic">
                    Henüz aylık analiz verisi toplanmadı
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Summary */}
            <div className="xl:col-span-1 lg:row-span-2 premium-card ambient-glow p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                  <PieChartIcon className="w-4 h-4 text-warning" />
                </div>
                <h3 className="text-sm font-black text-foreground tracking-wider">Hasılat Özeti</h3>
              </div>

              <div className="flex-1 flex flex-col justify-center gap-8">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground/60 tracking-widest mb-1.5">
                    {filterMonth !== 'all' ? 'Seçili Dönem Ciro' : 'Görüntülenen Ciro'}
                  </p>
                  <div className="text-3xl font-black text-success tabular-nums">
                    {formatCurrency(
                      zReportHistory.reduce((acc, curr) => acc + curr.totalRevenue, 0)
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-muted-foreground/60 tracking-widest mb-1.5">
                    Ortalama Günlük
                  </p>
                  <div className="text-3xl font-black text-foreground tabular-nums">
                    {formatCurrency(
                      zReportHistory.length > 0
                        ? zReportHistory.reduce((acc, curr) => acc + curr.totalRevenue, 0) /
                        zReportHistory.length
                        : 0
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-muted-foreground/60 tracking-widest mb-1.5">
                    En Yüksek Gün
                  </p>
                  <div className="text-3xl font-black text-primary tabular-nums">
                    {formatCurrency(Math.max(...zReportHistory.map((s) => s.totalRevenue), 0))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Z-Report History */}
        <div className="premium-card ambient-glow p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-sm">
                <History className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-black text-foreground tracking-wider">
                  Z-Raporu Geçmişi
                </h3>
                <p className="text-[10px] font-bold text-muted-foreground/60 tracking-widest mt-0.5">
                  Arşiv ve Kayıtlar
                </p>
              </div>
            </div>

            {/* Premium Filter Bar */}
            <div className="flex items-center gap-2 bg-muted/20 p-1.5 rounded-2xl border border-white/5 shadow-inner">
              <div className="flex items-center gap-2 px-3 border-r border-white/10 mr-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                <span className="text-[10px] font-black text-muted-foreground/60 tracking-widest">
                  Filtrele
                </span>
              </div>

              <div className="flex gap-2">
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="h-9 w-[100px] rounded-xl border-none bg-background/50 backdrop-blur-sm text-[11px] font-bold shadow-sm focus:ring-primary/20">
                    <SelectValue placeholder="Yıl" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-md">
                    {[2024, 2025, 2026].map((year) => (
                      <SelectItem
                        key={year}
                        value={year.toString()}
                        className="text-[11px] font-bold rounded-lg"
                      >
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="h-9 w-[140px] rounded-xl border-none bg-background/50 backdrop-blur-sm text-[11px] font-bold shadow-sm focus:ring-primary/20">
                    <SelectValue placeholder="Ay Seçin" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-md">
                    <SelectItem value="all" className="text-[11px] font-bold rounded-lg">
                      Son 30 Gün
                    </SelectItem>
                    {[
                      'Ocak',
                      'Şubat',
                      'Mart',
                      'Nisan',
                      'Mayıs',
                      'Haziran',
                      'Temmuz',
                      'Ağustos',
                      'Eylül',
                      'Ekim',
                      'Kasım',
                      'Aralık'
                    ].map((month, index) => (
                      <SelectItem
                        key={month}
                        value={index.toString()}
                        className="text-[11px] font-bold rounded-lg"
                      >
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {filterMonth !== 'all' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFilterMonth('all')}
                    className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          {zReportHistory.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Henüz Z-Raporu oluşturulmamış. Gün sonunda yukarıdaki butona tıklayarak rapor
              oluşturabilirsiniz.
            </div>
          ) : (
            <ScrollArea className="h-[460px] -mx-1 pr-1">
              <Table>
                <TableHeader className="bg-muted/30 sticky top-0 z-10 shadow-sm border-y border-white/5">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="py-4 pl-6 font-black text-[10px] text-muted-foreground tracking-[0.15em]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        TARİH
                      </div>
                    </TableHead>
                    <TableHead className="text-right font-black text-[10px] text-muted-foreground tracking-[0.15em]">
                      <div className="flex items-center justify-end gap-2">
                        <Banknote className="w-3 h-3" />
                        NAKİT
                      </div>
                    </TableHead>
                    <TableHead className="text-right font-black text-[10px] text-muted-foreground tracking-[0.15em]">
                      <div className="flex items-center justify-end gap-2">
                        <CreditCard className="w-3 h-3" />
                        KART
                      </div>
                    </TableHead>
                    <TableHead className="text-right font-black text-[10px] text-muted-foreground tracking-[0.15em]">
                      <div className="flex items-center justify-end gap-2 text-foreground/80">
                        <TrendingUp className="w-3 h-3" />
                        TOPLAM
                      </div>
                    </TableHead>
                    <TableHead className="text-right font-black text-[10px] text-muted-foreground tracking-[0.15em]">
                      <div className="flex items-center justify-end gap-2">
                        <ShoppingBag className="w-3 h-3" />
                        SİPARİŞ
                      </div>
                    </TableHead>
                    <TableHead className="w-[40px] px-0" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zReportHistory.map((report) => (
                    <TableRow
                      key={report.id}
                      className="group cursor-pointer hover:bg-primary/[0.03] transition-all duration-200 border-white/5 h-16"
                      onClick={() => setSelectedReport(report)}
                    >
                      <TableCell className="pl-6 font-bold text-sm text-foreground/70 group-hover:text-foreground transition-colors">
                        {new Date(report.date).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className="inline-flex items-baseline">
                          <span className="text-xs font-medium text-success/50 mr-1">₺</span>
                          <span className="font-extrabold text-success tracking-tight">
                            {formatCurrency(report.totalCash).split(' ')[1]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className="inline-flex items-baseline">
                          <span className="text-xs font-medium text-info/50 mr-1">₺</span>
                          <span className="font-extrabold text-info tracking-tight">
                            {formatCurrency(report.totalCard).split(' ')[1]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className="inline-flex items-baseline">
                          <span className="text-xs font-medium text-foreground/30 mr-1">₺</span>
                          <span className="text-md font-black text-foreground tracking-tighter">
                            {formatCurrency(report.totalRevenue).split(' ')[1]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-black text-muted-foreground/80 text-sm">
                        {report.orderCount}
                      </TableCell>
                      <TableCell className="pr-4 text-center">
                        <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary transition-all duration-300 group-hover:translate-x-0.5" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Z-Report Detail Modal */}
      {/* Z-Report Detail Modal - Redesigned for better fit and visuals */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-border bg-background shadow-lg [&>button]:hidden">
          {selectedReport && (
            <div className="flex flex-col">
              <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Z RAPORU DETAYI</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {new Date(selectedReport.date).toLocaleDateString('tr-TR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <ReceiptText className="w-5 h-5 text-primary" />
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Summary Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border bg-card flex flex-col gap-1">
                    <span className="text-xs font-semibold text-muted-foreground">GÜNLÜK CİRO</span>
                    <span className="text-2xl font-bold tabular-nums tracking-tight">
                      {formatCurrency(selectedReport.totalRevenue)}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl border bg-card flex flex-col gap-1">
                    <span className="text-xs font-semibold text-muted-foreground">
                      SİPARİŞ SAYISI
                    </span>
                    <span className="text-2xl font-bold tabular-nums tracking-tight">
                      {selectedReport.orderCount}
                    </span>
                  </div>
                </div>

                {/* Details Table */}
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-muted/30 px-4 py-2 border-b text-xs font-bold text-muted-foreground">
                    ÖDEME DAĞILIMI
                  </div>
                  <div className="divide-y">
                    <div className="flex justify-between items-center p-4 bg-card">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Banknote className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="font-bold text-xs">NAKİT</span>
                      </div>
                      <span className="font-bold tabular-nums text-emerald-600">
                        {formatCurrency(selectedReport.totalCash)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-card">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-bold text-xs">KREDİ KARTI</span>
                      </div>
                      <span className="font-bold tabular-nums text-blue-600">
                        {formatCurrency(selectedReport.totalCard)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-muted/30 px-4 py-2 border-b text-xs font-bold text-muted-foreground">
                    FİNANSAL ÖZET
                  </div>
                  <div className="divide-y bg-card">
                    <div className="flex justify-between items-center p-3 px-4">
                      <span className="text-xs font-bold text-muted-foreground">NET SATIŞLAR</span>
                      <span className="text-sm font-bold tabular-nums">
                        {formatCurrency(selectedReport.totalRevenue - selectedReport.totalVat)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 px-4">
                      <span className="text-xs font-bold text-muted-foreground">KDV (%10)</span>
                      <span className="text-sm font-bold tabular-nums">
                        {formatCurrency(selectedReport.totalVat)}
                      </span>
                    </div>
                    {selectedReport.cancelCount > 0 && (
                      <div className="flex justify-between items-center p-3 px-4 bg-red-50/50 dark:bg-red-900/10">
                        <span className="text-sm font-bold text-red-600 flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5" /> İPTAL EDİLENLER
                        </span>
                        <span className="text-sm font-bold text-red-600">
                          {selectedReport.cancelCount}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full h-11 font-semibold hover:bg-destructive hover:text-destructive-foreground hover:scale-105 active:scale-95 transition-all duration-300"
                    onClick={() => setSelectedReport(null)}
                  >
                    KAPAT
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* End of Day Modal */}
      <EndOfDayModal open={showEndOfDayModal} onClose={() => setShowEndOfDayModal(false)} />
    </div>
  )
}
