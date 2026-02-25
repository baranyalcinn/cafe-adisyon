'use client'

import { cn, formatCurrency } from '@/lib/utils'
import {
  Activity,
  ArrowDownRight,
  Banknote,
  CreditCard,
  type LucideIcon,
  PieChart,
  ShoppingBag,
  TrendingUp,
  Wallet
} from 'lucide-react'
import React, { useMemo } from 'react'
import { useDashboardContext } from '../context/DashboardContext'

// ============================================================================
// Types
// ============================================================================

interface KPICardProps {
  label: string
  value: string
  icon: LucideIcon
  color: string
  delay: number
  badge?: React.ReactNode
  className?: string
}

interface FinancialMetrics {
  revenue: number
  expenses: number
  profit: number
}

interface PaymentMetrics {
  cash: number
  card: number
}

// ============================================================================
// Constants (Module level - never recreates)
// ============================================================================

const ANIMATION_DURATION = 500

const CARD_BASE_CLASSES =
  'animate-in fade-in slide-in-from-bottom-3 fill-mode-both group rounded-2xl border border-border/50 bg-card p-5 shadow-sm transition-all ' +
  'hover:shadow-md hover:-translate-y-[1px] hover:border-border/80 ' +
  'focus-within:ring-2 focus-within:ring-primary/20'

const BADGE_BASE_CLASSES =
  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium'

/**
 * Renk / stil token'ları: tek yerden yönet.
 * (Hardcode hex ve dağınık tailwind classlarını toparlar)
 */
const KPI_COLORS = {
  revenue: {
    card: 'border-slate-500/20 bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black shadow-slate-200/20 dark:shadow-none',
    iconWrap: 'bg-white/10 backdrop-blur-md border border-white/5',
    icon: 'text-white',
    value: 'text-white drop-shadow-md',
    label: 'text-slate-100/80',
    subLabel: 'text-slate-100/60',
    badge: 'bg-white/10 text-white shadow-sm border border-white/15 backdrop-blur-md',
    dot: 'bg-emerald-400',
    stroke: 'transparent'
  },
  orders: {
    icon: 'text-blue-600',
    badgePending: 'bg-amber-500/10 text-amber-600',
    pendingDot: 'bg-amber-500'
  },
  financial: {
    headerIcon: 'text-primary',
    tag: 'bg-muted text-muted-foreground',
    profitOk: {
      text: 'text-emerald-600',
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
      text: 'text-destructive',
      border: 'border-destructive/20',
      bg: 'bg-destructive/5 hover:bg-destructive/10',
      bar: 'bg-destructive/70'
    }
  },
  payment: {
    headerIcon: 'text-primary',
    tag: 'bg-muted text-muted-foreground',
    cash: {
      label: 'text-emerald-600',
      bar: 'bg-emerald-500',
      rowText: 'text-emerald-600',
      rowBorder: 'border-emerald-500/20',
      rowBg: 'bg-emerald-500/5 hover:bg-emerald-500/10'
    },
    card: {
      label: 'text-blue-600',
      bar: 'bg-blue-500',
      rowText: 'text-blue-600',
      rowBorder: 'border-blue-500/20',
      rowBg: 'bg-blue-500/5 hover:bg-blue-500/10'
    }
  }
} as const

// ============================================================================
// Helpers
// ============================================================================

