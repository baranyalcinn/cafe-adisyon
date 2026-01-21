import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, CheckCircle, Loader2, Moon, X, Database, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cafeApi, type DailySummary } from '@/lib/api'

interface EndOfDayModalProps {
  open: boolean
  onClose: () => void
}

type Step = 'idle' | 'checking' | 'blocked' | 'confirm' | 'processing' | 'success' | 'error'

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
  } | null>(null)
  const [error, setError] = useState<string>('')

  const handleCheck = useCallback(async (): Promise<void> => {
    setStep('checking')
    setError('')
    try {
      const checkResult = await cafeApi.endOfDay.check()
      if (checkResult.canProceed) {
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
  useEffect(() => {
    if (open && step === 'idle') {
      handleCheck()
    }
  }, [open, step, handleCheck])

  const handleExecute = async (): Promise<void> => {
    setStep('processing')
    try {
      const execResult = await cafeApi.endOfDay.execute()
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
            Gün Sonu İşlemi
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
                  <p className="font-semibold">Açık Masalar Var!</p>
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
                    <span className="text-muted-foreground">₺{table.totalAmount.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full" onClick={handleClose}>
                <X className="w-4 h-4 mr-2" />
                Kapat
              </Button>
            </div>
          )}

          {/* Confirm Step */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-primary/10 text-primary rounded-lg">
                <CheckCircle className="w-6 h-6 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Tüm Masalar Kapalı</p>
                  <p className="text-sm">Gün sonu işlemi başlatılabilir.</p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="font-medium">Yapılacak işlemler:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Z-Raporu oluşturulacak
                  </li>
                  <li className="flex items-center gap-2">
                    <Database className="w-4 h-4" /> Veritabanı yedeklenecek
                  </li>
                  <li className="flex items-center gap-2">
                    <Database className="w-4 h-4" /> Veritabanı optimize edilecek (VACUUM)
                  </li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  İptal
                </Button>
                <Button className="flex-1 bg-primary" onClick={handleExecute}>
                  <Moon className="w-4 h-4 mr-2" />
                  Gün Sonu Yap
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
                  <p className="font-semibold">Gün Sonu Tamamlandı!</p>
                  <p className="text-sm">Tüm işlemler başarıyla gerçekleştirildi.</p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Günlük Ciro</span>
                  <span className="font-bold">₺{result.zReport.totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nakit</span>
                  <span className="text-emerald-600">₺{result.zReport.totalCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kart</span>
                  <span className="text-blue-600">₺{result.zReport.totalCard.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sipariş Sayısı</span>
                  <span>{result.zReport.orderCount}</span>
                </div>
                <hr />
                <div className="text-xs text-muted-foreground">
                  <p>✓ Yedek alındı ({result.deletedBackups} eski yedek silindi)</p>
                  <p>✓ Veritabanı optimize edildi</p>
                </div>
              </div>

              <Button className="w-full" onClick={handleClose}>
                Tamam
              </Button>
            </div>
          )}

          {/* Error Step */}
          {step === 'error' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Hata Oluştu</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  Kapat
                </Button>
                <Button className="flex-1" onClick={handleCheck}>
                  Tekrar Dene
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
