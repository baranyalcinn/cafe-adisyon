import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { type DailySummary } from '@/lib/api'
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
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { EndOfDayModal } from '@/components/modals/EndOfDayModal'
import { OrderHistoryModal } from '@/components/modals/OrderHistoryModal'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { cn, formatCurrency } from '@/lib/utils'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
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
      <div className="bg-card border border-border/80 p-4 rounded-2xl shadow-xl min-w-[160px]">
        <p className="text-[10px] font-black text-muted-foreground/60 tracking-[0.25em] uppercase mb-2">
          {label && !isNaN(parseISO(label).getTime())
            ? parseISO(label).toLocaleDateString('tr-TR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })
            : label}
        </p>
        <div className="flex flex-col gap-0.5">
          <p className="text-2xl font-black text-foreground tabular-nums tracking-tighter">
            {formatCurrency(payload[0].value as number)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,122,255,0.4)]" />
            <span className="text-[9px] font-black text-primary tracking-[0.2em] uppercase">
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
      <div className="bg-card border border-border/80 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-[10px] font-black text-muted-foreground/60 tracking-[0.2em] uppercase mb-1">
          {data.fullName || data.name}
        </p>
        <p className="text-lg font-black text-foreground tabular-nums tracking-tight">
          {payload[0].value}{' '}
          <span className="text-[10px] text-muted-foreground/50 ml-1">ADET SATIŞ</span>
        </p>
      </div>
    )
  }
  return null
}

