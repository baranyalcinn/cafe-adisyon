import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cafeApi, type DailySummary } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'
import { getBusinessDayStart } from '@shared/utils/date'
import { AlertTriangle, CheckCircle, Database, FileText, Loader2, Moon, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// ============================================================================
// Types
// ============================================================================

interface EndOfDayModalProps {
  open: boolean
  onClose: () => void
}

type Step =
  | 'idle'
  | 'checking'
  | 'blocked'
  | 'confirm'
  | 'cash_reconcile'
  | 'processing'
  | 'success'
  | 'error'

interface OpenTableInfo {
  tableId: string
  tableName: string
  orderId: string
  totalAmount: number
}

interface ExpectedTotals {
  revenue: number
  cash: number
  card: number
  expenses: number
}

// ============================================================================
// Constants & Styles
// ============================================================================

const STYLES = {
  alertBox: 'flex items-center gap-3 p-4 rounded-lg',
  alertDestructive: 'bg-destructive/10 text-destructive',
  alertSuccess: 'bg-emerald-500/10 text-emerald-600',
  alertPrimary: 'bg-primary/10 text-primary',
  tableRow: 'flex items-center justify-between p-3 bg-muted rounded-lg',
  summaryBox: 'p-4 bg-muted rounded-2xl space-y-3',
  summaryRow: 'flex justify-between items-center text-sm',
  summaryLabel: 'text-muted-foreground font-bold text-[10px] tracking-wider',
  cashInputBase:
    'h-14 pl-10 text-left text-2xl font-extrabold bg-background border-2 border-primary/20 rounded-2xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
  differenceBox: 'p-3 rounded-xl text-center text-sm font-bold flex justify-between items-center',
  diffPositive: 'bg-emerald-500/10 text-emerald-600',
  diffNegative: 'bg-red-500/10 text-red-600'
} as const

// ============================================================================
// Main Component
// ============================================================================

export function EndOfDayModal({ open, onClose }: EndOfDayModalProps): React.JSX.Element {
  const [step, setStep] = useState<Step>('idle')
  const [openTables, setOpenTables] = useState<OpenTableInfo[]>([])
  const [result, setResult] = useState<{
    zReport: DailySummary
    backupPath: string
    deletedBackups: number
    deletedLogs?: number
    dbHealthy?: boolean
  } | null>(null)
  const [error, setError] = useState<string>('')
  const [actualCashInput, setActualCashInput] = useState<string>('')
  const [expectedTotals, setExpectedTotals] = useState<ExpectedTotals | null>(null)

  const isCheckingRef = useRef(false) // React 18 Strict Mode double-fetch prevention

  const handleCheck = useCallback(async (): Promise<void> => {
    if (isCheckingRef.current) return
    isCheckingRef.current = true

    setStep('checking')
    setError('')
    try {
      const checkResult = await cafeApi.endOfDay.check()
      if (checkResult.canProceed) {
        const stats = await cafeApi.dashboard.getExtendedStats()
        const expenses = await cafeApi.expenses.getAll()
        const today = getBusinessDayStart(new Date())

        const dayExpensesTotal = expenses
          .filter((e) => new Date(e.createdAt) >= today)
          .filter((e) => e.paymentMethod === 'CASH' || !e.paymentMethod)
          .reduce((sum, e) => sum + e.amount, 0)

        setExpectedTotals({
          revenue: stats.dailyRevenue,
          cash: stats.paymentMethodBreakdown.cash,
          card: stats.paymentMethodBreakdown.card,
          expenses: dayExpensesTotal
        })
        setStep('confirm')
      } else {
        setOpenTables(checkResult.openTables)
        setStep('blocked')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kontrol hatası')
      setStep('error')
    } finally {
      isCheckingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (open && step === 'idle') {
      handleCheck()
    }
  }, [open, step, handleCheck])

  const handleExecute = async (): Promise<void> => {
    setStep('processing')
    try {
      const cents = Math.round(parseFloat(actualCashInput || '0') * 100)
      const execResult = await cafeApi.endOfDay.execute(cents)
      setResult(execResult)
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gün sonu işlemi başarısız')
      setStep('error')
    }
  }

  const handleClose = (): void => {
    setStep('idle')
    setOpenTables([])
    setResult(null)
    setError('')
    setActualCashInput('')
    onClose()
  }

  // ============================================================================
  // Render Helpers (Sub-Views)
  // ============================================================================

  const renderChecking = (): React.JSX.Element => (
    <div className="flex flex-col items-center justify-center py-8 gap-4">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
      <p className="text-muted-foreground">Sistem durumu kontrol ediliyor...</p>
    </div>
  )

  const renderBlocked = (): React.JSX.Element => (
    <div className="space-y-4">
      <div className={cn(STYLES.alertBox, STYLES.alertDestructive)}>
        <AlertTriangle className="w-6 h-6 flex-shrink-0" />
        <div>
          <p className="font-semibold">AÇIK MASALAR VAR!</p>
          <p className="text-sm">
            Gün sonu yapabilmek için önce aşağıdaki masaları kapatmanız gerekiyor.
          </p>
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-2">
        {openTables.map((table) => (
          <div key={table.orderId} className={STYLES.tableRow}>
            <span className="font-medium">{table.tableName}</span>
            <span className="text-muted-foreground">{formatCurrency(table.totalAmount)}</span>
          </div>
        ))}
      </div>
      <Button variant="outline" className="w-full" onClick={handleClose}>
        <X className="w-4 h-4 mr-2" /> KAPAT
      </Button>
    </div>
  )

  const renderConfirm = (): React.JSX.Element => (
    <div className="space-y-4">
      <div className={cn(STYLES.alertBox, STYLES.alertPrimary)}>
        <CheckCircle className="w-6 h-6 flex-shrink-0" />
        <div>
          <p className="font-semibold">TÜM MASALAR KAPALI</p>
          <p className="text-sm">Gün sonu işlemi başlatılabilir.</p>
        </div>
      </div>
      <div className="p-4 bg-muted rounded-lg space-y-2">
        <p className="font-medium">YAPILACAK İŞLEMLER:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Z-Raporu oluşturulacak
          </li>
          <li className="flex items-center gap-2">
            <Database className="w-4 h-4" /> Veritabanı yedeklenecek
          </li>
        </ul>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={handleClose}>
          İPTAL
        </Button>
        <Button className="flex-1 bg-primary font-bold" onClick={() => setStep('cash_reconcile')}>
          İLERLE <Moon className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )

  const renderCashReconcile = (): React.JSX.Element | null => {
    if (!expectedTotals) return null
    const expectedNet = Math.max(0, expectedTotals.cash - (expectedTotals.expenses || 0))
    const enteredCash = Math.round(parseFloat(actualCashInput || '0') * 100)
    const isMatched = enteredCash >= expectedNet
    const diff = enteredCash - expectedNet

    return (
      <div className="space-y-6">
        <div className={STYLES.summaryBox}>
          <div className={STYLES.summaryRow}>
            <span className={STYLES.summaryLabel}>SİSTEM NAKİT BEKLENTİSİ</span>
            <span className="font-bold font-mono">{formatCurrency(expectedTotals.cash)}</span>
          </div>
          <div className={STYLES.summaryRow}>
            <span className={STYLES.summaryLabel}>BUGÜNKÜ GİDERLER</span>
            <span className="font-bold font-mono text-red-500">
              -{formatCurrency(expectedTotals.expenses || 0)}
            </span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex justify-between items-center">
            <span className="font-bold text-sm text-muted-foreground tracking-wider text-[10px]">
              NET BEKLENEN
            </span>
            <span className="font-extrabold text-lg tabular-nums">
              {formatCurrency(expectedNet)}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-muted-foreground tracking-wider">
            KASADAKİ GERÇEK NAKİT TUTARI
          </label>
          <div className="relative">
            <span
              className={cn(
                'absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-extrabold transition-colors',
                actualCashInput ? 'text-foreground' : 'text-muted-foreground/50'
              )}
            >
              ₺
            </span>
            <Input
              type="number"
              step="0.01"
              placeholder="0"
              autoFocus
              className={STYLES.cashInputBase}
              value={actualCashInput}
              onChange={(e) => setActualCashInput(e.target.value)}
            />
          </div>
          <div
            className={cn(
              STYLES.differenceBox,
              isMatched ? STYLES.diffPositive : STYLES.diffNegative
            )}
          >
            <span>Kasa Farkı:</span>
            <span className="font-mono">{formatCurrency(diff)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setStep('confirm')}>
            GERİ
          </Button>
          <Button
            className="flex-1 bg-primary font-bold shadow-lg shadow-primary/20"
            onClick={handleExecute}
            disabled={!actualCashInput}
          >
            KESİNLEŞTİR VE BİTİR
          </Button>
        </div>
      </div>
    )
  }

  const renderSuccess = (): React.JSX.Element | null => {
    if (!result) return null
    return (
      <div className="space-y-4">
        <div className={cn(STYLES.alertBox, STYLES.alertSuccess)}>
          <CheckCircle className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="font-semibold">GÜN SONU TAMAMLANDI!</p>
            <p className="text-sm">Tüm işlemler başarıyla gerçekleştirildi.</p>
          </div>
        </div>
        <div className={STYLES.summaryBox}>
          <div className={STYLES.summaryRow}>
            <span className="text-muted-foreground">GÜNLÜK CİRO</span>
            <span className="font-bold">{formatCurrency(result.zReport.totalRevenue)}</span>
          </div>
          <div className={STYLES.summaryRow}>
            <span className="text-muted-foreground">NAKİT</span>
            <span className="text-emerald-600">{formatCurrency(result.zReport.totalCash)}</span>
          </div>
          <div className={STYLES.summaryRow}>
            <span className="text-muted-foreground">KART</span>
            <span className="text-blue-600">{formatCurrency(result.zReport.totalCard)}</span>
          </div>
          <div className={STYLES.summaryRow}>
            <span className="text-muted-foreground">SİPARİŞ SAYISI</span>
            <span>{result.zReport.orderCount}</span>
          </div>
          <hr />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>✓ Yedek alındı ({result.deletedBackups} eski yedek silindi)</p>
            <p>✓ Veritabanı optimize edildi</p>
            {result.deletedLogs !== undefined && result.deletedLogs > 0 && (
              <p>✓ {result.deletedLogs} eski log temizlendi</p>
            )}
            <p className={result.dbHealthy === false ? 'text-red-500' : ''}>
              {result.dbHealthy === false
                ? '⚠ Veritabanı sağlık sorunu!'
                : '✓ Veritabanı sağlığı: İyi'}
            </p>
          </div>
        </div>
        <Button className="w-full" onClick={handleClose}>
          TAMAM
        </Button>
      </div>
    )
  }

  const renderError = (): React.JSX.Element => (
    <div className="space-y-4">
      <div className={cn(STYLES.alertBox, STYLES.alertDestructive)}>
        <AlertTriangle className="w-6 h-6 flex-shrink-0" />
        <div>
          <p className="font-semibold">HATA OLUŞTU</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={handleClose}>
          KAPAT
        </Button>
        <Button className="flex-1" onClick={handleCheck}>
          TEKRAR DENE
        </Button>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5" /> GÜN SONU İŞLEMİ
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {step === 'checking' && renderChecking()}
          {step === 'processing' && renderChecking()}
          {step === 'blocked' && renderBlocked()}
          {step === 'confirm' && renderConfirm()}
          {step === 'cash_reconcile' && renderCashReconcile()}
          {step === 'success' && renderSuccess()}
          {step === 'error' && renderError()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
