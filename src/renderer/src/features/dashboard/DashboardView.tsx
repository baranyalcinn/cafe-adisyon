import { parseISO } from 'date-fns'
import {
  ArrowDownRight,
  Banknote,
  BarChart3,
  Calendar,
  ChevronRight,
  CreditCard,
  History as HistoryIcon,
  Moon,
  PieChart as PieChartIcon,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Users
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { EndOfDayModal } from '@/components/modals/EndOfDayModal'
import { OrderHistoryModal } from '@/components/modals/OrderHistoryModal'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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
  type DailySummary,
  type ExtendedDashboardStats,
  type MonthlyReport,
  type RevenueTrendItem
} from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

interface TooltipPayloadEntry {
  value: number | string
  name: string
  dataKey: string | number
  payload: Record<string, unknown>
  color?: string
  fill?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

function RevenueTooltip({
  active,
  payload,
  label
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}): React.JSX.Element | null {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-md border border-border p-4 rounded-2xl shadow-2xl min-w-[160px]">
        <p className="text-[10px] font-black text-muted-foreground/40 tracking-[0.2em] uppercase mb-2">
          {label && !isNaN(parseISO(label).getTime())
            ? parseISO(label).toLocaleDateString('tr-TR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })
            : label}
        </p>
        <div className="flex flex-col gap-0.5">
          <p className="text-2xl font-black text-foreground tabular-nums">
            {formatCurrency(payload[0].value as number)}
          </p>
          <div className="flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-[10px] font-bold text-primary tracking-widest uppercase">
              GÜNLÜK GELİR
            </span>
          </div>
        </div>
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
              className="gap-2 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground font-bold tracking-[0.1em] text-[10px] uppercase h-9 px-4"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              Yenile
            </Button>

            <OrderHistoryModal />

            <Button
              onClick={() => setShowEndOfDayModal(true)}
              className="gap-3 h-9 px-5 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20 active:scale-95 transition-all text-xs tracking-widest uppercase"
            >
              <Moon className="w-3.5 h-3.5" />
              Gün Sonu
            </Button>
          </>,
          headerTarget
        )}

