import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, CheckCircle, Loader2, Moon, X, Database, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cafeApi, type DailySummary } from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

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
  const [expectedTotals, setExpectedTotals] = useState<{
    revenue: number
    cash: number
    card: number
    expenses: number
  } | null>(null)

  const handleCheck = useCallback(async (): Promise<void> => {
    setStep('checking')
    setError('')
    try {
      const checkResult = await cafeApi.endOfDay.check()
      if (checkResult.canProceed) {
        // Fetch expected totals for reconciliation
        const stats = await cafeApi.dashboard.getExtendedStats()
        // Assuming we need a more specific "today" stats if necessary,
        // but getExtendedStats usually gives today's snapshot.
        setExpectedTotals({
          revenue: stats.dailyRevenue,
          cash: stats.paymentMethodBreakdown.cash,
          card: stats.paymentMethodBreakdown.card,
          expenses: 0 // We'll sum expenses in execute if needed, or fetch here if API allowed
        })
        // Fetch today's expenses specifically for better accuracy in reconciliation
        const expenses = await cafeApi.expenses.getAll()
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dayExpensesTotal = expenses
          .filter((e) => new Date(e.createdAt) >= today)
          .reduce((sum, e) => sum + e.amount, 0)

        setExpectedTotals((prev) => (prev ? { ...prev, expenses: dayExpensesTotal } : null))
        setStep('confirm')
      } else {
        setOpenTables(checkResult.openTables)
        setStep('blocked')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kontrol hatası')
      setStep('error')
    }
  }, [])

  // Auto-check when modal opens
  // Auto-check when modal opens
  useEffect(() => {
    let mounted = true
    if (open && step === 'idle' && mounted) {
      handleCheck()
    }
    return () => {
      mounted = false
    }
  }, [open, step])

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
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5" />
            GÜN SONU İŞLEMİ
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Checking Step */}
          {step === 'checking' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-muted-foreground">Açık masalar kontrol ediliyor...</p>
            </div>
          )}

          {/* Blocked Step - Open Tables Found */}
          {step === 'blocked' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg">
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
                  <div
                    key={table.orderId}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <span className="font-medium">{table.tableName}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(table.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full" onClick={handleClose}>
                <X className="w-4 h-4 mr-2" />
                KAPAT
              </Button>
            </div>
          )}

          {/* Confirm Step */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-primary/10 text-primary rounded-lg">
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
                <Button
                  className="flex-1 bg-primary font-bold"
                  onClick={() => setStep('cash_reconcile')}
                >
                  İLERLE
                  <Moon className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Cash Reconcile Step */}
          {step === 'cash_reconcile' && expectedTotals && (
            <div className="space-y-6">
              <div className="p-4 bg-muted rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-bold text-[10px] tracking-wider">
                    SİSTEM NAKİT BEKLENTİSİ
                  </span>
                  <span className="font-bold font-mono">{formatCurrency(expectedTotals.cash)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-bold text-[10px] tracking-wider">
                    BUGÜNKÜ GİDERLER
                  </span>
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
                    {formatCurrency(Math.max(0, expectedTotals.cash - expectedTotals.expenses))}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-muted-foreground tracking-wider">
                  KASADAKİ GERÇEK NAKİT TUTARI
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  autoFocus
                  className="h-12 text-center text-2xl font-extrabold bg-background border-2 border-primary/20 rounded-2xl"
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                />

                <div
                  className={cn(
                    'p-3 rounded-xl text-center text-sm font-bold flex justify-between items-center',
                    Math.round(parseFloat(actualCashInput) * 100) >=
                      expectedTotals.cash - expectedTotals.expenses
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-red-500/10 text-red-600'
                  )}
                >
                  <span>Kasa Farkı:</span>
                  <span className="font-mono">
                    {formatCurrency(
                      Math.round(parseFloat(actualCashInput) * 100) -
                        (expectedTotals.cash - expectedTotals.expenses)
                    )}
                  </span>
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
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <div className="text-center">
                <p className="font-medium">Gün sonu işlemi yapılıyor...</p>
                <p className="text-sm text-muted-foreground">
                  Lütfen bekleyin, bu işlem biraz zaman alabilir.
                </p>
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 text-emerald-600 rounded-lg">
                <CheckCircle className="w-6 h-6 flex-shrink-0" />
                <div>
                  <p className="font-semibold">GÜN SONU TAMAMLANDI!</p>
                  <p className="text-sm">Tüm işlemler başarıyla gerçekleştirildi.</p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GÜNLÜK CİRO</span>
                  <span className="font-bold">{formatCurrency(result.zReport.totalRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NAKİT</span>
                  <span className="text-emerald-600">
                    {formatCurrency(result.zReport.totalCash)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">KART</span>
                  <span className="text-blue-600">{formatCurrency(result.zReport.totalCard)}</span>
                </div>
                <div className="flex justify-between">
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
          )}

          {/* Error Step */}
          {step === 'error' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg">
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