function useStagger(delay: number) {
  return useMemo(
    () => ({
      animationDelay: `${delay}ms`,
      animationDuration: `${ANIMATION_DURATION}ms`
    }),
    [delay]
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

const KPICard = React.memo(function KPICard({
  label,
  value,
  icon: Icon,
  color,
  delay,
  badge,
  className
}: KPICardProps) {
  const animationStyle = useStagger(delay)

  return (
    <div className={cn(CARD_BASE_CLASSES, className)} style={animationStyle}>
      <div className="flex items-center justify-between mb-3">
        <Icon
          className={cn('h-6 w-6 transition-transform duration-300 group-hover:scale-110', color)}
        />
        {badge}
      </div>
      <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-xs font-medium text-muted-foreground tracking-wider">{label}</div>
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
}) {
  const leftPct = Math.min(Math.max(left, 0), 100)
  const rightPct = Math.min(Math.max(right, 0), 100 - leftPct)

  const leftStyle = useMemo(() => ({ width: `${leftPct}%` }), [leftPct])
  const rightStyle = useMemo(() => ({ width: `${rightPct}%` }), [rightPct])

  return (
    <div className="h-2 w-full flex rounded-full overflow-hidden bg-muted/30">
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
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl border p-4 transition-colors',
        borderColor,
        bgClass
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn('h-5 w-5', colorClass)} />
        <span className={cn('text-sm font-medium opacity-70', colorClass)}>{label}</span>
      </div>
      <span className="text-lg font-bold tabular-nums text-foreground">{value}</span>
    </div>
  )
})

const FinancialCard = React.memo(function FinancialCard({
  metrics,
  delay
}: {
  metrics: FinancialMetrics
  delay: number
}) {
  const { revenue, expenses, profit } = metrics
  const isLoss = profit < 0

  // Marjlar (UX: daha anlaşılır)
  const profitMarginPct = revenue > 0 ? (profit / revenue) * 100 : 0
  const expensePct = revenue > 0 ? Math.min((expenses / revenue) * 100, 100) : 0

  const animationStyle = useStagger(delay)

  const profitTheme = isLoss ? KPI_COLORS.financial.profitLoss : KPI_COLORS.financial.profitOk

  return (
    <div className={cn(CARD_BASE_CLASSES, 'lg:col-span-3')} style={animationStyle}>
      <div className="flex items-center justify-between mb-4">
        <Activity className={cn('h-6 w-6', KPI_COLORS.financial.headerIcon)} />
        <span
          className={cn('rounded-full px-3 py-1 text-xs font-medium', KPI_COLORS.financial.tag)}
        >
          Finansal Durum
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className={profitTheme.text}>
              Net {isLoss ? 'Zarar' : 'Kâr'} %{profitMarginPct.toFixed(1)}
            </span>
            <span className={cn(KPI_COLORS.financial.expense.text, '/80')}>
              Gider %{expensePct.toFixed(1)}
            </span>
          </div>

          {/* UX: bar'ı gider oranı gibi okumak daha kolay; sağ tarafı boş bırakıyoruz */}
          <ProgressBar
            left={expensePct}
            right={0}
            leftColor={KPI_COLORS.financial.expense.bar}
            rightColor="bg-transparent"
          />
        </div>

        <div className="flex flex-col gap-3">
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

const PaymentCard = React.memo(function PaymentCard({
  metrics,
  delay
}: {
  metrics: PaymentMetrics
  delay: number
}) {
  const { cash, card } = metrics
  const total = cash + card

  const cashPct = total > 0 ? (cash / total) * 100 : 0
  const cardPct = total > 0 ? (card / total) * 100 : 0

  const animationStyle = useStagger(delay)

  return (
    <div className={cn(CARD_BASE_CLASSES, 'lg:col-span-3')} style={animationStyle}>
      <div className="flex items-center justify-between mb-4">
        <PieChart className={cn('h-6 w-6', KPI_COLORS.payment.headerIcon)} />
        <span className={cn('rounded-full px-3 py-1 text-xs font-medium', KPI_COLORS.payment.tag)}>
          Tahsilat Dağılımı
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className={KPI_COLORS.payment.cash.label}>Nakit %{cashPct.toFixed(1)}</span>
            <span className={KPI_COLORS.payment.card.label}>Kart %{cardPct.toFixed(1)}</span>
          </div>
          <ProgressBar
            left={cashPct}
            right={cardPct}
            leftColor={KPI_COLORS.payment.cash.bar}
            rightColor={KPI_COLORS.payment.card.bar}
          />
        </div>

        <div className="flex flex-col gap-3">
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

const HeroRevenueCard = React.memo(function HeroRevenueCard({
  value,
  delay
}: {
  value: string
  delay: number
}) {
  const animationStyle = useStagger(delay)

  return (
    <div
      className={cn(
        CARD_BASE_CLASSES,
        'lg:col-span-4 relative overflow-hidden',
        KPI_COLORS.revenue.card
      )}
      style={animationStyle}
    >
      <div className="relative z-10 flex flex-col h-full text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-2xl flex items-center justify-center',
                KPI_COLORS.revenue.iconWrap
              )}
            >
              <TrendingUp className={cn('h-6 w-6', KPI_COLORS.revenue.icon)} />
            </div>
            <div className="flex flex-col">
              <span
                className={cn(
                  'text-xs font-bold uppercase tracking-widest mt-1',
                  KPI_COLORS.revenue.label
                )}
              >
                Bugünkü Ciro
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-end pb-4">
          <div
            className={cn(
              'text-5xl lg:text-7xl font-black tabular-nums tracking-tighter drop-shadow-md',
              KPI_COLORS.revenue.value
            )}
          >
            {value}
          </div>
          <p
            className={cn(
              'text-sm font-bold mt-2 uppercase tracking-tight',
              KPI_COLORS.revenue.subLabel
            )}
          >
            Anlık Satış Performansı
          </p>
        </div>
      </div>

      {/* Subtle Texture/Grain Overlay for Premium Feel */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
    </div>
  )
})

// ============================================================================
// Badge Components
// ============================================================================

const PendingBadge = React.memo(function PendingBadge({ count }: { count: number }) {
  return (
    <span className={cn(BADGE_BASE_CLASSES, KPI_COLORS.orders.badgePending)}>
      <span
        className={cn('h-1.5 w-1.5 rounded-full animate-pulse', KPI_COLORS.orders.pendingDot)}
      />
      {count} AÇIK
    </span>
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

  const pendingBadge = useMemo(
    () => (metrics.pending > 0 ? <PendingBadge count={metrics.pending} /> : undefined),
    [metrics.pending]
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      <HeroRevenueCard value={formatCurrency(metrics.revenue)} delay={100} />

      <KPICard
        label="Siparişler"
        value={String(metrics.orders)}
        icon={ShoppingBag}
        color={KPI_COLORS.orders.icon}
        delay={150}
        badge={pendingBadge}
        className="lg:col-span-2"
      />

      <FinancialCard
        metrics={{ revenue: metrics.revenue, expenses: metrics.expenses, profit: metrics.profit }}
        delay={200}
      />

      <PaymentCard metrics={{ cash: metrics.cash, card: metrics.card }} delay={250} />
    </div>
  )
}