      <div className="flex-1 overflow-y-auto px-8 pb-12 space-y-10 bg-background custom-scrollbar">
        {/* Header Section */}
        <div className="flex flex-col gap-1 pt-8">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tight text-foreground">Yönetim Paneli</h1>
            <div className="h-6 w-[1px] bg-border mt-1" />
            <span className="text-muted-foreground/40 font-black tracking-[0.3em] text-[12px] uppercase mt-2">
              DASHBOARD
            </span>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card border border-border rounded-[2rem] p-6 shadow-sm flex flex-col justify-between group transition-all duration-300 hover:border-primary/20">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-black text-muted-foreground/50 tracking-[0.2em] uppercase">
                BUGÜNKÜ CİRO
              </span>
              <div className="p-3 bg-primary/5 rounded-2xl group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black tabular-nums">
                {formatCurrency(stats?.dailyRevenue || 0)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-bold text-success uppercase tracking-widest">
                  CANLI
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-[2rem] p-6 shadow-sm flex flex-col justify-between group transition-all duration-300 hover:border-info/20">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-black text-muted-foreground/50 tracking-[0.2em] uppercase">
                SİPARİŞLER
              </span>
              <div className="p-3 bg-info/5 rounded-2xl group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-5 h-5 text-info" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black tabular-nums">{stats?.totalOrders || 0}</div>
              <div className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-2">
                TOPLAM ADET
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-[2rem] p-6 shadow-sm flex flex-col justify-between group transition-all duration-300 hover:border-warning/20">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-black text-muted-foreground/50 tracking-[0.2em] uppercase">
                DOLU MASA
              </span>
              <div className="p-3 bg-warning/5 rounded-2xl group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5 text-warning" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black tabular-nums">{stats?.openTables || 0}</div>
              <div className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-2">
                AKTİF SERVİS
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-[2rem] p-6 shadow-sm flex flex-col justify-between group transition-all duration-300 hover:border-destructive/20">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-black text-muted-foreground/50 tracking-[0.2em] uppercase">
                GÜNLÜK GİDER
              </span>
              <div className="p-3 bg-destructive/5 rounded-2xl group-hover:scale-110 transition-transform">
                <ArrowDownRight className="w-5 h-5 text-destructive" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black tabular-nums text-destructive">
                {formatCurrency(stats?.dailyExpenses || 0)}
              </div>
              <div className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-2">
                TOPLAM MALİYET
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Trend Section */}
        <div className="bg-card border border-border rounded-[2.5rem] p-10 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/10">
          <div className="flex items-center gap-4 mb-10">
            <div className="p-3 bg-primary/5 rounded-2xl border border-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-black text-foreground">Haftalık Performans</h3>
              <p className="text-sm text-muted-foreground/60 font-medium">
                Son 7 günlük ciro değişimi
              </p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ left: 10, right: 10 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="hsl(var(--border))"
                    opacity={0.2}
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    padding={{ left: 20, right: 20 }}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 700 }}
                    dy={12}
                    dx={20}
                    tickFormatter={(str) => {
                      try {
                        const date = parseISO(str)
                        if (isNaN(date.getTime())) return str
                        return `${date.getDate()} ${date.toLocaleDateString('tr-TR', { weekday: 'short' })}`
                      } catch {
                        return str
                      }
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={65}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 700 }}
                    tickFormatter={(val) => `${Math.round(val / 100)} ₺`}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#007AFF"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground/40 italic text-sm">
                Veri toplanıyor...
              </div>
            )}
          </div>
        </div>

        {/* Hourly Activity & Payment Summary Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Hourly Activity Chart */}
          <div className="lg:col-span-2 bg-card border border-border rounded-[2.5rem] p-10 shadow-sm">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-muted/30 rounded-2xl border border-border/5">
                <BarChart3 className="w-5 h-5 text-foreground/70" />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground">Saatlik Satış Yoğunluğu</h3>
                <p className="text-sm text-muted-foreground/60 font-medium">
                  Günün en yoğun saatleri
                </p>
              </div>
            </div>
            <div className="h-[250px] w-full">
              {stats?.hourlyActivity && stats.hourlyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.hourlyActivity.filter((h) => h.revenue > 0)}>
                    <defs>
                      <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34C759" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#34C759" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="hour"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }}
                      tickFormatter={(value) => `${value / 100}₺`}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as {
                            hour: string
                            revenue: number
                            orderCount: number
                          }
                          return (
                            <div className="bg-card border border-border p-4 rounded-2xl shadow-xl">
                              <p className="text-xs font-black text-muted-foreground/60 tracking-widest mb-1">
                                {data.hour}
                              </p>
                              <p className="text-lg font-black text-foreground">
                                {formatCurrency(data.revenue)}
                              </p>
                              <p className="text-[10px] font-bold text-primary mt-1 uppercase tracking-widest">
                                {data.orderCount} SİPARİŞ
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
                      radius={[6, 6, 0, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground/40 italic text-sm">
                  Veri toplanıyor...
                </div>
              )}
            </div>
          </div>

          {/* Compact Payment Summary */}
          <div className="bg-card border border-border rounded-[2.5rem] p-10 shadow-sm flex flex-col justify-center space-y-10">
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-success/5 rounded-2xl border border-success/10 group-hover:scale-105 transition-transform">
                  <Banknote className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-muted-foreground/50 tracking-[0.2em] uppercase mb-1">
                    NAKİT
                  </p>
                  <p className="text-4xl font-black text-foreground tabular-nums">
                    {formatCurrency(stats?.paymentMethodBreakdown?.cash || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="h-px bg-border/50" />

            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-info/5 rounded-2xl border border-info/10 group-hover:scale-105 transition-transform">
                  <CreditCard className="w-6 h-6 text-info" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-muted-foreground/50 tracking-[0.2em] uppercase mb-1">
                    KART
                  </p>
                  <p className="text-4xl font-black text-foreground tabular-nums">
                    {formatCurrency(stats?.paymentMethodBreakdown?.card || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Categories & Selling Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-card border border-border rounded-[2.5rem] p-10 shadow-sm">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-muted/30 rounded-2xl border border-border/5">
                <PieChartIcon className="w-5 h-5 text-foreground/70" />
              </div>
              <h3 className="text-xl font-black text-foreground">Kategori Dağılımı</h3>
            </div>
            <div className="h-[300px] w-full">
              {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.categoryBreakdown.map((c) => ({
                        name: c.categoryName,
                        value: c.revenue,
                        quantity: c.quantity
                      }))}
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.categoryBreakdown.map((_, index) => (
                        <Cell
                          key={index}
                          fill={
                            [
                              '#007AFF', // Blue
                              '#FF2D55', // Pink
                              '#34C759', // Green
                              '#FF9500', // Orange
                              '#AF52DE', // Purple
                              '#5AC8FA', // Teal
                              '#FFCC00' // Yellow
                            ][index % 7]
                          }
                          stroke="none"
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
                            <div className="bg-background border border-border p-4 rounded-2xl shadow-xl">
                              <p className="text-xs font-black text-muted-foreground/60 tracking-widest mb-1">
                                {data.name}
                              </p>
                              <p className="text-lg font-black text-foreground">
                                {formatCurrency(data.value)}
                              </p>
                              <p className="text-[10px] font-bold text-muted-foreground/40 mt-1">
                                {data.quantity} ADET SATIŞ
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground/40 italic text-sm">
                  Veri toplanıyor...
                </div>
              )}
            </div>
          </div>

          <div className="bg-background border border-border rounded-[2.5rem] p-10 shadow-sm">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-muted/30 rounded-2xl border border-border/5">
                <ShoppingBag className="w-5 h-5 text-foreground/70" />
              </div>
              <h3 className="text-xl font-black text-foreground">En Çok Satanlar</h3>
            </div>
            <div className="h-[300px] w-full">
              {productData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productData} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 700 }}
                      width={100}
                    />
                    <Tooltip
                      content={<ProductTooltip />}
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                    />
                    <Bar dataKey="quantity" fill="#007AFF" radius={[0, 6, 6, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground/40 italic text-sm">
                  Veri toplanıyor...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Performance Charts */}
        <div className="bg-background border border-border rounded-[2.5rem] p-10 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted/30 rounded-2xl border border-border/5">
                <Calendar className="w-5 h-5 text-foreground/70" />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground">Aylık Performans</h3>
                <p className="text-sm text-muted-foreground/60 font-medium">
                  Gelir, Gider ve Kar Analizi
                </p>
              </div>
            </div>
          </div>
          <div className="h-[400px] w-full">
            {monthlyReports.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
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
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={65}
                    tick={{ fontSize: 11, fontWeight: 600 }}
                    tickFormatter={(val) => `${Math.round(val / 100)} ₺`}
                  />
                  <Tooltip content={<MonthlyTooltip />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar
                    dataKey="revenue"
                    name="Ciro"
                    fill="#34C759"
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Gider"
                    fill="#FF3B30"
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Net Kar"
                    stroke="#007AFF"
                    strokeWidth={3}
                    dot={{ fill: '#007AFF', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground/40 italic text-sm text-center">
                Henüz yeterli veri birikmedi.
                <br />
                Z-Raporları oluştukça aylık analiz görünür hale gelecektir.
              </div>
            )}
          </div>
        </div>

        {/* History Section */}
        <div className="bg-background border border-border rounded-[2.5rem] p-10 shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted/30 rounded-2xl border border-border/5">
                <HistoryIcon className="w-5 h-5 text-foreground/70" />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground">Z-Raporu Geçmişi</h3>
                <p className="text-sm text-muted-foreground/60 font-medium">
                  Arşivlenmiş gün sonu raporları
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-2xl border border-border/10">
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="h-9 w-24 bg-background border-none shadow-none text-[10px] font-black uppercase tracking-widest rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((year) => (
                    <SelectItem
                      key={year}
                      value={year.toString()}
                      className="text-[11px] font-bold"
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="h-9 w-32 bg-background border-none shadow-none text-[10px] font-black uppercase tracking-widest rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[11px] font-bold">
                    SON 30 GÜN
                  </SelectItem>
                  {[
                    'OCAK',
                    'ŞUBAT',
                    'MART',
                    'NİSAN',
                    'MAYIS',
                    'HAZİRAN',
                    'TEMMUZ',
                    'AĞUSTOS',
                    'EYLÜL',
                    'EKİM',
                    'KASIM',
                    'ARALIK'
                  ].map((m, i) => (
                    <SelectItem key={m} value={i.toString()} className="text-[11px] font-bold">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="py-4 pl-6 text-[10px] font-black text-muted-foreground/60 tracking-widest">
                    TARİH
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-black text-muted-foreground/60 tracking-widest">
                    NAKİT
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-black text-muted-foreground/60 tracking-widest">
                    KART
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-black text-foreground tracking-widest">
                    TOPLAM
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-black text-muted-foreground/60 tracking-widest pr-10">
                    SİPARİŞ
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zReportHistory.map((report) => (
                  <TableRow
                    key={report.id}
                    className="border-border/50 hover:bg-muted/10 cursor-pointer h-16 group"
                    onClick={() => setSelectedReport(report)}
                  >
                    <TableCell className="pl-6 font-bold text-sm text-foreground/80">
                      {new Date(report.date).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-success/70">
                      {formatCurrency(report.totalCash)}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-info/70">
                      {formatCurrency(report.totalCard)}
                    </TableCell>
                    <TableCell className="text-right font-black tabular-nums text-foreground">
                      {formatCurrency(report.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-muted-foreground/60 pr-10">
                      <div className="flex items-center justify-end gap-3">
                        {report.orderCount}
                        <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary transition-all group-hover:translate-x-1" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {zReportHistory.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-40 text-center text-muted-foreground/40 italic text-sm"
                    >
                      Kayıtlı Z-Raporu bulunamadı.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Detail Modals */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-border bg-background shadow-2xl rounded-[2.5rem] [&>button]:hidden">
          {selectedReport && (
            <div className="flex flex-col">
              <div className="px-10 py-8 border-b bg-muted/10 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Rapor Detayı</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mt-1">
                    <Calendar className="w-4 h-4 opacity-50" />
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
                <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <ReceiptText className="w-7 h-7 text-primary" />
                </div>
              </div>

              <div className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 rounded-3xl border border-border bg-background shadow-sm space-y-1">
                    <span className="text-[10px] font-black text-muted-foreground/40 tracking-widest uppercase">
                      GÜNLÜK HASILAT
                    </span>
                    <div className="text-2xl font-black tabular-nums">
                      {formatCurrency(selectedReport.totalRevenue)}
                    </div>
                  </div>
                  <div className="p-6 rounded-3xl border border-border bg-background shadow-sm space-y-1">
                    <span className="text-[10px] font-black text-muted-foreground/40 tracking-widest uppercase">
                      TOPLAM SİPARİŞ
                    </span>
                    <div className="text-2xl font-black tabular-nums">
                      {selectedReport.orderCount} ADET
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-muted-foreground/40 tracking-[0.2em] uppercase px-1">
                    Ödeme Kanalları
                  </h4>
                  <div className="border border-border rounded-3xl overflow-hidden divide-y divide-border">
                    <div className="flex justify-between items-center p-5 bg-background hover:bg-muted/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-success/5 flex items-center justify-center">
                          <Banknote className="w-5 h-5 text-success" />
                        </div>
                        <span className="font-bold text-sm">NAKİT ÖDEMELER</span>
                      </div>
                      <span className="font-black tabular-nums text-success">
                        {formatCurrency(selectedReport.totalCash)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-5 bg-background hover:bg-muted/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-info/5 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-info" />
                        </div>
                        <span className="font-bold text-sm">KREDİ KARTI</span>
                      </div>
                      <span className="font-black tabular-nums text-info">
                        {formatCurrency(selectedReport.totalCard)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={() => setSelectedReport(null)}
                    className="w-full h-14 rounded-2xl font-black text-xs tracking-widest uppercase bg-muted text-foreground hover:bg-muted/80"
                  >
                    KAPAT
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EndOfDayModal open={showEndOfDayModal} onClose={() => setShowEndOfDayModal(false)} />
    </div>
  )
}
