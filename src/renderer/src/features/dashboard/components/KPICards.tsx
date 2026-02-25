'use client'

import { cn, formatCurrency } from '@/lib/utils'
import {
  ArrowDownRight,
  LucideIcon,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet
} from 'lucide-react'
import React, { memo, useMemo } from 'react'
import { useDashboardContext } from '../context/DashboardContext'

// ============================================================================
// Styles (Centralized for clean JSX)
// ============================================================================

const STYLES = {
  grid: 'grid grid-cols-2 md:grid-cols-3 gap-5',
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

const KPICard = memo(
  ({
    label,
    value,
    icon: Icon,
    color,
    hoverBorder,
    valueColor,
    badge,
    delay
  }: KPICardProps): React.JSX.Element => (
    <div className={cn(STYLES.cardBase, hoverBorder)} style={{ animationDelay: `${delay}ms` }}>
      <div className={STYLES.iconHeader}>
        <Icon className={cn(STYLES.icon, color)} />
        {badge}
      </div>
      <div className={cn(STYLES.value, valueColor || 'text-foreground')}>{value}</div>
      <span className={STYLES.label}>{label}</span>
    </div>
  )
)
KPICard.displayName = 'KPICard'

// ============================================================================
// Main Component
// ============================================================================

export function KPICards(): React.JSX.Element {
  const { stats } = useDashboardContext()
  const metrics = useMemo(() => {
    const dailyRevenue = stats?.dailyRevenue || 0
    const totalOrders = stats?.totalOrders || 0
    const dailyExpenses = stats?.dailyExpenses || 0
    const avgOrderAmount = totalOrders > 0 ? dailyRevenue / totalOrders : 0
    const netProfit = dailyRevenue - dailyExpenses

    return { dailyRevenue, totalOrders, dailyExpenses, avgOrderAmount, netProfit }
  }, [stats])

  const kpis = useMemo(
    () => [
      {
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
      },
      {
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
      },
      {
        label: 'DOLU MASA',
        value: String(stats?.openTables || 0),
        icon: Users,
        color: 'text-warning',
        hoverBorder: 'hover:border-warning/30'
      },
      {
        label: 'ORT. SİPARİŞ',
        value: formatCurrency(metrics.avgOrderAmount),
        icon: Receipt,
        color: 'text-violet-500',
        hoverBorder: 'hover:border-violet-500/30'
      },
      {
        label: 'GÜNLÜK GİDER',
        value: formatCurrency(metrics.dailyExpenses),
        valueColor: 'text-destructive',
        icon: ArrowDownRight,
        color: 'text-destructive',
        hoverBorder: 'hover:border-destructive/30'
      },
      {
        label: 'NET KÂR',
        value: formatCurrency(metrics.netProfit),
        valueColor: metrics.netProfit >= 0 ? 'text-emerald-500' : 'text-destructive',
        icon: Wallet,
        color: 'text-emerald-500',
        hoverBorder: 'hover:border-emerald-500/30'
      }
    ],
    [metrics, stats?.pendingOrders, stats?.openTables]
  )

  return (
    <div className={STYLES.grid}>
      {kpis.map((kpi, i) => (
        <KPICard key={kpi.label} {...kpi} delay={100 + i * 50} />
      ))}
    </div>
  )
}
