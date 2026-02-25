import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { CheckCircle } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'

import { PremiumAmount } from '@/components/PremiumAmount'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface SuccessViewProps {
  open: boolean
  finalChange: number
  onOpenChange: (open: boolean) => void
  autoCloseMs?: number
}

// ============================================================================
// Constants & Styles
// ============================================================================

const TONE_CONFIG = {
  warning: { ring: 'ring-warning/20', bg: 'bg-warning/10', icon: 'text-warning' },
  success: { ring: 'ring-success/20', bg: 'bg-success/10', icon: 'text-success' }
} as const

const STYLES = {
  content: 'sm:max-w-md border-none p-0 bg-transparent shadow-none',
  wash: 'pointer-events-none absolute inset-0 rounded-2xl bg-success/5',
  card: 'relative rounded-2xl border bg-card/90 backdrop-blur border-border/40 shadow-sm px-8 py-7 text-center',
  iconWrap: 'mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl ring-1',
  changeBox: 'rounded-xl border border-border/40 bg-background/60 px-5 py-4',
  successBox:
    'flex items-center justify-center gap-2 rounded-xl border border-success/20 bg-success/10 px-5 py-4',
  progressBg: 'h-1.5 w-full overflow-hidden rounded-full bg-border/30',
  progressBar: 'h-full rounded-full bg-foreground/60 transition-[width] duration-100 ease-linear'
} as const

// ============================================================================
// Component
// ============================================================================

export const SuccessView = memo(function SuccessView({
  open,
  finalChange,
  onOpenChange,
  autoCloseMs = 4500
}: SuccessViewProps) {
  const [progress, setProgress] = useState(0)

  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  const hasChange = finalChange > 0

  // useMemo'ya gerek yok, basit bir obje referans ataması yapıyoruz
  const tone = hasChange ? TONE_CONFIG.warning : TONE_CONFIG.success

  // Animasyon Döngüsü Yönetimi
  useEffect(() => {
    if (!open) {
      setProgress(0)
      startRef.current = null
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      return
    }

    setProgress(0)
    startRef.current = null

    const tick = (t: number): void => {
      if (startRef.current == null) startRef.current = t
      const elapsed = t - startRef.current
      const p = Math.min(1, elapsed / autoCloseMs)

      setProgress(p)

      if (p >= 1) {
        onOpenChange(false)
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [open, autoCloseMs, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange} key="success-modal">
      <DialogContent className={STYLES.content} aria-describedby={undefined}>
        <VisuallyHidden.Root asChild>
          <DialogTitle>Ödeme Başarılı</DialogTitle>
        </VisuallyHidden.Root>

        <div className="relative">
          {/* Subtle background wash */}
          <div className={STYLES.wash} />

          <div className={STYLES.card}>
            {/* Header */}
            <div className={cn(STYLES.iconWrap, tone.bg, tone.ring)}>
              <CheckCircle className={cn('h-6 w-6', tone.icon)} />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Ödeme Başarılı</h3>
              <p className="text-sm text-foreground/80">İşlem onaylandı, masa hazır.</p>
            </div>

            {/* Body */}
            <div className="mt-6">
              {hasChange ? (
                <div className={STYLES.changeBox}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-left">
                      <div className="text-xs font-semibold text-foreground/80">
                        Müşteriye verilecek
                      </div>
                      <div className="mt-1 text-[11px] text-foreground/80">
                        Para üstünü vermeyi unutmayın
                      </div>
                    </div>

                    <div className="shrink-0 rounded-lg bg-background/80 px-3 py-2 ring-1 ring-border/40">
                      <PremiumAmount amount={finalChange} size="2xl" color="warning" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className={STYLES.successBox}>
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-sm font-semibold text-success">Tam ödeme alındı</span>
                </div>
              )}
            </div>

            {/* Footer + Progress */}
            <div className="mt-5 space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground/60 tracking-wider">
                Otomatik kapanıyor
              </p>

              <div className={STYLES.progressBg}>
                <div
                  className={STYLES.progressBar}
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
