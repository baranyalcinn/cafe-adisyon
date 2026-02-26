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
  iconBg: string
  iconColor: string
  accentColor: string
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
  'relative p-6 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 transition-all duration-500 ' +
  'hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.05)] dark:hover:shadow-[0_20px_50px_rgba(0,_0,_0,_0.3)] ' +
  'hover:border-zinc-300 dark:hover:border-zinc-700 bg-card overflow-hidden group ' +
  'hover:-translate-y-1'

/**
 * Renk / stil token'ları: tek yerden yönet.
 */
const KPI_COLORS = {
  revenue: {
    card: 'border-indigo-500/20 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900',
    iconWrap: 'bg-white/15 backdrop-blur-md border border-white/10 shadow-inner',
    icon: 'text-white',
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
    pendingDot: 'bg-amber-500'
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

// ============================================================================
// Helpers
// ============================================================================

function useStagger(delay: number): { animationDelay: string; animationDuration: string } {
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
  iconBg,
  iconColor,
  accentColor,
  delay,
  badge,
  className
}: KPICardProps) {
  const animationStyle = useStagger(delay)

  return (
    <div className={cn(CARD_BASE_CLASSES, className)} style={animationStyle}>
      {/* Subtle corner glow */}
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm',
              iconBg
            )}
          >
            <Icon
              className={cn(
                'h-5 w-5 transition-transform duration-300 group-hover:scale-110',
                iconColor
              )}
            />
          </div>
          <div className="text-[16px] font-black text-foreground/95 tracking-widest">{label}</div>
        </div>
        {badge && <div className="mt-1.5">{badge}</div>}
      </div>

      <div className="text-[2.25rem] font-black tabular-nums tracking-tight text-foreground leading-none mt-3.5">
        {value}
      </div>

      {/* Bottom accent line */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl opacity-60',
          accentColor
        )}
      />
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
}) {
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

const FinancialCard = React.memo(function FinancialCard({
  metrics,
  delay
}: {
  metrics: FinancialMetrics
  delay: number
}) {
  const { revenue, expenses, profit } = metrics
  const isLoss = profit < 0

  const profitMarginPct = revenue > 0 ? (profit / revenue) * 100 : 0
  const expensePct = revenue > 0 ? Math.min((expenses / revenue) * 100, 100) : 0

  const animationStyle = useStagger(delay)
  const profitTheme = isLoss ? KPI_COLORS.financial.profitLoss : KPI_COLORS.financial.profitOk

  return (
    <div className={cn(CARD_BASE_CLASSES, 'lg:col-span-3')} style={animationStyle}>
      {/* Subtle corner glow */}
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

      {/* Bottom accent line */}
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
      {/* Subtle corner glow */}
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-violet-500/5 blur-2xl pointer-events-none" />

      {/* Bottom accent line */}
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
      className={cn(CARD_BASE_CLASSES, 'lg:col-span-4 min-h-[180px]', KPI_COLORS.revenue.card)}
      style={animationStyle}
    >
      {/* Decorative circles — CSS only, no external requests */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-16 -right-4 w-40 h-40 rounded-full bg-white/[0.04] pointer-events-none" />
      <div className="absolute top-1/2 -left-10 w-32 h-32 rounded-full bg-indigo-400/10 blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full text-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-auto">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg',
                KPI_COLORS.revenue.iconWrap
              )}
            >
              <TrendingUp className={cn('h-5 w-5', KPI_COLORS.revenue.icon)} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span
                className={cn(
                  'text-m font-black tracking-widest text-white',
                  KPI_COLORS.revenue.label
                )}
              >
                Bugünkü Ciro
              </span>
            </div>
          </div>
        </div>

        {/* Value */}
        <div className="mt-6">
          <div
            className={cn(
              'text-6xl lg:text-7xl font-black tabular-nums tracking-tighter leading-none drop-shadow-sm',
              KPI_COLORS.revenue.value
            )}
          >
            {value}
          </div>
        </div>
      </div>
    </div>
  )
})

// ============================================================================
// Badge Components
// ============================================================================

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
      <HeroRevenueCard value={formatCurrency(metrics.revenue)} delay={100} />

      <KPICard
        label="Sipariş"
        value={String(metrics.orders)}
        icon={ShoppingBag}
        iconBg={KPI_COLORS.orders.iconBg}
        iconColor={KPI_COLORS.orders.icon}
        accentColor={KPI_COLORS.orders.accent}
        delay={150}
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
