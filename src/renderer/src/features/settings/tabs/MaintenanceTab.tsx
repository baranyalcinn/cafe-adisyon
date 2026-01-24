import { useState } from 'react'
import {
  Archive,
  Download,
  DatabaseZap,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  FileJson,
  FileSpreadsheet,
  Settings2
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cafeApi } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ActionResult {
  success: boolean
  message: string
}

export function MaintenanceTab(): React.JSX.Element {
  const [isArchiving, setIsArchiving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isVacuuming, setIsVacuuming] = useState(false)
  const [isBacking, setIsBacking] = useState(false)
  const [lastResult, setLastResult] = useState<ActionResult | null>(null)

  const handleArchive = async (): Promise<void> => {
    if (
      !confirm(
        '1 yıldan eski tüm siparişler ve işlemler silinecek.\n\nZ-Raporları korunacaktır.\n\nDevam etmek istiyor musunuz?'
      )
    )
      return
    setIsArchiving(true)
    try {
      const result = await cafeApi.maintenance.archiveOldData()
      setLastResult({
        success: true,
        message: `${result.deletedOrders} sipariş, ${result.deletedItems} ürün, ${result.deletedTransactions} işlem silindi.`
      })
    } catch (error) {
      setLastResult({
        success: false,
        message: error instanceof Error ? error.message : 'Arşivleme başarısız'
      })
    } finally {
      setIsArchiving(false)
    }
  }

  const handleExport = async (format: 'json' | 'csv'): Promise<void> => {
    setIsExporting(true)
    try {
      const result = await cafeApi.maintenance.exportData(format)
      setLastResult({
        success: true,
        message: `${result.count} kayıt dışa aktarıldı: ${result.filepath}`
      })
    } catch (error) {
      setLastResult({
        success: false,
        message: error instanceof Error ? error.message : 'Dışa aktarma başarısız'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleVacuum = async (): Promise<void> => {
    setIsVacuuming(true)
    try {
      await cafeApi.maintenance.vacuum()
      setLastResult({
        success: true,
        message: 'Veritabanı optimize edildi ve dosya boyutu küçültüldü.'
      })
    } catch (error) {
      setLastResult({
        success: false,
        message: error instanceof Error ? error.message : 'Optimizasyon başarısız'
      })
    } finally {
      setIsVacuuming(false)
    }
  }

  const handleBackup = async (): Promise<void> => {
    setIsBacking(true)
    try {
      const result = await cafeApi.maintenance.backup()
      setLastResult({
        success: true,
        message: `Yedek oluşturuldu: ${result.backupPath}`
      })
    } catch (error) {
      setLastResult({
        success: false,
        message: error instanceof Error ? error.message : 'Yedekleme başarısız'
      })
    } finally {
      setIsBacking(false)
    }
  }

  return (
    <Card className="h-full flex flex-col border-0 shadow-none bg-transparent">
      {/* Header Section */}
      <div className="flex-none py-4 px-8 border-b bg-background/50 backdrop-blur z-10 w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Sistem Bakımı</h2>
            <p className="text-sm text-muted-foreground">
              Veritabanı sağlığı ve güvenliği için periyodik işlemler
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Result Banner */}
          {lastResult && (
            <div
              className={cn(
                'p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300',
                lastResult.success
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600'
                  : 'bg-red-500/10 border border-red-500/20 text-red-600'
              )}
            >
              {lastResult.success ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-bold">
                  {lastResult.success ? 'İşlem Başarılı' : 'Hata Oluştu'}
                </p>
                <p className="text-xs opacity-90">{lastResult.message}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLastResult(null)}
                className="h-8 w-8 p-0"
              >
                <span className="sr-only">Kapat</span>
                &times;
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Backup & Export Group */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-2">
                <HardDrive className="w-3 h-3" />
                Veri Güvenliği
              </h3>

              <div className="grid gap-4">
                <div className="p-5 rounded-2xl border bg-card/40 hover:bg-card transition-colors group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <Button
                      onClick={handleBackup}
                      disabled={isBacking}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isBacking ? 'Yedekleniyor...' : 'Yedekle'}
                    </Button>
                  </div>
                  <h4 className="font-bold text-base mb-1">Anlık Manuel Yedek</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Veritabanının tam kopyasını `backups` klasörüne tarih koduyla birlikte şimdi
                    kaydedin.
                  </p>
                </div>

                <div className="p-5 rounded-2xl border bg-card/40 hover:bg-card transition-colors group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500 border border-indigo-500/20">
                      <Download className="w-5 h-5" />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('json')}
                        disabled={isExporting}
                        className="gap-2"
                      >
                        <FileJson className="w-4 h-4 text-orange-500" /> JSON
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('csv')}
                        disabled={isExporting}
                        className="gap-2"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> CSV
                      </Button>
                    </div>
                  </div>
                  <h4 className="font-bold text-base mb-1">Dışa Aktarma</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Sistem verilerini başka uygulamalarda açmak veya arşivlemek için farklı
                    formatlarda indirin.
                  </p>
                </div>
              </div>
            </div>

            {/* Performance & Cleanup Group */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-2">
                <Settings2 className="w-3 h-3" />
                Performans & Temizlik
              </h3>

              <div className="grid gap-4">
                <div className="p-5 rounded-2xl border bg-card/40 hover:bg-card transition-colors group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                      <DatabaseZap className="w-5 h-5" />
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleVacuum}
                      disabled={isVacuuming}
                      size="sm"
                    >
                      {isVacuuming ? 'Çalışıyor...' : 'VACUUM'}
                    </Button>
                  </div>
                  <h4 className="font-bold text-base mb-1">Veritabanı Optimizasyonu</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Kullanılmayan alanı temizler, indeksleri yeniler ve dosya boyutunu küçülterek
                    hızı artırır.
                  </p>
                </div>

                <div className="p-5 rounded-2xl border bg-red-500/5 hover:bg-red-500/10 transition-colors group border-red-500/10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-red-500/10 rounded-xl text-red-500 border border-red-500/20">
                      <Archive className="w-5 h-5" />
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleArchive}
                      disabled={isArchiving}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isArchiving ? 'Temizleniyor...' : 'Verileri Temizle'}
                    </Button>
                  </div>
                  <h4 className="font-bold text-base mb-1 text-red-600">Eski Verileri Arşivle</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    **1 yıldan eski** sipariş ve işlemleri kalıcı olarak siler. Z-Raporlarınız bu
                    işlemden etkilenmez.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="p-6 rounded-2xl bg-muted/30 border border-dashed text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-semibold">Dikkat</span>
            </div>
            <p className="text-xs text-muted-foreground max-w-lg mx-auto">
              Bakım işlemleri genellikle hızlıdır ancak işlem sırasında veritabanı kısa süreliğine
              kilitlenebilir. Özellikle "Verileri Temizleme" işlemi öncesinde mutlaka yedek almanız
              önerilir.
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
