import { useCallback, useEffect, useState } from 'react'
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
  BarChart3
} from 'lucide-react'
import { Card } from '@/components/ui/card'
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
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ComposedChart,
  Legend
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
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [loadStats])

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
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-background to-muted/20 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Günlük istatistikler ve raporlar</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadStats}
              className="gap-2 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <RefreshCw className="w-4 h-4" />
              Yenile
            </Button>

            <OrderHistoryModal />

            <Button
              onClick={() => setShowEndOfDayModal(true)}
              className="gap-2 h-10 px-5 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20 active:scale-95 transition-all"
            >
              <Moon className="w-4 h-4" />
              Gün Sonu
            </Button>
          </div>
        </div>

        {/* Main KPI Bento Grid Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-4">
          {/* Daily Revenue - The Hero Card */}
          <div className="lg:col-span-6 premium-card ambient-glow relative overflow-hidden group p-6 flex flex-col justify-between">
            <div className="absolute right-0 top-0 h-64 w-64 translate-x-16 -translate-y-16 rounded-full bg-success/10 blur-3xl transition-all duration-700 group-hover:bg-success/15" />

            <div className="relative z-10 flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                  Bugünkü Toplam Ciro
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                  <span className="text-[10px] font-bold text-success">Canlı Akış</span>
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
              <div className="flex items-center gap-3 mt-3">
                <div className="px-2.5 py-1 rounded-lg bg-success/10 border border-success/20 text-[10px] font-black text-success uppercase tracking-wider">
                  +12.5% Artış
                </div>
                <p className="text-[10px] font-medium text-muted-foreground/60">
                  Düne göre performans
                </p>
              </div>
            </div>
          </div>

          {/* Total Orders */}
          <div className="lg:col-span-3 premium-card ambient-glow p-6 flex flex-col justify-between group">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                Siparişler
              </span>
              <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1">
                <ShoppingBag className="w-5 h-5 text-info" />
              </div>
            </div>
            <div>
              <div className="text-4xl font-black tabular-nums text-foreground">
                {stats?.totalOrders || 0}
              </div>
              <p className="text-[10px] font-medium text-muted-foreground mt-1">
                Tamamlanan sipariş
              </p>
            </div>
          </div>

          {/* Open Tables & Pending Orders Container */}
          <div className="lg:col-span-3 grid grid-rows-2 gap-4">
            {/* Open Tables */}
            <div className="premium-card ambient-glow px-5 py-4 flex items-center justify-between group">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-0.5">
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

            {/* Pending Orders */}
            <div className="premium-card ambient-glow px-5 py-4 flex items-center justify-between group">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-0.5">
                  Açık Hesap
                </p>
                <p className="text-2xl font-black text-primary tabular-nums">
                  {stats?.pendingOrders || 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ReceiptText className="w-5 h-5 text-primary" />
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
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                  Saatlik Satış Yoğunluğu
                </h3>
                <p className="text-[10px] font-medium text-muted-foreground/60">
                  Günün en yoğun saatleri
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
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
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
                      tickFormatter={(value) => `₺${value}`}
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
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                    Nakit
                  </p>
                  <p className="text-xl font-black text-foreground tabular-nums">
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
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                    Kredi Kartı
                  </p>
                  <p className="text-xl font-black text-foreground tabular-nums">
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
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
              Son 7 Gün Ciro Trendi
            </h3>
          </div>
          <div className="h-[280px] w-full">
            {revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                    tickFormatter={(value) => formatCurrency(value)}
                    className="fill-foreground"
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Henüz veri yok
              </div>
            )}
          </div>
        </div>

        {/* Product Performance - Full Width */}
        <div className="grid grid-cols-1 gap-6">
          {/* Top Products - Horizontal Bar Chart */}
          <div className="premium-card ambient-glow p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-success" />
              </div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
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
                      fill="var(--color-success)"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={24}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Henüz satış verisi yok
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monthly analysis section */}
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Aylık Analiz</h2>
              <p className="text-sm text-muted-foreground">
                Son 12 ayın gelir, gider ve kar durumu
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
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                  Bu Ayın Günlük Satışları
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
                        tickFormatter={(val) => `₺${(val / 1000).toFixed(0)}k`}
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
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                  Aylık Özet
                </h3>
              </div>

              <div className="flex-1 flex flex-col justify-center gap-8">
                <div>
                  <p className="text-sm text-muted-foreground font-medium mb-1">
                    {filterMonth !== 'all' ? 'Seçili Dönem Ciro' : 'Görüntülenen Ciro'}
                  </p>
                  <div className="text-3xl font-black text-success tabular-nums">
                    {formatCurrency(
                      zReportHistory.reduce((acc, curr) => acc + curr.totalRevenue, 0)
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground font-medium mb-1">Ortalama Günlük</p>
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
                  <p className="text-sm text-muted-foreground font-medium mb-1">En Yüksek Gün</p>
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
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                  Z-Raporu Geçmişi
                </h3>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">
                  Arşiv ve Kayıtlar
                </p>
              </div>
            </div>

            {/* Premium Filter Bar */}
            <div className="flex items-center gap-2 bg-muted/20 p-1.5 rounded-2xl border border-white/5 shadow-inner">
              <div className="flex items-center gap-2 px-3 border-r border-white/10 mr-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">
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
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-medium text-muted-foreground">Tarih</TableHead>
                    <TableHead className="text-right font-medium text-muted-foreground">
                      Nakit
                    </TableHead>
                    <TableHead className="text-right font-medium text-muted-foreground">
                      Kart
                    </TableHead>
                    <TableHead className="text-right font-medium text-muted-foreground">
                      Toplam
                    </TableHead>
                    <TableHead className="text-right font-medium text-muted-foreground">
                      Sipariş
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zReportHistory.map((report) => (
                    <TableRow
                      key={report.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedReport(report)}
                    >
                      <TableCell className="font-medium">
                        {new Date(report.date).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell className="text-right text-success tabular-nums">
                        {formatCurrency(report.totalCash)}
                      </TableCell>
                      <TableCell className="text-right text-info tabular-nums">
                        {formatCurrency(report.totalCard)}
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        {formatCurrency(report.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right">{report.orderCount}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedReport(report)
                          }}
                          className="hover:bg-primary/10"
                        ></Button>
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
        <DialogContent className="sm:max-w-[480px] max-h-[96vh] p-0 overflow-hidden border-primary/20 bg-background/95 backdrop-blur-md">
          {selectedReport && (
            <div className="flex flex-col">
              <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-background p-4 border-b border-primary/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />

                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-2 bg-background/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 ring-1 ring-black/5 shrink-0">
                    <ReceiptText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-black text-foreground tracking-tight uppercase italic truncate">
                      <span className="text-primary">Z</span> Raporu Detayı
                    </h2>
                    <div className="flex items-center gap-2.5 text-muted-foreground mt-1">
                      <Calendar className="w-4 h-4 text-primary/60" />
                      <span className="text-xs font-bold uppercase tracking-widest truncate">
                        {new Date(selectedReport.date).toLocaleDateString('tr-TR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 relative z-20 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="group bg-gradient-to-br from-emerald-500/10 to-background border p-3.5 rounded-[1.5rem] flex flex-col items-center text-center shadow-sm hover:shadow-lg transition-all duration-300 border-emerald-500/20">
                    <div className="p-1.5 bg-emerald-500/20 rounded-xl mb-2 group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                      Günlük Ciro
                    </p>
                    <p className="text-xl font-black text-emerald-500 tabular-nums tracking-tight">
                      {formatCurrency(selectedReport.totalRevenue)}
                    </p>
                  </div>

                  <div className="group bg-gradient-to-br from-blue-500/10 to-background border p-3.5 rounded-[1.5rem] flex flex-col items-center text-center shadow-sm hover:shadow-lg transition-all duration-300 border-blue-500/20">
                    <div className="p-1.5 bg-blue-500/20 rounded-xl mb-2 group-hover:scale-110 transition-transform">
                      <ShoppingBag className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                      Sipariş
                    </p>
                    <p className="text-xl font-black text-blue-500 tabular-nums tracking-tight">
                      {selectedReport.orderCount}
                    </p>
                  </div>

                  <div className="group bg-gradient-to-br from-orange-500/10 to-background border p-3.5 rounded-[1.5rem] flex flex-col items-center text-center shadow-sm hover:shadow-lg transition-all duration-300 border-orange-500/20">
                    <div className="p-1.5 bg-orange-500/20 rounded-xl mb-2 group-hover:scale-110 transition-transform">
                      <Banknote className="w-4 h-4 text-orange-500" />
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                      Nakit
                    </p>
                    <p className="text-xl font-black text-orange-500 tabular-nums tracking-tight">
                      {formatCurrency(selectedReport.totalCash)}
                    </p>
                  </div>

                  <div className="group bg-gradient-to-br from-purple-500/10 to-background border p-3.5 rounded-[1.5rem] flex flex-col items-center text-center shadow-sm hover:shadow-lg transition-all duration-300 border-purple-500/20">
                    <div className="p-1.5 bg-purple-500/20 rounded-xl mb-2 group-hover:scale-110 transition-transform">
                      <CreditCard className="w-4 h-4 text-purple-500" />
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                      Kart
                    </p>
                    <p className="text-xl font-black text-purple-500 tabular-nums tracking-tight">
                      {formatCurrency(selectedReport.totalCard)}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Card className="bg-muted/30 border-none shadow-inner overflow-hidden">
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-opacity-80">
                            Net Satışlar
                          </span>
                          <p className="text-xl font-black tabular-nums text-foreground">
                            {formatCurrency(selectedReport.totalRevenue - selectedReport.totalVat)}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-opacity-80">
                            KDV (%10)
                          </span>
                          <p className="text-xl font-bold tabular-nums text-muted-foreground">
                            {formatCurrency(selectedReport.totalVat)}
                          </p>
                        </div>
                      </div>

                      <div className="h-px bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent" />

                      {selectedReport.cancelCount > 0 && (
                        <div className="flex justify-between items-center text-xs text-red-500/80 bg-red-500/5 px-3 py-2 rounded-xl border border-red-500/10">
                          <span className="font-bold flex items-center gap-2 uppercase tracking-tight">
                            <AlertCircle className="w-4 h-4" /> İptal Edilenler
                          </span>
                          <span className="font-black text-sm">{selectedReport.cancelCount}</span>
                        </div>
                      )}
                    </div>
                  </Card>

                  <div className="flex flex-col items-center gap-4 pt-2">
                    <Button
                      className="w-full h-12 rounded-2xl font-black uppercase tracking-widest gap-3 text-sm shadow-xl hover:shadow-primary/20 transition-all active:scale-[0.98]"
                      onClick={() => setSelectedReport(null)}
                    >
                      <X className="w-5 h-5" />
                      Pencereyi Kapat
                    </Button>
                  </div>
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
