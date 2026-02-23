import { cn, formatCurrency } from '@/lib/utils'
import { parseISO } from 'date-fns'
import {
  Banknote,
  BarChart3,
  CreditCard,
  PieChart as PieChartIcon,
  ShoppingBag,
  TrendingUp
} from 'lucide-react'
import React, { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
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

/* --- TOOLTIPS --- */

function RevenueTooltip({
  active,
  label,
  payload
}: {
  active?: boolean
  label?: string
  payload?: Array<{ value: number | string }>
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

function ProductTooltip({
  active,
  payload
}: {
  active?: boolean
  payload?: Array<{
    value: number | string
    payload: { name: string; quantity: number; fullName?: string }
  }>
}): React.JSX.Element | null {
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

/* --- COLORS --- */
const CATEGORY_COLOR_MAP: Record<string, string> = {
  coffee: '#d97706',
  'ice-cream-cone': '#22d3ee',
  cookie: '#eab308',
  wine: '#38bdf8',
  cake: '#f472b6',
  sandwich: '#fb923c',
  utensils: '#10b981'
}

const getSystemColor = (name?: string, icon?: string, index: number = 0): string => {
  const lowerName = name?.toLowerCase() || ''
  if (lowerName.includes('soğuk')) return '#0055b3'
  if (lowerName.includes('sıcak') || lowerName.includes('kahve') || lowerName.includes('çay'))
    return '#8a4b08'
  if (lowerName.includes('tatlı') || lowerName.includes('pasta') || lowerName.includes('yemek'))
    return '#be185d'
  if (lowerName.includes('içecek')) return '#15803d'

  if (icon && CATEGORY_COLOR_MAP[icon]) return CATEGORY_COLOR_MAP[icon]

  const defaultColors = [
    '#0055b3',
    '#be185d',
    '#15803d',
    '#b45309',
    '#6b21a8',
    '#0e7490',
    '#a16207'
  ]
  return defaultColors[index % defaultColors.length]
}

/* --- CHARTS --- */

export function WeeklyTrendChart(): React.JSX.Element {
  const { revenueTrend } = useDashboardContext()

  return (
    <ChartContainer delayUrl="delay-[400ms]">
      <div className="bg-card border border-border/50 rounded-[2rem] p-8 shadow-sm transition-[border-color,transform] duration-300 hover:border-primary/20 text-foreground">
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
            <ResponsiveContainer width="100%" height="100%" debounce={1} minWidth={0}>
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
                  width={80}
                  tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 800 }}
                  tickFormatter={(val) => `${(val / 100).toLocaleString('tr-TR')} ₺`}
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
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <TrendingUp className="w-10 h-10 text-muted-foreground/30 animate-pulse" />
              <p className="text-muted-foreground/40 italic font-medium tracking-wide">
                Haftalık veri analizi bekleniyor...
              </p>
            </div>
          )}
        </div>
      </div>
    </ChartContainer>
  )
}

export function HourlyActivityChart(): React.JSX.Element {
  const { stats } = useDashboardContext()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <ChartContainer delayUrl="delay-[500ms]">
          <div className="bg-card border border-border/50 rounded-[2rem] p-8 shadow-sm text-foreground h-full">
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
                <ResponsiveContainer width="100%" height="100%" debounce={1} minWidth={0}>
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
                      width={80}
                      tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 800 }}
                      tickFormatter={(value) => `${(value / 100).toLocaleString('tr-TR')} ₺`}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--color-muted)', opacity: 0.1 }}
                      isAnimationActive={false}
                      content={({
                        active,
                        payload
                      }: {
                        active?: boolean
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        payload?: any
                      }) => {
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
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <BarChart3 className="w-10 h-10 text-muted-foreground/30 animate-pulse" />
                  <p className="text-muted-foreground/40 italic font-medium tracking-wide">
                    Henüz saatlik işlem yoğunluğu oluşmadı.
                  </p>
                </div>
              )}
            </div>
          </div>
        </ChartContainer>
      </div>

      <ChartContainer delayUrl="delay-[600ms]">
        <div className="bg-card border border-border/50 rounded-[2rem] p-8 shadow-sm flex flex-col justify-center space-y-12 transition-[border-color,transform] duration-300 hover:border-foreground/5 text-foreground h-full">
          <div className="flex items-center gap-5 group">
            <div className="transition-transform duration-500 group-hover:scale-110 origin-left translate-y-2">
              <Banknote className="w-10 h-10 text-success drop-shadow-sm" />
            </div>
            <div className="flex flex-col items-start gap-1">
              <span className="text-[10px] font-black text-muted-foreground/40 tracking-[0.25em] uppercase leading-none">
                NAKİT TAHSİLAT
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
              <span className="text-[10px] font-black text-muted-foreground/40 tracking-[0.25em] uppercase leading-none">
                KART TAHSİLAT
              </span>
              <p className="text-4xl font-black text-foreground tabular-nums tracking-tighter leading-tight">
                {formatCurrency(stats?.paymentMethodBreakdown?.card || 0)}
              </p>
            </div>
          </div>
        </div>
      </ChartContainer>
    </div>
  )
}

