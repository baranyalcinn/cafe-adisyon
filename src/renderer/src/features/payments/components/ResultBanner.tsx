import { Banknote, ShieldAlert, Sparkles, Zap } from 'lucide-react'
import { memo } from 'react'

import { PremiumAmount } from '@/components/PremiumAmount'
import { cn } from '@/lib/utils'

interface ResultBannerProps {
  itemsPartialBlocked: boolean
  tendered: number
  effectivePayment: number
  currentChange: number
}

type BannerStatus = 'blocked' | 'change' | 'partial' | 'idle'

export const ResultBanner = memo(function ResultBanner({
  itemsPartialBlocked,
  tendered,
  effectivePayment,
  currentChange
}: ResultBannerProps) {
  const status: BannerStatus = itemsPartialBlocked
    ? 'blocked'
    : tendered > effectivePayment
      ? 'change'
      : tendered > 0 && tendered < effectivePayment
        ? 'partial'
        : 'idle'

  const cfg = {
    blocked: {
      stripe: 'bg-rose-500',
      wrap: 'border-rose-500/20 bg-rose-50/40',
      icon: 'text-rose-700 bg-rose-100/60 ring-rose-200',
      title: 'Ürün Seç Modu',
      subtitle: 'Parçalı tahsilat kapalı',
      Icon: ShieldAlert,
      amount: effectivePayment,
      amountColor: 'destructive' as const
    },
    change: {
      stripe: 'bg-amber-500',
      wrap: 'border-amber-500/20 bg-amber-50/40',
      icon: 'text-amber-700 bg-amber-100/60 ring-amber-200',
      title: 'Para Üstü',
      subtitle: 'Müşteriye verilecek tutar',
      Icon: Zap,
      amount: currentChange,
      amountColor: 'warning' as const
    },
    partial: {
      stripe: 'bg-sky-500',
      wrap: 'border-sky-500/20 bg-sky-50/40',
      icon: 'text-sky-700 bg-sky-100/60 ring-sky-200',
      title: 'Parçalı Tahsilat',
      subtitle: 'Girilen tutar ile tahsil edilecek',
      Icon: Banknote,
      amount: tendered,
      amountColor: 'info' as const
    },
    idle: {
      stripe: 'bg-muted-foreground/30',
      wrap: 'border-border/30 bg-background',
      icon: 'text-muted-foreground bg-muted/40 ring-border/40',
      title: 'Ödeme Bekleniyor',
      subtitle: 'Enter: Nakit · Delete: Sıfırla',
      Icon: Sparkles,
      amount: 0,
      amountColor: 'muted' as const
    }
  }[status]

  const showAmount = status !== 'idle'

  return (
    <div
      className={cn(
        'w-full relative overflow-hidden rounded-xl border',
        'shadow-[0_1px_0_rgba(0,0,0,0.04)]',
        cfg.wrap
      )}
      role="status"
      aria-live="polite"
    >
      {/* subtle left stripe */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-[3px]', cfg.stripe)} />

      <div className="flex items-center justify-between gap-4 px-4 py-3">
        {/* left */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center',
              'ring-1',
              cfg.icon
            )}
          >
            <cfg.Icon className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-foreground truncate">{cfg.title}</div>
            <div className="text-[11px] font-medium text-muted-foreground truncate">
              {cfg.subtitle}
            </div>
          </div>
        </div>

        {/* right */}
        {showAmount ? (
          <div className="shrink-0">
            <div className="rounded-lg border border-border/40 bg-background/70 px-3 py-1.5">
              <PremiumAmount amount={cfg.amount} size="xl" color={cfg.amountColor} />
            </div>
          </div>
        ) : (
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.18em]">
              Hazır
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
          </div>
        )}
      </div>
    </div>
  )
})
