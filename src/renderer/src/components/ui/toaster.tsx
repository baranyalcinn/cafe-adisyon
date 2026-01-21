import { useToastStore } from '@/store/useToastStore'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Toaster(): React.JSX.Element | null {
  const { toasts, dismissToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-lg border animate-in slide-in-from-right-full fade-in duration-300',
            toast.variant === 'destructive' &&
              'bg-destructive text-destructive-foreground border-destructive/20',
            toast.variant === 'success' && 'bg-emerald-500 text-white border-emerald-600',
            toast.variant === 'warning' && 'bg-amber-500 text-white border-amber-600',
            (!toast.variant || toast.variant === 'default') &&
              'bg-card text-foreground border-border'
          )}
        >
          {toast.variant === 'success' && <CheckCircle className="w-5 h-5 shrink-0" />}
          {toast.variant === 'destructive' && <AlertCircle className="w-5 h-5 shrink-0" />}
          {toast.variant === 'warning' && <AlertTriangle className="w-5 h-5 shrink-0" />}
          {(!toast.variant || toast.variant === 'default') && (
            <Info className="w-5 h-5 shrink-0 text-blue-500" />
          )}

          <div className="flex-1 overflow-hidden">
            {toast.title && <h4 className="font-semibold text-sm">{toast.title}</h4>}
            {toast.description && <p className="text-sm opacity-90 mt-1">{toast.description}</p>}
          </div>

          <button
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