export function CategoryPieChart(): React.JSX.Element {
  const { stats } = useDashboardContext()
  const [hoveredCategory, setHoveredCategory] = useState<{
    name: string
    value: number
    quantity: number
    color: string
  } | null>(null)

  const pieData = React.useMemo(() => {
    if (!stats?.categoryBreakdown) return []
    const totalRev = stats.categoryBreakdown.reduce((s, z) => s + z.revenue, 0)
    return stats.categoryBreakdown.map((c, index) => ({
      name: c.categoryName,
      value: totalRev > 0 ? c.revenue : Math.max(c.quantity, 0.1),
      quantity: c.quantity,
      color: getSystemColor(c.categoryName, c.icon, index),
      icon: c.icon
    }))
  }, [stats?.categoryBreakdown])

  return (
    <ChartContainer delayUrl="delay-[700ms]">
      <div className="bg-card border border-border/50 rounded-[2rem] p-8 shadow-sm text-foreground h-full flex flex-col">
        <div className="flex items-center gap-4 mb-6">
          <PieChartIcon className="w-6 h-6 text-foreground/70 drop-shadow-sm" />
          <h3 className="text-xl font-black text-foreground">Kategori Dağılımı</h3>
        </div>
        <div className="flex-1 w-full flex flex-col items-center justify-center relative min-h-[320px]">
          {pieData.length > 0 ? (
            <>
              <div className="w-full h-full min-h-[240px] relative">
                <ResponsiveContainer width="100%" height="100%" debounce={50} minWidth={0}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius="70%"
                      outerRadius="100%"
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      isAnimationActive={false}
                      onMouseEnter={(_, index) => {
                        const c = pieData[index]
                        if (c) {
                          setHoveredCategory({
                            name: c.name,
                            value: stats!.categoryBreakdown[index].revenue,
                            quantity: c.quantity,
                            color: c.color
                          })
                        }
                      }}
                      onMouseLeave={() => setHoveredCategory(null)}
                    >
                      {pieData.map((c, index) => (
                        <Cell key={index} fill={c.color} className="focus:outline-none" />
                      ))}
                    </Pie>
                    <Tooltip content={<div className="hidden" />} isAnimationActive={false} />
                  </PieChart>
                </ResponsiveContainer>

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

              <div className="w-full mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 px-2">
                {pieData.map((c, index) => {
                  return (
                    <div key={index} className="flex items-center gap-2 group cursor-default">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-[11px] font-black text-foreground/80 group-hover:text-foreground transition-colors uppercase tracking-wider whitespace-nowrap">
                        {c.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <PieChartIcon className="w-10 h-10 text-muted-foreground/30 animate-pulse" />
              <p className="text-muted-foreground/40 italic font-medium tracking-wide">
                Yeterli kategori satışı bulunamadı.
              </p>
            </div>
          )}
        </div>
      </div>
    </ChartContainer>
  )
}

export function TopProductsChart(): React.JSX.Element {
  const { stats } = useDashboardContext()

  const productData = React.useMemo(() => {
    if (!stats?.topProducts) return []
    return stats.topProducts.map((p) => ({
      name: p.productName.length > 15 ? p.productName.slice(0, 15) + '...' : p.productName,
      fullName: p.productName,
      quantity: p.quantity
    }))
  }, [stats?.topProducts])

  return (
    <ChartContainer delayUrl="delay-[800ms]">
      <div className="bg-card border border-border/50 rounded-[2rem] p-8 shadow-sm text-foreground h-full flex flex-col">
        <div className="flex items-center gap-4 mb-6">
          <ShoppingBag className="w-6 h-6 text-foreground/70 drop-shadow-sm" />
          <h3 className="text-xl font-black text-foreground">En Çok Satanlar</h3>
        </div>
        <div className="flex-1 w-full min-h-[320px]">
          {productData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" debounce={50} minWidth={0}>
              <BarChart
                data={productData}
                layout="vertical"
                margin={{ left: -25, right: 50, top: 10, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="productGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="var(--color-border)"
                  opacity={0.3}
                />
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
                  fill="url(#productGradient)"
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
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <ShoppingBag className="w-10 h-10 text-muted-foreground/30 animate-pulse" />
              <p className="text-muted-foreground/40 italic font-medium tracking-wide">
                Henüz satılan ürün bulunmamakta.
              </p>
            </div>
          )}
        </div>
      </div>
    </ChartContainer>
  )
}
