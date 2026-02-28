'use client'

import { cn, formatCurrency } from '@/lib/utils'
import {
  Activity,
  ArrowDownRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  type LucideIcon,
  PieChart,
  Receipt,
  TrendingUp,
  Wallet
} from 'lucide-react'
import React, { useMemo } from 'react'
import { useDashboardContext } from '../context/DashboardContext'

// ============================================================================
// Constants & Pure Helpers (Module level - never recreates)
// ============================================================================

const ANIMATION_DURATION = 500

const CARD_BASE_CLASSES =
  'relative p-6 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 transition-all duration-500 ' +
  'hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.05)] dark:hover:shadow-[0_20px_50px_rgba(0,_0,_0,_0.3)] ' +
  'hover:border-zinc-300 dark:hover:border-zinc-700 bg-card overflow-hidden group ' +
  'hover:-translate-y-1'

const KPI_COLORS = {
  revenue: {
    card: 'border-white/10 bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900',
    iconWrap: 'bg-white/10 backdrop-blur-md border border-white/10 shadow-inner',
    icon: 'text-zinc-100',
    value: 'text-white',
    label: 'text-white font-bold',
    subLabel: 'text-zinc-100 font-bold',
    badge: 'bg-white/20 text-white border border-white/30',
    liveDot: 'bg-emerald-400',
    liveText: 'text-white'
  },
  orders: {
    iconBg: 'bg-blue-500/10',
    icon: 'text-blue-600 dark:text-blue-400',
    accent: 'bg-blue-500',
    badgePending: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
    pendingDot: 'bg-amber-500',
    completed: {
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/5 hover:bg-emerald-500/10'
    },
    aov: {
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-500/20',
      bg: 'bg-blue-500/5 hover:bg-blue-500/10'
    }
  },
  financial: {
    iconBg: 'bg-primary/10',
    icon: 'text-primary',
    accent: 'bg-primary',
    tag: 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100',
    profitOk: {
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/5 hover:bg-emerald-500/10',
      bar: 'bg-emerald-500'
    },
    profitLoss: {
      text: 'text-destructive',
      border: 'border-destructive/20',
      bg: 'bg-destructive/5 hover:bg-destructive/10',
      bar: 'bg-destructive'
    },
    expense: {
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-500/20',
      bg: 'bg-rose-500/5 hover:bg-rose-500/10',
      bar: 'bg-rose-500/70'
    }
  },
  payment: {
    iconBg: 'bg-violet-500/10',
    icon: 'text-violet-600 dark:text-violet-400',
    accent: 'bg-violet-500',
    tag: 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100',
    cash: {
      label: 'text-emerald-600 dark:text-emerald-400',
      bar: 'bg-emerald-500',
      rowText: 'text-emerald-600 dark:text-emerald-400',
      rowBorder: 'border-emerald-500/20',
      rowBg: 'bg-emerald-500/5 hover:bg-emerald-500/10',
      pct: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
    },
    card: {
      label: 'text-blue-600 dark:text-blue-400',
      bar: 'bg-blue-500',
      rowText: 'text-blue-600 dark:text-blue-400',
      rowBorder: 'border-blue-500/20',
      rowBg: 'bg-blue-500/5 hover:bg-blue-500/10',
      pct: 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
    }
  }
} as const

// Saf fonksiyon: Hook olmaktan çıkarıldı, gereksiz render döngüsü kaldırıldı
const getStaggerStyle = (delay: number): React.CSSProperties => ({
  animationDelay: `${delay}ms`,
  animationDuration: `${ANIMATION_DURATION}ms`
})

// ============================================================================
// Sub-Components
// ============================================================================

// KRİTİK OPTİMİZASYON: Obje yerine sadece primitif proplar (number) alarak React.memo'nun %100 çalışmasını sağlar
interface DailyOverviewProps {
  total: number
  pending: number
  revenue: number
  delay: number
}