function MonthlyTooltip({ active, payload, label }: CustomTooltipProps): React.JSX.Element | null {
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
                    backgroundColor:
                      (entry as TooltipPayloadEntry).color || (entry as TooltipPayloadEntry).fill
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

const CATEGORY_COLOR_MAP: Record<string, string> = {
  coffee: '#d97706', // Amber 600
  'ice-cream-cone': '#22d3ee', // Cyan 400
  cookie: '#eab308', // Yellow 500
  wine: '#38bdf8', // Sky 400
  cake: '#f472b6', // Pink 400
  sandwich: '#fb923c', // Orange 400
  utensils: '#10b981' // Emerald 500
}

const getSystemColor = (name?: string, icon?: string, index: number = 0): string => {
  const lowerName = name?.toLowerCase() || ''

  // Explicit matching for higher aesthetic appeal with deeper tones
  if (lowerName.includes('soğuk')) return '#0055b3' // Deeper Blue
  if (lowerName.includes('sıcak') || lowerName.includes('kahve') || lowerName.includes('çay'))
    return '#8a4b08' // Darker Amber / Brownish
  if (lowerName.includes('tatlı') || lowerName.includes('pasta') || lowerName.includes('yemek'))
    return '#be185d' // Darker Pink/Rose
  if (lowerName.includes('içecek')) return '#15803d' // Darker Green

  if (icon && CATEGORY_COLOR_MAP[icon]) {
    return CATEGORY_COLOR_MAP[icon]
  }

  const defaultColors = [
    '#0055b3', // Deeper Blue
    '#be185d', // Darker Pink
    '#15803d', // Darker Green
    '#b45309', // Darker Orange
    '#6b21a8', // Darker Purple
    '#0e7490', // Darker Cyan
    '#a16207' // Darker Yellow
  ]
  return defaultColors[index % defaultColors.length]
}

interface CategoryBreakdown {
  categoryName: string
  revenue: number
  quantity: number
  icon?: string
}

interface HoveredCategory {
  name: string
  value: number
  quantity: number
  color: string
}

const CategoryDistributionChart = React.memo(
  ({
    data,
    onHover
  }: {
    data: CategoryBreakdown[]
    onHover: (category: HoveredCategory | null) => void
  }): React.JSX.Element => {
    return (
      <div className="flex-1 w-full relative">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <PieChart>
            <Pie
              data={data.map((c, index) => ({
                name: c.categoryName,
                value: c.revenue,
                quantity: c.quantity,
                color: getSystemColor(c.categoryName, c.icon, index)
              }))}
              innerRadius={90}
              outerRadius={130}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              isAnimationActive={false}
              onMouseEnter={(_, index) => {
                const c = data[index]
                if (c) {
                  onHover({
                    name: c.categoryName,
                    value: c.revenue,
                    quantity: c.quantity,
                    color: getSystemColor(c.categoryName, c.icon, index)
                  })
                }
              }}
              onMouseLeave={() => onHover(null)}
            >
              {data.map((c, index) => (
                <Cell
                  key={index}
                  fill={getSystemColor(c.categoryName, c.icon, index)}
                  className="focus:outline-none"
                />
              ))}
            </Pie>
            <Tooltip content={<div className="hidden" />} isAnimationActive={false} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }
)

CategoryDistributionChart.displayName = 'CategoryDistributionChart'

export function DashboardView(): React.JSX.Element {
  // React Query Hook
  // Filtering state
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString())

  // UI State
  const [selectedReport, setSelectedReport] = useState<DailySummary | null>(null)
  const [showEndOfDayModal, setShowEndOfDayModal] = useState(false)
  const [hoveredCategory, setHoveredCategory] = useState<{
    name: string
    value: number
    quantity: number
    color: string
  } | null>(null)

  // React Query Hook
  const {
    stats,
    revenueTrend,
    zReportHistory,
    monthlyReports,
    isLoading,
    refetchAll: loadStats
  } = useDashboardStats(filterMonth, filterYear)

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
    <div className="h-full flex flex-col overflow-hidden text-foreground">
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
            <span className="text-muted-foreground/70 font-black tracking-[0.3em] text-[12px] uppercase mt-2">
              DASHBOARD
            </span>
          </div>
        </div>

        {/* Top KPI Cards (Left Aligned Layout - Premium Performance) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card border border-border/50 rounded-[2rem] p-6 shadow-sm flex flex-col items-start justify-center space-y-4 group transition-all duration-300 hover:border-primary/30 hover:shadow-md">
            <div className="transition-transform duration-500 group-hover:scale-110 origin-left">
              <TrendingUp className="w-8 h-8 text-primary drop-shadow-sm" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-muted-foreground/70 tracking-[0.25em] uppercase">
                BUGÜNKÜ CİRO
              </span>
              <div className="flex flex-col items-start gap-1 w-full">
                <div className="text-3xl font-black tabular-nums tracking-tighter text-foreground">
                  {formatCurrency(stats?.dailyRevenue || 0)}
                </div>
                <div className="flex items-center gap-1.5 bg-success/5 border border-success/10 px-2 py-0.5 rounded-full">
                  <span className="flex h-1 w-1 rounded-full bg-success" />
                  <span className="text-[8px] font-black text-success uppercase tracking-[0.2em]">
                    CANLI
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-[2rem] p-6 shadow-sm flex flex-col items-start justify-center space-y-4 group transition-all duration-300 hover:border-info/30 hover:shadow-md">
            <div className="transition-transform duration-500 group-hover:scale-110 origin-left">
              <ShoppingBag className="w-8 h-8 text-info drop-shadow-sm" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-muted-foreground/70 tracking-[0.25em] uppercase">
                SİPARİŞLER
              </span>
              <div className="flex flex-col items-start gap-1 w-full">
                <div className="text-3xl font-black tabular-nums tracking-tighter text-foreground">
                  {stats?.totalOrders || 0}
                </div>
                <span className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">
                  GÜNLÜK ADET
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-[2rem] p-6 shadow-sm flex flex-col items-start justify-center space-y-4 group transition-all duration-300 hover:border-warning/30 hover:shadow-md">
            <div className="transition-transform duration-500 group-hover:scale-110 origin-left">
              <Users className="w-8 h-8 text-warning drop-shadow-sm" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-muted-foreground/70 tracking-[0.25em] uppercase">
                DOLU MASA
              </span>
              <div className="flex flex-col items-start gap-1 w-full">
                <div className="text-3xl font-black tabular-nums tracking-tighter text-foreground">
                  {stats?.openTables || 0}
                </div>
                <span className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">
                  AKTİF SERVİS
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-[2rem] p-6 shadow-sm flex flex-col items-start justify-center space-y-4 group transition-all duration-300 hover:border-destructive/30 hover:shadow-md">
            <div className="transition-transform duration-500 group-hover:scale-110 origin-left">
              <ArrowDownRight className="w-8 h-8 text-destructive drop-shadow-sm" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-muted-foreground/70 tracking-[0.25em] uppercase">
                GÜNLÜK GİDER
              </span>
              <div className="flex flex-col items-start gap-1 w-full">
                <div className="text-3xl font-black tabular-nums tracking-tighter text-destructive">
                  {formatCurrency(stats?.dailyExpenses || 0)}
                </div>
                <span className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">
                  TOPLAM MALİYET
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Trend Section */}
        <div className="bg-card border border-border/50 rounded-[2rem] p-10 shadow-sm transition-[border-color,transform] duration-300 hover:border-primary/20 text-foreground">
          <div className="flex items-center gap-4 mb-10">
            <TrendingUp className="w-6 h-6 text-primary drop-shadow-sm" />
            <div>
              <h3 className="text-xl font-black text-foreground tracking-tight">
                Haftalık Performans
              </h3>
              <p className="text-[10px] text-muted-foreground/70 font-black tracking-[0.2em] uppercase">
                SON 7 GÜNLÜK CİRO ANALİZİ
              </p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" debounce={1}>
                <AreaChart data={revenueTrend} margin={{ left: 10, right: 25, top: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#007AFF" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="var(--color-border)"
                    opacity={0.1}
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    padding={{ left: 10, right: 10 }}
                    tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 800 }}
                    dy={10}
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
                    tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 800 }}
                    tickFormatter={(val) => `${Math.round(val / 100)} ₺`}
                  />
                  <Tooltip content={<RevenueTooltip />} isAnimationActive={false} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#007AFF"
                    strokeWidth={5}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                    isAnimationActive={false}
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#007AFF' }}
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
          <div className="lg:col-span-2 bg-card border border-border/50 rounded-[2rem] p-10 shadow-sm text-foreground">
            <div className="flex items-center gap-4 mb-10">
              <BarChart3 className="w-6 h-6 text-foreground/70 drop-shadow-sm" />
              <div>
                <h3 className="text-xl font-black text-foreground">Saatlik Satış Yoğunluğu</h3>
                <p className="text-sm text-muted-foreground/60 font-medium">
                  Günün en yoğun saatleri
                </p>
              </div>
            </div>
            <div className="h-[250px] w-full">
              {stats?.hourlyActivity && stats.hourlyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" debounce={1}>
                  <BarChart data={stats.hourlyActivity.filter((h) => h.revenue > 0)}>
                    <defs>
                      <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--color-border)"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="hour"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 800 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 800 }}
                      tickFormatter={(value) => `${value / 100}₺`}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--color-muted)', opacity: 0.1 }}
                      isAnimationActive={false}
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
                      isAnimationActive={false}
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
          {/* Compact Payment Summary (Left Aligned Layout - Premium Performance) */}
          <div className="bg-card border border-border/50 rounded-[2rem] p-10 shadow-sm flex flex-col justify-center space-y-12 transition-[border-color,transform] duration-300 hover:border-foreground/5 text-foreground">
            <div className="flex items-center gap-5 group">
              <div className="transition-transform duration-500 group-hover:scale-110 origin-left translate-y-2">
                <Banknote className="w-10 h-10 text-success drop-shadow-sm" />
              </div>
              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] font-black text-muted-foreground/30 tracking-[0.25em] uppercase leading-none">
                  NAKİT
                </span>
                <p className="text-4xl font-black text-foreground tabular-nums tracking-tighter leading-tight">
                  {formatCurrency(stats?.paymentMethodBreakdown?.cash || 0)}
                </p>
              </div>
            </div>

            <div className="w-full h-px bg-border/40" />

            <div className="flex items-center gap-5 group">
              <div className="transition-transform duration-500 group-hover:scale-110 origin-left translate-y-2">
                <CreditCard className="w-10 h-10 text-info drop-shadow-sm" />
              </div>
              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] font-black text-muted-foreground/30 tracking-[0.25em] uppercase leading-none">
                  KART
                </span>
                <p className="text-4xl font-black text-foreground tabular-nums tracking-tighter leading-tight">
                  {formatCurrency(stats?.paymentMethodBreakdown?.card || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Categories & Selling Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-card border border-border/50 rounded-[2rem] p-10 shadow-sm text-foreground">
            <div className="flex items-center gap-4 mb-10">
              <PieChartIcon className="w-6 h-6 text-foreground/70 drop-shadow-sm" />
              <h3 className="text-xl font-black text-foreground">Kategori Dağılımı</h3>
            </div>
            <div className="h-[400px] w-full flex flex-col items-center justify-center relative">
              {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 ? (
                <>
                  <div className="flex-1 w-full relative">
                    <CategoryDistributionChart
                      data={stats.categoryBreakdown}
                      onHover={setHoveredCategory}
                    />

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      {hoveredCategory ? (
                        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-200">
                          <span
                            className="text-[10px] font-black tracking-[0.25em] uppercase mb-1"
                            style={{ color: hoveredCategory.color }}
                          >
                            {hoveredCategory.name}
                          </span>
                          <span className="text-3xl font-black tabular-nums tracking-tighter text-foreground">
                            {formatCurrency(hoveredCategory.value)}
                          </span>
                          <span className="text-[10px] font-black text-muted-foreground/30 mt-1 uppercase tracking-widest">
                            {hoveredCategory.quantity} ADET SATIŞ
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center opacity-20">
                          <PieChartIcon className="w-10 h-10 text-muted-foreground" />
                          <span className="text-[10px] font-black tracking-widest uppercase mt-2">
                            GENEL DAĞILIM
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-full mt-10 flex flex-wrap justify-center gap-x-12 gap-y-6 max-h-[160px] overflow-y-auto custom-scrollbar px-6">
                    {stats.categoryBreakdown.map((c, index) => {
                      const color = getSystemColor(c.categoryName, c.icon, index)
                      return (
                        <div key={index} className="flex items-center gap-4 group cursor-default">
                          <div
                            className="w-4 h-4 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-sm font-black text-foreground/90 group-hover:text-foreground transition-colors uppercase tracking-widest whitespace-nowrap">
                            {c.categoryName}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground/40 italic text-sm">
                  Veri toplanıyor...
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-[2rem] p-10 shadow-sm text-foreground">
            <div className="flex items-center gap-4 mb-10">
              <ShoppingBag className="w-6 h-6 text-foreground/70 drop-shadow-sm" />
              <h3 className="text-xl font-black text-foreground">En Çok Satanlar</h3>
            </div>
            <div className="h-[300px] w-full">
              {productData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <BarChart
                    data={productData}
                    layout="vertical"
                    margin={{ left: -25, right: 50, top: 10, bottom: 10 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 800 }}
                      width={140}
                    />
                    <Tooltip
                      content={<ProductTooltip />}
                      cursor={{ fill: 'var(--color-muted)', opacity: 0.1 }}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="quantity"
                      fill="#8b5cf6"
                      radius={[0, 6, 6, 0]}
                      barSize={24}
                      isAnimationActive={false}
                    >
                      <LabelList
                        dataKey="quantity"
                        position="right"
                        offset={10}
                        style={{
                          fill: 'currentColor',
                          fontSize: 12,
                          fontWeight: 800
                        }}
                        formatter={(val: string | number | boolean | null | undefined) =>
                          `${val ?? 0} Adet`
                        }
                      />
                    </Bar>
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
        <div className="bg-card border border-border/50 rounded-[2rem] p-10 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <Calendar className="w-6 h-6 text-foreground/70 drop-shadow-sm" />
              <div>
                <h3 className="text-xl font-black text-foreground">Aylık Performans</h3>
                <p className="text-sm text-muted-foreground/60 font-medium lowercase first-letter:uppercase">
                  Gelir, gider ve kâr analizi
                </p>
              </div>
            </div>

            {/* Custom Chart Legend - Moved to Top Right */}
            {monthlyReports.length > 0 && (
              <div className="hidden sm:flex items-center gap-6 animate-in fade-in slide-in-from-right-4 duration-1000">
                <div className="flex items-center gap-2 group px-3 py-1.5 hover:bg-muted/5 rounded-xl transition-all">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  <span className="text-[10px] font-black text-muted-foreground/50 group-hover:text-foreground tracking-widest uppercase">
                    CİRO
                  </span>
                </div>
                <div className="flex items-center gap-2 group px-3 py-1.5 hover:bg-muted/5 rounded-xl transition-all">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
                  <span className="text-[10px] font-black text-muted-foreground/50 group-hover:text-foreground tracking-widest uppercase">
                    GİDER
                  </span>
                </div>
                <div className="flex items-center gap-2 group px-3 py-1.5 hover:bg-muted/5 rounded-2xl transition-all">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                  <span className="text-[10px] font-black text-muted-foreground/50 group-hover:text-foreground tracking-widest uppercase">
                    NET KÂR
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="h-[400px] w-full">
            {monthlyReports.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <ComposedChart
                    margin={{ left: 0, right: 30, top: 20, bottom: 20 }}
                    data={[...monthlyReports].reverse().map((r) => ({
                      name: new Date(r.monthDate).toLocaleDateString('tr-TR', {
                        month: 'short',
                        year: '2-digit'
                      }),
                      revenue: r.totalRevenue || 0,
                      expenses: r.totalExpenses || 0,
                      profit: r.netProfit || 0
                    }))}
                  >
                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke="var(--color-border)"
                      opacity={0.15}
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 800 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={85}
                      tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 800 }}
                      tickFormatter={(val) => `${Math.round(val / 100).toLocaleString('tr-TR')} ₺`}
                      textAnchor="end"
                    />
                    <Tooltip content={<MonthlyTooltip />} isAnimationActive={false} />
                    <Bar
                      dataKey="revenue"
                      name="CİRO"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                      barSize={20}
                      isAnimationActive={false}
                      minPointSize={2}
                    />
                    <Bar
                      dataKey="expenses"
                      name="GİDER"
                      fill="#f43f5e"
                      radius={[6, 6, 0, 0]}
                      barSize={20}
                      isAnimationActive={false}
                      minPointSize={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      name="NET KÂR"
                      stroke="#3b82f6"
                      strokeWidth={4}
                      dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 7, strokeWidth: 0, fill: '#3b82f6' }}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </>
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
        <div className="bg-card border border-border/50 rounded-[2rem] p-10 shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <HistoryIcon className="w-6 h-6 text-foreground/70 drop-shadow-sm" />
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
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-border bg-card shadow-2xl rounded-[2.5rem] [&>button]:hidden">
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
                        <span className="font-bold text-sm">KART ÖDEMELERİ</span>
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
