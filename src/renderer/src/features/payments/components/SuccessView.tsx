import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { CheckCircle } from 'lucide-react'
import { memo } from 'react'

import { PremiumAmount } from '@/components/PremiumAmount'

interface SuccessViewProps {
  open: boolean
  finalChange: number
  onOpenChange: (open: boolean) => void
}

export const SuccessView = memo(function SuccessView({
  open,
  finalChange,
  onOpenChange
}: SuccessViewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} key="success-modal">
      <DialogContent
        className="sm:max-w-md border-none p-0 overflow-hidden bg-transparent shadow-none"
        aria-describedby={undefined}
      >
        <VisuallyHidden.Root asChild>
          <DialogTitle>Ödeme Başarılı</DialogTitle>
        </VisuallyHidden.Root>

        <div className="relative">
          <div className="absolute inset-0 bg-success/10 blur-[60px] rounded-full" />
          <div className="relative bg-card/95 backdrop-blur-3xl border border-border/10 dark:border-white/10 rounded-[2.5rem] p-12 flex flex-col items-center text-center shadow-[0_0_100px_-20px_rgba(34,197,94,0.3)] animate-in fade-in zoom-in-95 duration-400">
            <div className="relative mb-8 pt-4">
              <div className="absolute inset-0 bg-success/20 blur-[40px] rounded-full animate-pulse" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-success to-success/50 p-[1px] shadow-[0_0_50px_-10px_rgba(34,197,94,0.5)]">
                <div className="w-full h-full rounded-full bg-background/80 dark:bg-black/40 backdrop-blur-xl flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-success drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]" />
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <h3 className="text-4xl font-black text-foreground dark:text-white tracking-tight drop-shadow-sm dark:drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                Ödeme Başarılı
              </h3>
              <p className="text-lg text-muted-foreground/80 font-medium tracking-wide">
                İşlem onaylandı, masa hazır.
              </p>
            </div>

            {finalChange > 0 ? (
              <div className="w-full space-y-6 animate-in slide-in-from-bottom-5 duration-700 delay-150">
                <div className="relative">
                  <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-border/20 dark:via-white/10 to-transparent" />
                  <div className="py-7 relative">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-24 bg-warning/10 blur-[50px] rounded-full" />
                    <span className="text-sm font-bold text-warning/90 uppercase tracking-[0.2em] mb-4 block drop-shadow-sm">
                      Müşteriye Verilecek
                    </span>
                    <div className="relative inline-flex items-center justify-center p-8 min-w-[280px] bg-background/50 dark:bg-black/40 border border-border/10 dark:border-white/5 rounded-3xl backdrop-blur-md shadow-2xl">
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-warning/10 to-transparent opacity-50" />
                      <PremiumAmount amount={finalChange} size="6xl" color="warning" />
                    </div>
                    <p className="mt-6 text-sm font-semibold text-warning/80 flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                      Para üstünü vermeyi unutmayın
                    </p>
                  </div>
                  <div className="absolute inset-x-12 bottom-0 h-px bg-gradient-to-r from-transparent via-border/20 dark:via-white/10 to-transparent" />
                </div>
              </div>
            ) : (
              <div className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-success/10 rounded-2xl border border-success/20 text-success text-lg font-bold shadow-[0_0_30px_-10px_rgba(34,197,94,0.2)]">
                <CheckCircle className="w-6 h-6 fill-current text-current/20" />
                <span>Tam ödeme alındı</span>
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-[11px] font-medium text-muted-foreground/40 dark:text-white/20 uppercase tracking-widest">
                Otomatik kapanıyor
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