const DailyOverviewCard = React.memo(function DailyOverviewCard({
  total,
  pending,
  revenue,
  delay
}: DailyOverviewProps): React.JSX.Element {
  const completed = Math.max(0, total - pending)
  const aov = total > 0 ? revenue / total : 0

  const animationStyle = useMemo(() => getStaggerStyle(delay), [delay])

  return (
    <div
      className={cn(CARD_BASE_CLASSES, 'lg:col-span-6 flex flex-col p-5', KPI_COLORS.revenue.card)}
      style={animationStyle}
    >
      <div className="relative z-10 flex flex-col lg:grid lg:grid-cols-12 gap-x-8 h-full">
        {/* Left Column: Header + Revenue */}
        <div className="lg:col-span-7 flex flex-col pt-1 h-full">
          {/* Header Row */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105',
                KPI_COLORS.revenue.iconWrap
              )}
            >
              <TrendingUp className={cn('h-5 w-5', KPI_COLORS.revenue.icon)} />
            </div>
            <div className={cn('text-[16px] font-black tracking-widest', KPI_COLORS.revenue.label)}>
              Bugünün Özeti
            </div>
          </div>

          {/* Revenue Section */}
          <div className="flex flex-col flex-1 justify-center">
            <div
              className={cn(
                'text-6xl lg:text-[5rem] font-black tabular-nums tracking-tight leading-none',
                KPI_COLORS.revenue.value
              )}
            >
              {formatCurrency(revenue).replace(',00', '')}
            </div>
          </div>
        </div>

        {/* Right Column: Sub-metrics Stack */}
        <div className="lg:col-span-5 flex flex-col gap-2.5 mt-2 lg:mt-0">
          {/* Total Orders */}
          <div className="flex items-center justify-between rounded-xl border px-3.5 py-2.5 bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Activity className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white/90">Toplam Sipariş</span>
                {pending > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-tight text-rose-400">
                    <span className="w-1 h-1 rounded-full bg-rose-400" />
                    {pending} Açık Masa
                  </div>
                )}
              </div>
            </div>
            <span className="text-2xl font-black tabular-nums text-white">{total}</span>
          </div>

          {/* AOV */}
          <div className="flex items-center justify-between rounded-xl border px-3.5 py-2.5 bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Receipt className="h-4 w-4 text-indigo-400" />
              </div>
              <span className="text-sm font-bold text-white/90">Sepet Ortalaması</span>
            </div>
            <span className="text-xl font-black tabular-nums text-white">
              {formatCurrency(aov).replace(',00', '')}
            </span>
          </div>

          {/* Completed Orders */}
          <div className="flex items-center justify-between rounded-xl border px-3.5 py-2.5 bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-sm font-bold text-white/90">Tamamlanan Sipariş</span>
            </div>
            <span className="text-xl font-black tabular-nums text-white">{completed}</span>
          </div>
        </div>
      </div>
    </div>
  )
})

const ProgressBar = React.memo(function ProgressBar({
  left,
  right,
  leftColor,
  rightColor
}: {
  left: number
  right: number
  leftColor: string
  rightColor: string
}): React.JSX.Element {
  const leftPct = Math.min(Math.max(left, 0), 100)
  const rightPct = Math.min(Math.max(right, 0), 100 - leftPct)

  const leftStyle = useMemo(() => ({ width: `${leftPct}%` }), [leftPct])
  const rightStyle = useMemo(() => ({ width: `${rightPct}%` }), [rightPct])

  return (
    <div className="h-1.5 w-full flex rounded-full overflow-hidden bg-muted/40">
      <div className={cn('transition-all duration-700 ease-out', leftColor)} style={leftStyle} />
      <div className={cn('transition-all duration-700 ease-out', rightColor)} style={rightStyle} />
    </div>
  )
})

const MetricRow = React.memo(function MetricRow({
  icon: Icon,
  label,
  value,
  colorClass,
  borderColor,
  bgClass
}: {
  icon: LucideIcon
  label: string
  value: string
  colorClass: string
  borderColor: string
  bgClass: string
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl border px-4 py-3 transition-colors',
        borderColor,
        bgClass
      )}
    >
      <div className="flex items-center gap-2.5">
        <Icon className={cn('h-4 w-4 flex-shrink-0', colorClass)} />
        <span className={cn('text-sm font-semibold', colorClass)}>{label}</span>
      </div>
      <span className="text-lg font-black tabular-nums text-foreground">{value}</span>
    </div>
  )
})

interface FinancialCardProps {
  revenue: number
  expenses: number
  profit: number
  delay: number
}

