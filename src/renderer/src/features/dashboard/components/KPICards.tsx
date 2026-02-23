import { formatCurrency } from '@/lib/utils'
import { ArrowDownRight, Receipt, ShoppingBag, TrendingUp, Users, Wallet } from 'lucide-react'
import React from 'react'
import { useDashboardContext } from '../context/DashboardContext'

export function KPICards(): React.JSX.Element {
  const { stats } = useDashboardContext()

  const dailyRevenue = stats?.dailyRevenue || 0
  const totalOrders = stats?.totalOrders || 0
  const dailyExpenses = stats?.dailyExpenses || 0
  const avgOrderAmount = totalOrders > 0 ? dailyRevenue / totalOrders : 0
  const netProfit = dailyRevenue - dailyExpenses

  const kpis = [
    {
      label: 'BUGÜNKÜ CİRO',
      value: formatCurrency(dailyRevenue),
      icon: TrendingUp,
      color: 'text-primary',
      hoverBorder: 'hover:border-primary/30',
      badge: (
        <div className="flex items-center gap-1.5 bg-success/5 border border-success/10 px-2 py-0.5 rounded-full">
          <span className="flex h-1 w-1 rounded-full bg-success" />
          <span className="text-[8px] font-black text-success  tracking-[0.2em]">CANLI</span>
        </div>
      )
    },
    {
      label: 'SİPARİŞLER',
      value: String(totalOrders),
      sub: 'KAPANAN SİPARİŞ',
      icon: ShoppingBag,
      color: 'text-info',
      hoverBorder: 'hover:border-info/30',
      badge:
        (stats?.pendingOrders || 0) > 0 ? (
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            <span className="flex h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[8px] font-black text-amber-600  tracking-[0.15em]">
              {stats?.pendingOrders} AÇIK
            </span>
          </div>
        ) : undefined
    },
    {
      label: 'DOLU MASA',
      value: String(stats?.openTables || 0),
      sub: 'AKTİF SERVİS',
      icon: Users,
      color: 'text-warning',
      hoverBorder: 'hover:border-warning/30'
    },
    {
      label: 'ORT. SİPARİŞ',
      value: formatCurrency(avgOrderAmount),
      sub: 'SİPARİŞ BAŞI',
      icon: Receipt,
      color: 'text-violet-500',
      hoverBorder: 'hover:border-violet-500/30'
    },
    {
      label: 'GÜNLÜK GİDER',
      value: formatCurrency(dailyExpenses),
      valueColor: 'text-destructive',
      sub: 'TOPLAM MALİYET',
      icon: ArrowDownRight,
      color: 'text-destructive',
      hoverBorder: 'hover:border-destructive/30'
    },
    {
      label: 'NET KÂR',
      value: formatCurrency(netProfit),
      valueColor: netProfit >= 0 ? 'text-emerald-500' : 'text-destructive',
      sub: 'CİRO — GİDER',
      icon: Wallet,
      color: 'text-emerald-500',
      hoverBorder: 'hover:border-emerald-500/30'
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
      {kpis.map((kpi, i) => {
        const Icon = kpi.icon
        return (
          <div
            key={kpi.label}
            className={`animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both bg-card border border-border/50 rounded-2xl px-5 py-4 shadow-sm group transition-all hover:shadow-md ${kpi.hoverBorder}`}
            style={{ animationDelay: `${100 + i * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <Icon
                className={`w-6 h-6 ${kpi.color} drop-shadow-sm transition-transform duration-500 group-hover:scale-110`}
              />
              {kpi.badge}
            </div>
            <div
              className={`text-3xl font-black tabular-nums tracking-tighter leading-tight ${kpi.valueColor || 'text-foreground'}`}
            >
              {kpi.value}
            </div>
            <span className="text-[11px] font-black text-muted-foreground/50 tracking-[0.2em] ">
              {kpi.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
