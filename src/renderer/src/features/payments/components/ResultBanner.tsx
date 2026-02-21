import { Banknote, Zap } from 'lucide-react'
import { memo } from 'react'

import { PremiumAmount } from '@/components/PremiumAmount'

interface ResultBannerProps {
  itemsPartialBlocked: boolean
  tendered: number
  effectivePayment: number
  currentChange: number
}

export const ResultBanner = memo(function ResultBanner({
  itemsPartialBlocked,
  tendered,
  effectivePayment,
  currentChange
}: ResultBannerProps) {
  if (itemsPartialBlocked) {
    return (
      <div className="w-full py-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 shadow-sm flex items-center justify-between px-6 animate-in fade-in slide-in-from-top-2 duration-500 relative overflow-hidden group">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-rose-500" />
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-sm font-black text-rose-600">Ürün Seç Modu</span>
            <span className="text-[11px] font-bold text-rose-600/70">Parçalı tahsilat kapalı</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <PremiumAmount amount={effectivePayment} size="2xl" color="destructive" />
        </div>
      </div>
    )
  }

  if (tendered > effectivePayment) {
    return (
      <div className="w-full py-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 shadow-sm flex items-center justify-between px-6 animate-in fade-in slide-in-from-top-2 duration-500 relative overflow-hidden group">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-sm font-black text-amber-600 uppercase tracking-tight">
              Para Üstü
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <PremiumAmount amount={currentChange} size="2xl" color="warning" />
        </div>
      </div>
    )
  }

  if (tendered > 0 && tendered < effectivePayment) {
    return (
      <div className="w-full py-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 shadow-sm flex items-center justify-between px-6 animate-in fade-in slide-in-from-top-2 duration-500 relative overflow-hidden group">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Banknote className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-sm font-black text-blue-600">Parçalı Tahsilat</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <PremiumAmount amount={tendered} size="2xl" color="info" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full py-4 rounded-2xl bg-muted/10 border border-dashed border-border/20 flex items-center justify-center gap-3 opacity-60">
      <div className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" />
      <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.3em]">
        Ödeme Bekleniyor — Enter: Nakit
      </span>
    </div>
  )
})