const FinancialCard = React.memo(function FinancialCard({
  revenue,
  expenses,
  profit,
  delay
}: FinancialCardProps): React.JSX.Element {
  const isLoss = profit < 0
  const profitMarginPct = revenue > 0 ? (profit / revenue) * 100 : 0
  const expensePct = revenue > 0 ? Math.min((expenses / revenue) * 100, 100) : 0

  const animationStyle = useMemo(() => getStaggerStyle(delay), [delay])
  const profitTheme = isLoss ? KPI_COLORS.financial.profitLoss : KPI_COLORS.financial.profitOk

  return (
    <div className={cn(CARD_BASE_CLASSES, 'lg:col-span-3')} style={animationStyle}>
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl opacity-60',
          KPI_COLORS.financial.accent
        )}
      />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center',
              KPI_COLORS.financial.iconBg
            )}
          >
            <Activity className={cn('h-4 w-4', KPI_COLORS.financial.icon)} />
          </div>
          <span className="text-base font-black text-foreground tracking-tight">
            Finansal Durum
          </span>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider',
            KPI_COLORS.financial.tag
          )}
        >
          Bugün
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className={profitTheme.text}>
              {isLoss ? 'Zarar' : 'Kâr'} %{Math.abs(profitMarginPct).toFixed(1)}
            </span>
            <span className={cn(KPI_COLORS.financial.expense.text, 'opacity-80')}>
              Gider %{expensePct.toFixed(1)}
            </span>
          </div>
          <ProgressBar
            left={expensePct}
            right={0}
            leftColor={KPI_COLORS.financial.expense.bar}
            rightColor="bg-transparent"
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <MetricRow
            icon={Wallet}
            label={`Net ${isLoss ? 'Zarar' : 'Kâr'}`}
            value={formatCurrency(profit)}
            colorClass={profitTheme.text}
            borderColor={profitTheme.border}
            bgClass={profitTheme.bg}
          />
          <MetricRow
            icon={ArrowDownRight}
            label="Günlük Gider"
            value={formatCurrency(expenses)}
            colorClass={KPI_COLORS.financial.expense.text}
            borderColor={KPI_COLORS.financial.expense.border}
            bgClass={KPI_COLORS.financial.expense.bg}
          />
        </div>
      </div>
    </div>
  )
})

interface PaymentCardProps {
  cash: number
  card: number
  delay: number
}

const PaymentCard = React.memo(function PaymentCard({
  cash,
  card,
  delay
}: PaymentCardProps): React.JSX.Element {
  const total = cash + card
  const cashPct = total > 0 ? (cash / total) * 100 : 0
  const cardPct = total > 0 ? (card / total) * 100 : 0

  const animationStyle = useMemo(() => getStaggerStyle(delay), [delay])

  return (
    <div className={cn(CARD_BASE_CLASSES, 'lg:col-span-3')} style={animationStyle}>
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl opacity-60',
          KPI_COLORS.payment.accent
        )}
      />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center',
              KPI_COLORS.payment.iconBg
            )}
          >
            <PieChart className={cn('h-4 w-4', KPI_COLORS.payment.icon)} />
          </div>
          <span className="text-base font-black text-foreground tracking-tight">Tahsilat</span>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider',
            KPI_COLORS.payment.tag
          )}
        >
          Dağılım
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'text-xs font-black uppercase tracking-wider',
                  KPI_COLORS.payment.cash.label
                )}
              >
                Nakit
              </span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-black',
                  KPI_COLORS.payment.cash.pct
                )}
              >
                %{cashPct.toFixed(0)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-black',
                  KPI_COLORS.payment.card.pct
                )}
              >
                %{cardPct.toFixed(0)}
              </span>
              <span
                className={cn(
                  'text-xs font-black uppercase tracking-wider',
                  KPI_COLORS.payment.card.label
                )}
              >
                Kart
              </span>
            </div>
          </div>
          <ProgressBar
            left={cashPct}
            right={cardPct}
            leftColor={KPI_COLORS.payment.cash.bar}
            rightColor={KPI_COLORS.payment.card.bar}
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <MetricRow
            icon={Banknote}
            label="Nakit"
            value={formatCurrency(cash)}
            colorClass={KPI_COLORS.payment.cash.rowText}
            borderColor={KPI_COLORS.payment.cash.rowBorder}
            bgClass={KPI_COLORS.payment.cash.rowBg}
          />
          <MetricRow
            icon={CreditCard}
            label="Kart"
            value={formatCurrency(card)}
            colorClass={KPI_COLORS.payment.card.rowText}
            borderColor={KPI_COLORS.payment.card.rowBorder}
            bgClass={KPI_COLORS.payment.card.rowBg}
          />
        </div>
      </div>
    </div>
  )
})

// ============================================================================
// Main Component
// ============================================================================

export function KPICards(): React.JSX.Element {
  const { stats } = useDashboardContext()

  const metrics = useMemo(() => {
    const revenue = stats?.dailyRevenue || 0
    const expenses = stats?.dailyExpenses || 0
    return {
      revenue,
      expenses,
      profit: revenue - expenses,
      orders: stats?.totalOrders || 0,
      pending: stats?.pendingOrders || 0,
      cash: stats?.paymentMethodBreakdown?.cash || 0,
      card: stats?.paymentMethodBreakdown?.card || 0
    }
  }, [stats])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
      {/* KRİTİK DEĞİŞİKLİK: Primitif proplar (sayılar) tek tek geçirildi. */}
      <DailyOverviewCard
        total={metrics.orders}
        pending={metrics.pending}
        revenue={metrics.revenue}
        delay={100}
      />

      <FinancialCard
        revenue={metrics.revenue}
        expenses={metrics.expenses}
        profit={metrics.profit}
        delay={200}
      />

      <PaymentCard cash={metrics.cash} card={metrics.card} delay={250} />
    </div>
  )
}
