import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { FallbackProps } from 'react-error-boundary'

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps): React.JSX.Element {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center p-4 bg-background overflow-hidden relative selection:bg-primary/20">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-[40vw] h-[40vw] bg-destructive/5 rounded-full blur-[120px] animate-pulse duration-[4000ms]" />
        <div className="absolute bottom-[20%] right-[20%] w-[30vw] h-[30vw] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-md w-full glass-panel p-8 rounded-[2rem] border border-white/10 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-6 border border-destructive/20 shadow-lg shadow-destructive/10">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>

        <h1 className="text-3xl font-black tracking-tight text-foreground mb-3">
          Bir Sorun Oluştu
        </h1>

        <p className="text-muted-foreground font-medium mb-8 leading-relaxed">
          Beklenmedik bir hata nedeniyle uygulama işlemi tamamlayamadı. Endişelenmeyin, verileriniz
          güvende.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="w-full mb-8 p-4 bg-destructive/5 rounded-xl border border-destructive/10 text-left overflow-auto max-h-40">
            <p className="text-xs font-mono text-destructive break-all">
              {(error as Error)?.message || String(error)}
            </p>
          </div>
        )}

        <Button
          onClick={resetErrorBoundary}
          size="lg"
          className="w-full h-14 text-base font-bold tracking-wide rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-3"
        >
          <RefreshCw className="w-5 h-5" />
          Uygulamayı Yenile
        </Button>

        <p className="mt-6 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
          CAFE ADISYON SISTEMI
        </p>
      </div>
    </div>
  )
}
