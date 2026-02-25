'use client'

import { cn, formatCurrency } from '@/lib/utils'
import {
  ArrowDownRight,
  Banknote,
  CreditCard,
  LucideIcon,
  ShoppingBag,
  TrendingUp,
  Wallet
} from 'lucide-react'
import React, { useMemo } from 'react'
import { useDashboardContext } from '../context/DashboardContext'

// ============================================================================
// Styles (Centralized for clean JSX)
// ============================================================================

const STYLES = {
  grid: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5',
  cardBase:
    'animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both bg-card border border-border/50 rounded-2xl px-5 py-4 shadow-sm group transition-all hover:shadow-md',
  iconHeader: 'flex items-center justify-between mb-3',
  icon: 'w-6 h-6 drop-shadow-sm transition-transform duration-500 group-hover:scale-110',
  value: 'text-3xl font-black tabular-nums tracking-tighter leading-tight',
  label: 'text-[11px] font-black text-muted-foreground/50 tracking-[0.2em] uppercase',
  badgeBase: 'flex items-center gap-1.5 border px-2 py-0.5 rounded-full',
  badgeText: 'text-[8px] font-black tracking-[0.2em]'
} as const

// ============================================================================
// Sub-Components (Memoized for Performance)
// ============================================================================

interface KPICardProps {
  label: string
  value: string
  icon: LucideIcon
  color: string
  hoverBorder: string
  valueColor?: string
  badge?: React.ReactNode
  delay: number
}

const KPICard = ({
  label,
  value,
  icon: Icon,
  color,
  hoverBorder,
  valueColor,
  badge,
  delay,
  className
}: KPICardProps & { className?: string }): React.JSX.Element => (
  <div
    className={cn(STYLES.cardBase, hoverBorder, className)}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className={STYLES.iconHeader}>
      <Icon className={cn(STYLES.icon, color)} />
      {badge}
    </div>
    <div className={cn(STYLES.value, valueColor || 'text-foreground')}>{value}</div>
    <span className={STYLES.label}>{label}</span>
  </div>
)

const PaymentBreakdownCard = ({
  cash,
  card,
  delay
}: {
  cash: number
  card: number
  delay: number
}): React.JSX.Element => (
  <div
    className={cn(
      STYLES.cardBase,
      'row-span-2 flex flex-col justify-between hover:border-primary/20'
    )}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div>
      <div className={STYLES.iconHeader}>
        <div className="flex -space-x-2">
          <Banknote className="w-6 h-6 text-emerald-500 drop-shadow-sm" />
          <CreditCard className="w-6 h-6 text-blue-500 drop-shadow-sm" />
        </div>
        <div className={cn(STYLES.badgeBase, 'bg-zinc-100 dark:bg-zinc-800 border-transparent')}>
          <span className={STYLES.badgeText}>ÖDEMELER</span>
        </div>
      </div>
      <div className="space-y-6 mt-4">
        <div className="group/item">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase">
              NAKİT
            </span>
            <span className="text-lg font-black tabular-nums text-emerald-500">
              {formatCurrency(cash)}
            </span>
          </div>
          <div className="h-1.5 w-full bg-emerald-500/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-1000"
              style={{ width: cash + card > 0 ? `${(cash / (cash + card)) * 100}%` : '50%' }}
            />
          </div>
        </div>

        <div className="group/item">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase">
              KART
            </span>
            <span className="text-lg font-black tabular-nums text-blue-500">
              {formatCurrency(card)}
            </span>
          </div>
          <div className="h-1.5 w-full bg-blue-500/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-1000"
              style={{ width: cash + card > 0 ? `${(card / (cash + card)) * 100}%` : '50%' }}
            />
          </div>
        </div>
      </div>
    </div>

    <div className="pt-4 border-t border-border/50">
      <div className="flex items-center justify-between">
        <span className={STYLES.label}>TOPLAM TAHSİLAT</span>
        <span className="text-sm font-black text-foreground">{formatCurrency(cash + card)}</span>
      </div>
    </div>
  </div>
)

// ============================================================================
// Main Component
// ============================================================================

export function KPICards(): React.JSX.Element {
  const { stats } = useDashboardContext()
  const metrics = useMemo(() => {
    const dailyRevenue = stats?.dailyRevenue || 0
    const totalOrders = stats?.totalOrders || 0
    const dailyExpenses = stats?.dailyExpenses || 0
    const netProfit = dailyRevenue - dailyExpenses

    return { dailyRevenue, totalOrders, dailyExpenses, netProfit }
  }, [stats])

  const ciro = {
    label: 'BUGÜNKÜ CİRO',
    value: formatCurrency(metrics.dailyRevenue),
    icon: TrendingUp,
    color: 'text-primary',
    hoverBorder: 'hover:border-primary/30',
    badge: (
      <div className={cn(STYLES.badgeBase, 'bg-success/5 border-success/10')}>
        <span className="flex h-1 w-1 rounded-full bg-success" />
        <span className={cn(STYLES.badgeText, 'text-success')}>CANLI</span>
      </div>
    )
  }

  const siparisler = {
    label: 'SİPARİŞLER',
    value: String(metrics.totalOrders),
    icon: ShoppingBag,
    color: 'text-info',
    hoverBorder: 'hover:border-info/30',
    badge:
      (stats?.pendingOrders || 0) > 0 ? (
        <div className={cn(STYLES.badgeBase, 'bg-amber-500/10 border-amber-500/20')}>
          <span className="flex h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
          <span className={cn(STYLES.badgeText, 'text-amber-600')}>
            {stats?.pendingOrders} AÇIK
          </span>
        </div>
      ) : undefined
  }

  const gider = {
    label: 'GÜNLÜK GİDER',
    value: formatCurrency(metrics.dailyExpenses),
    valueColor: 'text-destructive',
    icon: ArrowDownRight,
    color: 'text-destructive',
    hoverBorder: 'hover:border-destructive/30'
  }

  const netKar = {
    label: 'NET KÂR',
    value: formatCurrency(metrics.netProfit),
    valueColor: metrics.netProfit >= 0 ? 'text-emerald-500' : 'text-destructive',
    icon: Wallet,
    color: 'text-emerald-500',
    hoverBorder: 'hover:border-emerald-500/30'
  }

  return (
    <div className={STYLES.grid}>
      <KPICard {...ciro} delay={100} />
      <KPICard {...siparisler} delay={150} />
      <PaymentBreakdownCard
        cash={stats?.paymentMethodBreakdown?.cash || 0}
        card={stats?.paymentMethodBreakdown?.card || 0}
        delay={200}
      />
      <KPICard {...gider} delay={250} />
      <KPICard {...netKar} delay={300} />
    </div>
  )
}
