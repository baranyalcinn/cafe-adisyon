import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cafeApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Archive,
  CheckCircle,
  DatabaseZap,
  Download,
  FileJson,
  FileSpreadsheet,
  HardDrive,
  Settings2
} from 'lucide-react'
import { useState } from 'react'

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
        '1 yıldan eski tüm siparişler, giderler ve Z-Raporları silinecek.\n\nBu işlem geri alınamaz.\n\nDevam etmek istiyor musunuz?'
      )
    )
      return
    setIsArchiving(true)
    try {
      const result = await cafeApi.maintenance.archiveOldData()
      setLastResult({
        success: true,
        message: `${result.deletedOrders} sipariş, ${result.deletedItems} ürün, ${result.deletedTransactions} işlem, ${result.deletedExpenses} gider, ${result.deletedSummaries} Z-raporu silindi.`
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
    <Card className="h-full flex flex-col border-0 shadow-none bg-zinc-50 dark:bg-zinc-950">
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-5xl mx-auto space-y-5">
          {/* Result Banner */}
          {lastResult && (
            <div
              className={cn(
                'p-4 rounded-2xl border-2 flex items-center gap-4 animate-in fade-in duration-500 shadow-lg',
                lastResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700'
                  : 'bg-destructive/5 border-destructive/20 text-destructive'
              )}
            >
              {lastResult.success ? (
                <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <CheckCircle className="w-6 h-6" />
                </div>
              ) : (
                <div className="p-2 bg-destructive/10 rounded-lg border border-destructive/20">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-base font-black tracking-tight leading-none mb-1">
                  {lastResult.success ? 'İşlem Başarılı' : 'Hata Oluştu'}
                </p>
                <p className="text-xs font-bold opacity-80">{lastResult.message}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLastResult(null)}
                className="h-9 w-9 p-0 rounded-full hover:bg-black/5"
              >
                <span className="sr-only">Kapat</span>
                &times;
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Backup & Export Group */}
            <div className="space-y-4">
              <h3 className="text-[13px] font-black text-zinc-500 tracking-tight px-1 flex items-center gap-2">
                <HardDrive className="w-3.5 h-3.5" />
                Veri Güvenliği
              </h3>

              <div className="grid gap-4">
                <div className="p-4 rounded-2xl border-2 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl text-primary border-2 border-transparent group-hover:border-primary/20 shadow-sm transition-all group-hover:scale-110">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <Button
                      onClick={handleBackup}
                      disabled={isBacking}
                      className="h-10 px-6 rounded-xl bg-primary text-primary-foreground font-black tracking-tight text-xs shadow-lg shadow-primary/20 active:scale-95 transition-all"
                    >
                      {isBacking ? 'Yedekleniyor...' : 'Şimdi Yedekle'}
                    </Button>
                  </div>
                  <h4 className="font-black text-lg mb-1 tracking-tight">Anlık Manuel Yedek</h4>
                  <p className="text-[13px] font-bold text-zinc-500 leading-relaxed italic">
                    Veritabanının tam kopyasını `backups` klasörüne tarih koduyla birlikte şimdi
                    kaydedin.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border-2 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl text-sky-500 border-2 border-transparent group-hover:border-sky-500/20 shadow-sm transition-all group-hover:scale-110">
                      <Download className="w-5 h-5" />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleExport('json')}
                        disabled={isExporting}
                        className="h-10 px-4 rounded-xl border-2 font-black tracking-tight text-xs gap-2 hover:bg-amber-500/5 hover:border-amber-500/30 hover:text-amber-600 transition-all active:scale-95"
                      >
                        <FileJson className="w-4 h-4 text-amber-500" /> JSON
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleExport('csv')}
                        disabled={isExporting}
                        className="h-10 px-4 rounded-xl border-2 font-black tracking-tight text-xs gap-2 hover:bg-emerald-500/5 hover:border-emerald-500/30 hover:text-emerald-600 transition-all active:scale-95"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> CSV
                      </Button>
                    </div>
                  </div>
                  <h4 className="font-black text-lg mb-1 tracking-tight">Dışa Aktarma</h4>
                  <p className="text-[13px] font-bold text-zinc-500 leading-relaxed italic">
                    Sistem verilerini başka uygulamalarda açmak veya arşivlemek için farklı
                    formatlarda indirin.
                  </p>
                </div>
              </div>
            </div>

            {/* Performance & Cleanup Group */}
            <div className="space-y-4">
              <h3 className="text-[13px] font-black text-zinc-500 tracking-tight px-1 flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5" />
                Performans & Temizlik
              </h3>

              <div className="grid gap-4">
                <div className="p-4 rounded-2xl border-2 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl text-emerald-500 border-2 border-transparent group-hover:border-emerald-500/20 shadow-sm transition-all group-hover:scale-110">
                      <DatabaseZap className="w-5 h-5" />
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleVacuum}
                      disabled={isVacuuming}
                      className="h-10 px-6 rounded-xl border-2 font-black tracking-tight text-xs hover:bg-primary/5 hover:border-primary/30 transition-all active:scale-95"
                    >
                      {isVacuuming ? 'Çalışıyor...' : ' Optimize Et'}
                    </Button>
                  </div>
                  <h4 className="font-black text-lg mb-1 tracking-tight">
                    Veritabanı Optimizasyonu
                  </h4>
                  <p className="text-[13px] font-bold text-zinc-500 leading-relaxed italic">
                    Kullanılmayan alanı temizler, indeksleri yeniler ve dosya boyutunu küçülterek
                    hızı artırır.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border-2 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-white dark:bg-zinc-950 rounded-xl text-rose-600 border-2 border-rose-100 dark:border-rose-900 shadow-sm transition-all group-hover:scale-110">
                      <Archive className="w-5 h-5" />
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleArchive}
                      disabled={isArchiving}
                      className="h-10 px-6 rounded-xl font-black tracking-tight text-xs shadow-lg shadow-destructive/20 active:scale-95 transition-all"
                    >
                      {isArchiving ? 'Temizleniyor...' : 'Verileri Temizle'}
                    </Button>
                  </div>
                  <h4 className="font-black text-lg mb-1 text-rose-700 dark:text-rose-500 tracking-tight">
                    Eski Verileri Arşivle
                  </h4>
                  <p className="text-[13px] font-bold text-rose-900/60 dark:text-rose-400/60 leading-relaxed italic">
                    **1 yıldan eski** sipariş, gider ve Z-Raporu verilerini kalıcı olarak siler.
                    Alanı boşaltır ve performansı artırır.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-800 text-center shadow-inner">
            <div className="flex items-center justify-center gap-3 text-zinc-400 mb-2">
              <AlertTriangle className="w-6 h-6" />
              <span className="text-xs font-black tracking-tight">Güvenlik Uyarısı</span>
            </div>
            <p className="text-[13px] font-bold text-zinc-500 italic max-w-lg mx-auto leading-relaxed">
              Bakım işlemleri genellikle hızlıdır ancak işlem sırasında veritabanı kısa süreliğine
              kilitlenebilir. Özellikle &quot;Verileri Temizleme&quot; işlemi öncesinde mutlaka
              yedek almanız önerilir.
            </p>
          </div>
        </div>
      </ScrollArea>
    </Card>
  )
}
