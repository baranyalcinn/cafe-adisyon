import { formatCurrency } from '@/lib/utils'
import { ArrowDownRight, ShoppingBag, TrendingUp, Users } from 'lucide-react'
import React from 'react'
import { useDashboardContext } from '../context/DashboardContext'

export function KPICards(): React.JSX.Element {
  const { stats } = useDashboardContext()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Daily Revenue */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both bg-card border border-border/50 rounded-[2rem] p-6 shadow-sm flex flex-col items-start justify-center space-y-4 group transition-all hover:border-primary/30 hover:shadow-md">
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

      {/* Orders */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both bg-card border border-border/50 rounded-[2rem] p-6 shadow-sm flex flex-col items-start justify-center space-y-4 group transition-all hover:border-info/30 hover:shadow-md">
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

      {/* Open Tables */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both bg-card border border-border/50 rounded-[2rem] p-6 shadow-sm flex flex-col items-start justify-center space-y-4 group transition-all hover:border-warning/30 hover:shadow-md">
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

      {/* Daily Expenses */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both bg-card border border-border/50 rounded-[2rem] p-6 shadow-sm flex flex-col items-start justify-center space-y-4 group transition-all hover:border-destructive/30 hover:shadow-md">
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
  )
}
