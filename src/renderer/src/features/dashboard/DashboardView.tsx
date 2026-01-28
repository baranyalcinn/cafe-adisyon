import { useEffect, useState } from 'react'
import {
  TrendingUp,
  CreditCard,
  Banknote,
  ShoppingBag,
  Users,
  FileText,
  RefreshCw,
  Eye,
  X,
  ReceiptText,
  Moon,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ComposedChart
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

function PaymentTooltip({ active, payload }: CustomTooltipProps): React.JSX.Element | null {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card text-card-foreground border border-border rounded-lg px-4 py-3 shadow-lg">
        <p className="text-sm font-semibold mb-1">{payload[0].name}</p>
        <p
          className="text-lg font-bold tabular-nums"
          style={{
            color: payload[0].name === 'Nakit' ? 'var(--color-success)' : 'var(--color-info)'
          }}
        >
          {formatCurrency(Number(payload[0].value))}
        </p>
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

  const loadStats = async (): Promise<void> => {
    try {
      const [statsData, trendData, historyData, monthlyData] = await Promise.all([
        cafeApi.dashboard.getExtendedStats(),
        cafeApi.dashboard.getRevenueTrend(7),
        cafeApi.zReport.getHistory(30),
        cafeApi.reports.getMonthly(12)
      ])
      setStats(statsData)
      setRevenueTrend(trendData)
      setZReportHistory(historyData)
      setMonthlyReports(monthlyData)
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  const paymentData = stats
    ? [
        { name: 'Nakit', value: stats.paymentMethodBreakdown.cash, fill: 'var(--color-success)' },
        { name: 'Kart', value: stats.paymentMethodBreakdown.card, fill: 'var(--color-info)' }
      ]
    : []

  const totalPayment = paymentData.reduce((sum, item) => sum + item.value, 0)

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
            <Button variant="outline" size="sm" onClick={loadStats} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Yenile
            </Button>

            <OrderHistoryModal />

            <Button
              onClick={() => setShowEndOfDayModal(true)}
              variant="destructive"
              className="gap-2"
            >
              <Moon className="w-4 h-4" />
              Gün Sonu
            </Button>
          </div>
        </div>

        {/* Main KPI Bento Grid Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-4">
          {/* Daily Revenue - The Hero Card */}
          <Card className="lg:col-span-6 relative overflow-hidden bg-gradient-to-br from-success/20 via-success/10 to-transparent border-success/30 shadow-xl group hover:shadow-success/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-48 h-48 bg-success/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-success/20 transition-colors" />
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="space-y-1">
                <CardTitle className="text-sm font-black text-muted-foreground uppercase tracking-[0.15em]">
                  Bugünkü Toplam Ciro
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="text-xs font-bold text-success">Canlı Veri</span>
                </div>
              </div>
              <div className="p-3 bg-success/20 rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black tabular-nums tracking-tighter text-foreground drop-shadow-sm">
                {formatCurrency(stats?.dailyRevenue || 0)}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <div className="px-2.5 py-1 bg-success/15 border border-success/30 rounded-full text-[10px] font-black text-success uppercase tracking-widest">
                  Hedefe Yakın
                </div>
                <p className="text-xs text-muted-foreground font-medium italic">
                  Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Total Orders */}
          <Card className="lg:col-span-3 relative overflow-hidden bg-gradient-to-br from-info/20 via-info/10 to-transparent border-info/30 group hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                Sipariş Sayısı
              </CardTitle>
              <div className="p-2 bg-info/20 rounded-xl">
                <ShoppingBag className="w-4 h-4 text-info" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tabular-nums">{stats?.totalOrders || 0}</div>
              <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-tight">
                Günlük tamamlanan
              </p>
            </CardContent>
          </Card>

          {/* Open Tables & Pending Orders Container */}
          <div className="lg:col-span-3 grid grid-rows-2 gap-4">
            <Card className="relative overflow-hidden bg-gradient-to-br from-warning/20 to-transparent border-warning/30 flex flex-col justify-center">
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-warning uppercase tracking-widest">
                    Dolu Masa
                  </p>
                  <p className="text-2xl font-black">{stats?.openTables || 0}</p>
                </div>
                <div className="p-2 bg-warning/20 rounded-xl">
                  <Users className="w-4 h-4 text-warning" />
                </div>
              </div>
            </Card>
            <Card className="relative overflow-hidden bg-gradient-to-br from-primary/20 to-transparent border-primary/30 flex flex-col justify-center">
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                    Açık Hesap
                  </p>
                  <p className="text-2xl font-black text-foreground">{stats?.pendingOrders || 0}</p>
                </div>
                <div className="p-2 bg-primary/20 rounded-xl">
                  <ReceiptText className="w-4 h-4 text-primary" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Payment Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-success">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/20 rounded-lg">
                  <Banknote className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nakit Tahsilat</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(stats?.paymentMethodBreakdown.cash || 0)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-success">
                  {totalPayment > 0
                    ? (((stats?.paymentMethodBreakdown.cash || 0) / totalPayment) * 100).toFixed(0)
                    : 0}
                  %
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-info">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-info/20 rounded-lg">
                  <CreditCard className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kart Tahsilat</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(stats?.paymentMethodBreakdown.card || 0)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-info">
                  {totalPayment > 0
                    ? (((stats?.paymentMethodBreakdown.card || 0) / totalPayment) * 100).toFixed(0)
                    : 0}
                  %
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Son 7 Gün Ciro Trendi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
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
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                Henüz veri yok
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Distribution - Donut Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Ödeme Yöntemi Dağılımı
              </CardTitle>
            </CardHeader>
            <CardContent>
              {totalPayment > 0 ? (
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {paymentData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.fill}
                            stroke="none"
                            style={{ outline: 'none' }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PaymentTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        formatter={(value) => <span className="text-foreground">{value}</span>}
                      />
                      {/* Center text */}
                      <text
                        x="50%"
                        y="45%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-foreground text-2xl font-bold"
                      >
                        {formatCurrency(totalPayment)}
                      </text>
                      <text
                        x="50%"
                        y="55%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-muted-foreground text-xs"
                      >
                        Toplam
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                  Henüz ödeme verisi yok
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Products - Horizontal Bar Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                En Çok Satan Ürünler
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
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
                <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                  Henüz satış verisi yok
                </div>
              )}
            </CardContent>
          </Card>
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
            <Card className="xl:col-span-3 lg:row-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Gelir & Gider Karşılaştırması
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            <Card className="xl:col-span-1 lg:row-span-2 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-primary">Aylık Kar Özeti</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0">
                <ScrollArea className="h-full max-h-[420px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 border-none">
                        <TableHead className="font-black text-[10px] uppercase tracking-widest pl-4">
                          Ay
                        </TableHead>
                        <TableHead className="text-right font-black text-[10px] uppercase tracking-widest pr-4">
                          Kâr
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyReports.map((report) => (
                        <TableRow
                          key={report.id}
                          className="hover:bg-primary/5 transition-colors border-none group"
                        >
                          <TableCell className="font-bold uppercase text-xs pl-4">
                            {new Date(report.monthDate).toLocaleDateString('tr-TR', {
                              month: 'long'
                            })}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right font-black tabular-nums text-sm pr-4 group-hover:scale-105 transition-transform origin-right',
                              report.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                            )}
                          >
                            {formatCurrency(report.netProfit)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {monthlyReports.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="h-24 text-center text-muted-foreground italic"
                          >
                            Veri yok
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Z-Report History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Z-Raporu Geçmişi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {zReportHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Henüz Z-Raporu oluşturulmamış. Gün sonunda yukarıdaki butona tıklayarak rapor
                oluşturabilirsiniz.
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
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
                      <TableHead className="text-center font-medium text-muted-foreground">
                        Detay
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zReportHistory.map((report) => (
                      <TableRow
                        key={report.id}
                        className="cursor-pointer transition-colors"
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
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

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
                              {formatCurrency(
                                selectedReport.totalRevenue - selectedReport.totalVat
                              )}
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
    </div>
  )
}
