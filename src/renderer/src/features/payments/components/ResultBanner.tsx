import { Banknote, CheckCircle2, Coins, CreditCard, ShieldAlert, Sparkles, Zap } from 'lucide-react'

import { PremiumAmount } from '@/components/PremiumAmount'
import { type PaymentMethod } from '@/lib/api'
import { cn } from '@/lib/utils'
import { memo } from 'react'

// ============================================================================
// Types
// ============================================================================

interface ResultBannerProps {
  itemsPartialBlocked: boolean
  tendered: number
  effectivePayment: number
  currentChange: number
  hoveredMethod?: PaymentMethod | null
  className?: string
}

type BannerStatus = 'blocked' | 'change' | 'partial' | 'exact' | 'hover' | 'idle'
type AmountColor = 'destructive' | 'warning' | 'info' | 'success' | 'primary' | 'muted'
type MethodKey = 'CASH' | 'CARD' | 'NONE'

interface MethodTone {
  stripe: string
  wrap: string
  icon: string
  amountColor: AmountColor
  titlePrefix: string
  Icon: typeof Banknote
}

interface BannerConfig {
  stripe: string
  wrap: string
  icon: string
  title: string
  subtitle: string
  Icon: typeof Banknote
  amount: number
  amountColor: AmountColor
}

// ============================================================================
// Constants
// ============================================================================

const METHOD_THEME: Record<MethodKey, MethodTone> = {
  CASH: {
    stripe: 'bg-emerald-500',
    wrap: 'border-emerald-500/25 bg-emerald-500/8 dark:bg-emerald-500/12',
    icon: 'text-emerald-700 dark:text-emerald-300',
    amountColor: 'success',
    titlePrefix: 'Nakit',
    Icon: Banknote
  },
  CARD: {
    stripe: 'bg-indigo-500',
    wrap: 'border-indigo-500/25 bg-indigo-500/8 dark:bg-indigo-500/12',
    icon: 'text-indigo-700 dark:text-indigo-300',
    amountColor: 'primary',
    titlePrefix: 'Kart',
    Icon: CreditCard
  },
  NONE: {
    stripe: 'bg-sky-500',
    wrap: 'border-sky-500/20 bg-sky-500/6 dark:bg-sky-500/10',
    icon: 'text-sky-700 dark:text-sky-300',
    amountColor: 'info',
    titlePrefix: '',
    Icon: Coins
  }
}

// Statik konfigürasyonlar - render dışında tanımlı, performans için optimize
const STATIC_THEMES: Record<
  'blocked' | 'change' | 'idle',
  Omit<BannerConfig, 'amount'> & { amount?: number }
> = {
  blocked: {
    stripe: 'bg-rose-500',
    wrap: 'border-rose-500/25 bg-rose-500/8 dark:bg-rose-500/12',
    icon: 'text-rose-700 dark:text-rose-300',
    title: 'Ürün Seç Modu',
    subtitle: 'Parçalı tahsilat kapalı',
    Icon: ShieldAlert,
    amountColor: 'destructive'
  },
  change: {
    stripe: 'bg-amber-500',
    wrap: 'border-amber-500/25 bg-amber-500/8 dark:bg-amber-500/12',
    icon: 'text-amber-700 dark:text-amber-300',
    title: 'Para Üstü',
    subtitle: 'Müşteriye verilecek tutar',
    Icon: Zap,
    amountColor: 'warning'
  },
  idle: {
    stripe: 'bg-muted-foreground/30',
    wrap: 'border-border/50 bg-card/70 dark:bg-card/40',
    icon: 'text-muted-foreground',
    title: 'Ödeme Bekleniyor',
    subtitle: 'Enter: Nakit · Delete: Sıfırla',
    Icon: Sparkles,
    amountColor: 'muted',
    amount: 0
  }
}

// ============================================================================
// Pure Helpers (testable, zero side effects)
// ============================================================================

const getMethodKey = (method?: PaymentMethod | null): MethodKey =>
  method === 'CASH' ? 'CASH' : method === 'CARD' ? 'CARD' : 'NONE'

const resolveStatus = (
  blocked: boolean,
  tendered: number,
  effective: number,
  hovered?: PaymentMethod | null
): BannerStatus => {
  if (blocked) return 'blocked'
  if (tendered === effective && tendered > 0) return 'exact'
  if (tendered > effective) return 'change'
  if (tendered > 0) return 'partial'
  if (hovered) return 'hover'
  return 'idle'
}

