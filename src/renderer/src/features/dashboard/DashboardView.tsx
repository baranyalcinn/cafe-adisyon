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
    dataKey: string
    payload: Record<string, unknown>
  }>
  label?: string
}

function RevenueTooltip({ active, payload, label }: CustomTooltipProps): React.JSX.Element | null {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card text-card-foreground border border-border rounded-lg px-4 py-3 shadow-lg">
        <p className="text-sm font-semibold mb-1">{label}</p>
        <p className="text-lg font-bold text-emerald-500 tabular-nums">
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
        <p className="text-lg font-bold text-emerald-500 tabular-nums">
          {payload[0].value} adet satış
        </p>
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
          style={{ color: payload[0].name === 'Nakit' ? '#10b981' : '#3b82f6' }}
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
      <div className="bg-card text-card-foreground border border-border rounded-lg px-4 py-3 shadow-lg">
        <p className="text-sm font-semibold mb-1">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Gelir:</span>
            <span className="text-sm font-bold text-emerald-500">
              {formatCurrency(payload.find((p) => p.dataKey === 'revenue')?.value || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Gider:</span>
            <span className="text-sm font-bold text-red-500">
              {formatCurrency(payload.find((p) => p.dataKey === 'expenses')?.value || 0)}
            </span>
          </div>
          <div className="h-px bg-border my-1" />
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Net Kar:</span>
            <span className="text-sm font-black text-primary">
              {formatCurrency(payload.find((p) => p.dataKey === 'profit')?.value || 0)}
            </span>
          </div>
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
        { name: 'Nakit', value: stats.paymentMethodBreakdown.cash, fill: '#10b981' },
        { name: 'Kart', value: stats.paymentMethodBreakdown.card, fill: '#3b82f6' }
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

        {/* Main KPI Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Günlük Ciro
              </CardTitle>
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatCurrency(stats?.dailyRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Bugünkü toplam</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Toplam Sipariş
              </CardTitle>
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <ShoppingBag className="w-4 h-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{stats?.totalOrders || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Bugün tamamlanan</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/20">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Açık Masa</CardTitle>
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Users className="w-4 h-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.openTables || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Şu an dolu</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Açık Hesap
              </CardTitle>
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <ReceiptText className="w-4 h-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingOrders || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Ödemesi beklenen</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Banknote className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nakit Tahsilat</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(stats?.paymentMethodBreakdown.cash || 0)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-500">
                  {totalPayment > 0
                    ? (((stats?.paymentMethodBreakdown.cash || 0) / totalPayment) * 100).toFixed(0)
                    : 0}
                  %
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kart Tahsilat</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(stats?.paymentMethodBreakdown.card || 0)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-500">
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
                          <Cell key={`cell-${index}`} fill={entry.fill} />
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
                      fill="#10b981"
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

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Gelir & Gider Karşılaştırması
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyReports.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
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
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `₺${(val / 100000).toFixed(0)}k`}
                      />
                      <Tooltip content={<MonthlyTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="revenue"
                        name="Ciro"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={30}
                      />
                      <Bar
                        dataKey="expenses"
                        name="Gider"
                        fill="#ef4444"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={30}
                      />
                      <Line
                        type="monotone"
                        dataKey="profit"
                        name="Net Kar"
                        stroke="var(--color-primary)"
                        strokeWidth={3}
                        dot={{ r: 4, fill: 'var(--color-primary)' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[320px] text-muted-foreground">
                    Henüz aylık veri yok
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">Aylık Kar Özeti</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 font-bold">Ay</th>
                        <th className="text-right p-3 font-bold">Ciro</th>
                        <th className="text-right p-3 font-bold">Kâr</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyReports.map((report) => (
                        <tr key={report.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-3 font-medium uppercase">
                            {new Date(report.monthDate).toLocaleDateString('tr-TR', {
                              month: 'long'
                            })}
                          </td>
                          <td className="p-3 text-right tabular-nums">
                            {formatCurrency(report.totalRevenue)}
                          </td>
                          <td
                            className={cn(
                              'p-3 text-right font-bold tabular-nums',
                              report.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                            )}
                          >
                            {formatCurrency(report.netProfit)}
                          </td>
                        </tr>
                      ))}
                      {monthlyReports.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-muted-foreground italic">
                            Veri henüz toplanmadı
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Tarih
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                        Nakit
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                        Kart
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                        Toplam
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                        Sipariş
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                        Detay
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {zReportHistory.map((report) => (
                      <tr
                        key={report.id}
                        className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedReport(report)}
                      >
                        <td className="py-3 px-4 font-medium">
                          {new Date(report.date).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="text-right py-3 px-4 text-emerald-600 tabular-nums">
                          {formatCurrency(report.totalCash)}
                        </td>
                        <td className="text-right py-3 px-4 text-blue-600 tabular-nums">
                          {formatCurrency(report.totalCard)}
                        </td>
                        <td className="text-right py-3 px-4 font-bold tabular-nums">
                          {formatCurrency(report.totalRevenue)}
                        </td>
                        <td className="text-right py-3 px-4">{report.orderCount}</td>
                        <td className="text-center py-3 px-4">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Z-Report Detail Modal */}
        {/* Z-Report Detail Modal - Redesigned for better fit and visuals */}
        <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
          <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-primary/20 bg-background/95 backdrop-blur-xl">
            {selectedReport && (
              <div className="flex flex-col">
                <div className="bg-primary/10 p-8 pb-10 border-b border-primary/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative z-10 flex flex-col items-center text-center space-y-3">
                    <div className="p-4 bg-background/50 rounded-2xl shadow-sm border border-primary/10">
                      <FileText className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                        Z-Raporu Detayı
                      </h2>
                      <div className="flex items-center gap-2 text-muted-foreground mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-sm font-medium">
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

                <div className="p-6 -mt-6 relative z-20">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card border p-5 rounded-[2.5rem] flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                      <TrendingUp className="w-5 h-5 text-emerald-500 mb-3" />
                      <p className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                        Günlük Ciro
                      </p>
                      <p className="text-xl font-extrabold text-emerald-600 tabular-nums tracking-tight">
                        {formatCurrency(selectedReport.totalRevenue)}
                      </p>
                    </div>

                    <div className="bg-card border p-5 rounded-[2.5rem] flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                      <ShoppingBag className="w-5 h-5 text-blue-500 mb-3" />
                      <p className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                        Sipariş Sayısı
                      </p>
                      <p className="text-xl font-extrabold text-blue-600 tabular-nums tracking-tight">
                        {selectedReport.orderCount}
                      </p>
                    </div>

                    <div className="bg-card border p-5 rounded-[2.5rem] flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                      <Banknote className="w-5 h-5 text-amber-500 mb-3" />
                      <p className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                        Nakit Toplam
                      </p>
                      <p className="text-xl font-extrabold text-amber-600 tabular-nums tracking-tight">
                        {formatCurrency(selectedReport.totalCash)}
                      </p>
                    </div>

                    <div className="bg-card border p-5 rounded-[2.5rem] flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                      <CreditCard className="w-5 h-5 text-purple-500 mb-3" />
                      <p className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                        Kart Toplam
                      </p>
                      <p className="text-xl font-extrabold text-purple-600 tabular-nums tracking-tight">
                        {formatCurrency(selectedReport.totalCard)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 space-y-5">
                    <div className="bg-muted/20 rounded-[2rem] p-6 border border-dashed border-muted-foreground/20">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground font-semibold">Net Satışlar</span>
                          <span className="font-extrabold tabular-nums text-foreground">
                            {formatCurrency(selectedReport.totalRevenue - selectedReport.totalVat)}
                          </span>
                        </div>
                        <div className="h-px bg-muted-foreground/5" />
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground font-semibold">
                            Toplam KDV (%10)
                          </span>
                          <span className="font-extrabold tabular-nums text-foreground">
                            {formatCurrency(selectedReport.totalVat)}
                          </span>
                        </div>
                        {selectedReport.cancelCount > 0 && (
                          <>
                            <div className="h-px bg-muted-foreground/5" />
                            <div className="flex justify-between items-center text-sm text-red-600">
                              <span className="font-semibold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> İptal Sayısı
                              </span>
                              <span className="font-extrabold">{selectedReport.cancelCount}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                      <div className="w-full text-[10px] text-muted-foreground/60 flex justify-between px-2 font-mono">
                        <span>ID: {selectedReport.id.slice(0, 12)}...</span>
                        <span>{new Date(selectedReport.createdAt).toLocaleString('tr-TR')}</span>
                      </div>
                      <Button
                        className="w-full h-12 rounded-2xl font-bold gap-2 text-base shadow-lg shadow-primary/10"
                        onClick={() => setSelectedReport(null)}
                      >
                        <X className="w-4 h-4" />
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
