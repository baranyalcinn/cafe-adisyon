'use client'

import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/useToastStore'
import { AlertCircle, AlertTriangle, CheckCircle, Info, LucideIcon, X } from 'lucide-react'
import * as React from 'react'
import { memo } from 'react'

// ============================================================================
// Types & Interfaces
// ============================================================================

type ToastVariant = 'default' | 'destructive' | 'success' | 'warning'

/**
 * Toast nesnesinin yapısı.
 * success, destructive, warning ve default varyantlarını destekler.
 */
interface Toast {
  id: string
  title?: string
  description?: React.ReactNode
  variant?: ToastVariant
  action?: React.ReactNode
}

// ============================================================================
// Constants & Configuration
// ============================================================================

/**
 * Bildirim varyantlarına göre ikon ve stil eşleşmeleri.
 */
const VARIANT_CONFIG: Record<ToastVariant, { icon: LucideIcon; styles: string }> = {
  success: {
    icon: CheckCircle,
    styles: 'bg-emerald-500 text-white border-emerald-600'
  },
  destructive: {
    icon: AlertCircle,
    styles: 'bg-destructive text-destructive-foreground border-destructive/20'
  },
  warning: {
    icon: AlertTriangle,
    styles: 'bg-amber-500 text-white border-amber-600'
  },
  default: {
    icon: Info,
    styles: 'bg-card text-foreground border-border'
  }
} as const

const STYLES = {
  container: 'fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none',
  toastBase:
    'pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-lg border animate-in slide-in-from-right-full fade-in duration-300',
  content: 'flex-1 overflow-hidden',
  title: 'font-semibold text-sm',
  description: 'text-sm opacity-90 mt-1',
  closeBtn: 'shrink-0 hover:opacity-70 transition-opacity p-0.5'
} as const

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Tek bir bildirim kartı.
 * 'memo' kullanılarak listenin geri kalanı değiştiğinde gereksiz render önlenir.
 */
const ToastItem = memo(
  ({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }): React.JSX.Element => {
    const variant = toast.variant || 'default'
    const { icon: Icon, styles } = VARIANT_CONFIG[variant]

    return (
      <div className={cn(STYLES.toastBase, styles)}>
        <Icon className={cn('w-5 h-5 shrink-0', variant === 'default' && 'text-blue-500')} />

        <div className={STYLES.content}>
          {toast.title && <h4 className={STYLES.title}>{toast.title}</h4>}
          {toast.description && <div className={STYLES.description}>{toast.description}</div>}
          {toast.action && <div className="mt-2 text-sm">{toast.action}</div>}
        </div>

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className={STYLES.closeBtn}
          aria-label="Bildirimi Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }
)

ToastItem.displayName = 'ToastItem'

// ============================================================================
// Main Component
// ============================================================================

/**
 * Uygulamanın global bildirim yöneticisi.
 */
export function Toaster(): React.JSX.Element | null {
  const toasts = useToastStore((state) => state.toasts)
  const dismissToast = useToastStore((state) => state.dismissToast)

  if (toasts.length === 0) return null

  return (
    <div className={STYLES.container} data-slot="toaster">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  )
}