const buildTitle = (prefix: string, suffix: string): string =>
  prefix ? `${prefix} ${suffix}` : suffix

const buildConfig = (
  status: BannerStatus,
  methodKey: MethodKey,
  tendered: number,
  effective: number,
  change: number
): BannerConfig => {
  const theme = METHOD_THEME[methodKey]

  switch (status) {
    case 'blocked':
      return { ...STATIC_THEMES.blocked, amount: effective }

    case 'change':
      return { ...STATIC_THEMES.change, amount: Math.max(0, change) }

    case 'partial':
      return {
        stripe: theme.stripe,
        wrap: theme.wrap,
        icon: theme.icon,
        title: buildTitle(theme.titlePrefix, 'Parçalı Tahsilat'),
        subtitle: 'Ödenen kısım uygulanacak',
        Icon: theme.Icon,
        amountColor: theme.amountColor,
        amount: tendered
      }

    case 'exact': {
      const useDefaultIcon = methodKey === 'NONE'
      return {
        stripe: theme.stripe,
        wrap: theme.wrap,
        icon: theme.icon,
        title: buildTitle(theme.titlePrefix, 'Tam Tahsilat'),
        subtitle: 'Hesap tamamen kapanacak',
        Icon: useDefaultIcon ? CheckCircle2 : theme.Icon,
        amountColor: useDefaultIcon ? 'success' : theme.amountColor,
        amount: effective
      }
    }

    case 'hover':
      return {
        stripe: theme.stripe,
        wrap: theme.wrap,
        icon: theme.icon,
        title: buildTitle(theme.titlePrefix, 'Tahsilat'),
        subtitle: '',
        Icon: theme.Icon,
        amountColor: theme.amountColor,
        amount: effective
      }

    case 'idle':
    default:
      return STATIC_THEMES.idle as BannerConfig
  }
}

// ============================================================================
// Component
// ============================================================================

export const ResultBanner = memo(function ResultBanner({
  itemsPartialBlocked,
  tendered,
  effectivePayment,
  currentChange,
  hoveredMethod,
  className
}: ResultBannerProps): React.JSX.Element {
  // useMemo'ya gerek yok, çünkü bileşen (memo sayesinde) sadece bu proplar değiştiğinde çalışır
  const methodKey = getMethodKey(hoveredMethod)
  const status = resolveStatus(itemsPartialBlocked, tendered, effectivePayment, hoveredMethod)
  const config = buildConfig(status, methodKey, tendered, effectivePayment, currentChange)

  const showAmount = status !== 'idle'
  const animationKey = `${status}-${hoveredMethod ?? 'none'}`

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border backdrop-blur-sm h-[76px] flex items-center',
        'shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
        'transition-all duration-300',
        config.wrap,
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Left accent stripe */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', config.stripe)} />

      {/* Soft glow */}
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute -left-10 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-white/20 blur-2xl dark:bg-white/5" />
      </div>

      <div className="relative w-full flex items-center justify-between gap-4 px-4 sm:px-5">
        {/* Left side */}
        <div
          key={animationKey}
          className="min-w-0 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300"
        >
          <div
            className={cn(
              'flex shrink-0 items-center justify-center transition-colors duration-300',
              config.icon
            )}
          >
            <config.Icon className="h-7 w-7" strokeWidth={2.75} />
          </div>

          <div className="min-w-0">
            <div className="truncate text-[16px] sm:text-[18px] font-bold tracking-tight text-foreground leading-snug">
              {config.title}
            </div>
            <div className="truncate text-[12px] sm:text-[13px] font-medium text-muted-foreground">
              {config.subtitle}
            </div>
          </div>
        </div>

        {/* Right side */}
        {showAmount ? (
          <div className="shrink-0">
            <div
              className={cn(
                'rounded-xl border px-3 py-2 sm:px-4',
                'bg-background/85 dark:bg-background/30',
                'border-border/50 shadow-sm'
              )}
            >
              <PremiumAmount amount={config.amount} size="2xl" color={config.amountColor} />
            </div>
          </div>
        ) : (
          <div className="shrink-0 flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-2.5 py-1.5">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
              Hazır
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
          </div>
        )}
      </div>
    </div>
  )
})

ResultBanner.displayName = 'ResultBanner'
