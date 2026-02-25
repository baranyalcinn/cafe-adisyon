'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import * as React from 'react'
import { useEffect } from 'react'
import { FallbackProps } from 'react-error-boundary'

// ============================================================================
// Styles (Centralized)
// ============================================================================

const STYLES = {
  container:
    'h-screen w-screen flex flex-col items-center justify-center p-4 bg-background overflow-hidden relative selection:bg-primary/20',
  glassPanel:
    'relative z-10 max-w-md w-full p-8 rounded-[2rem] border border-white/10 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-500 bg-card/50 backdrop-blur-sm',
  iconBox:
    'w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-6 border border-destructive/20 shadow-lg shadow-destructive/10',
  title: 'text-3xl font-black tracking-tight text-foreground mb-3',
  description: 'text-muted-foreground font-medium mb-8 leading-relaxed',
  errorBox:
    'w-full mb-8 p-4 bg-destructive/5 rounded-xl border border-destructive/10 text-left overflow-auto max-h-40',
  errorText: 'text-xs font-mono text-destructive break-all',
  refreshBtn:
    'w-full h-14 text-base font-bold tracking-wide rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-3',
  footerText: 'mt-6 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]'
} as const

// ============================================================================
// Sub-Components
// ============================================================================

/** Arka plandaki dekoratif ışıklandırma efektleri */
const BackgroundAmbience = (): React.JSX.Element => (
  <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
    <div className="absolute top-[20%] left-[20%] w-[40vw] h-[40vw] bg-destructive/5 rounded-full blur-[120px] animate-pulse duration-[4000ms]" />
    <div className="absolute bottom-[20%] right-[20%] w-[30vw] h-[30vw] bg-primary/5 rounded-full blur-[100px]" />
  </div>
)

/** Geliştiriciler için hata detay kutusu */
const ErrorDetailBox = ({ error }: { error: Error | string }): React.JSX.Element | null => {
  if (process.env.NODE_ENV !== 'development') return null

  const message = typeof error === 'string' ? error : error.message

  return (
    <div className={STYLES.errorBox}>
      <p className={STYLES.errorText}>{message}</p>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps): React.JSX.Element {
  // Hata oluştuğunda otomatik olarak loglama yap
  useEffect(() => {
    console.error('[Application Crash]:', error)
    // İleride buraya window.api.logs.create gibi bir çağrı eklenebilir.
  }, [error])

  return (
    <div className={STYLES.container}>
      <BackgroundAmbience />

      <div className={STYLES.glassPanel}>
        {/* Icon */}
        <div className={STYLES.iconBox}>
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>

        {/* Content */}
        <h1 className={STYLES.title}>Bir Sorun Oluştu</h1>
        <p className={STYLES.description}>
          Beklenmedik bir hata nedeniyle uygulama işlemi tamamlayamadı. Endişelenmeyin, verileriniz
          güvende.
        </p>

        {/* Error Details (Only Dev Mode) */}
        <ErrorDetailBox error={error as Error | string} />

        {/* Action */}
        <Button onClick={resetErrorBoundary} size="lg" className={STYLES.refreshBtn}>
          <RefreshCw className="w-5 h-5" />
          Uygulamayı Yenile
        </Button>

        <p className={STYLES.footerText}>CAFE ADISYON SISTEMI</p>
      </div>
    </div>
  )
}
