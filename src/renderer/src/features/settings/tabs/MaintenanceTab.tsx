import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cafeApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  DatabaseZap,
  Download,
  FileJson,
  FileSpreadsheet,
  HardDrive,
  Loader2,
  Settings2,
  X
} from 'lucide-react'
import { useState } from 'react'

interface ActionResult {
  success: boolean
  message: string
}

interface ActionPanelProps {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
  tone?: 'default' | 'danger'
}

function ActionPanel({
  icon,
  title,
  description,
  children,
  tone = 'default'
}: ActionPanelProps): React.JSX.Element {
  const isDanger = tone === 'danger'

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 transition-all duration-200',
        'shadow-sm hover:shadow-md hover:-translate-y-[1px]',
        isDanger
          ? 'border-rose-200/70 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/10'
          : 'border-zinc-200/70 dark:border-zinc-800/80 bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div
          className={cn(
            'p-2.5 rounded-xl border',
            isDanger
              ? 'bg-white dark:bg-zinc-950 border-rose-200/70 dark:border-rose-900/70 text-rose-600'
              : 'bg-zinc-100/70 dark:bg-zinc-800/60 border-zinc-200/70 dark:border-zinc-700/70'
          )}
        >
          {icon}
        </div>

        <div className="shrink-0">{children}</div>
      </div>

      <h4
        className={cn(
          'text-sm font-semibold tracking-tight',
          isDanger ? 'text-rose-700 dark:text-rose-400' : 'text-foreground'
        )}
      >
        {title}
      </h4>

      <p
        className={cn(
          'mt-1.5 text-xs leading-relaxed',
          isDanger ? 'text-rose-900/70 dark:text-rose-300/70' : 'text-muted-foreground'
        )}
      >
        {description}
      </p>
    </div>
  )
}

export function MaintenanceTab(): React.JSX.Element {
  const [isArchiving, setIsArchiving] = useState(false)
  const [exportingFormat, setExportingFormat] = useState<'json' | 'csv' | null>(null)
  const [isVacuuming, setIsVacuuming] = useState(false)
  const [isBacking, setIsBacking] = useState(false)
  const [lastResult, setLastResult] = useState<ActionResult | null>(null)

  const handleArchive = async (): Promise<void> => {
    if (
      !confirm(
        '1 yıldan eski tüm siparişler, giderler ve Z-Raporları silinecek.\n\nBu işlem geri alınamaz.\n\nDevam etmek istiyor musunuz?'
      )
    ) {
      return
    }

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
    setExportingFormat(format)
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
      setExportingFormat(null)
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
    <Card className="h-full flex flex-col border-0 shadow-none bg-zinc-50/70 dark:bg-zinc-950/40">
      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
          {/* Result Banner */}
          {lastResult && (
            <div
              className={cn(
                'rounded-2xl border p-3.5 flex items-start gap-3 animate-in fade-in duration-300',
                lastResult.success
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/10 border-emerald-200/70 dark:border-emerald-900/60'
                  : 'bg-rose-50/80 dark:bg-rose-950/10 border-rose-200/70 dark:border-rose-900/60'
              )}
            >
              <div
                className={cn(
                  'mt-0.5 p-2 rounded-lg border shrink-0',
                  lastResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-600'
                )}
              >
                {lastResult.success ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-semibold tracking-tight',
                    lastResult.success
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-700 dark:text-rose-400'
                  )}
                >
                  {lastResult.success ? 'İşlem başarılı' : 'Hata oluştu'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground break-words leading-relaxed">
                  {lastResult.message}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLastResult(null)}
                className="h-8 w-8 rounded-lg shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Group */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <HardDrive className="w-4 h-4 text-zinc-500" />
                <h3 className="text-xs font-semibold tracking-wide text-zinc-500">
                  Veri Güvenliği
                </h3>
              </div>

              <ActionPanel
                icon={<HardDrive className="w-4 h-4 text-primary" />}
                title="Anlık manuel yedek"
                description="Veritabanının tam kopyasını backups klasörüne tarih bilgisiyle kaydeder."
              >
                <Button
                  onClick={() => void handleBackup()}
                  disabled={isBacking}
                  className="h-9 rounded-xl px-3.5 text-xs font-medium"
                >
                  {isBacking ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Yedekleniyor
                    </>
                  ) : (
                    'Şimdi Yedekle'
                  )}
                </Button>
              </ActionPanel>

              <ActionPanel
                icon={<Download className="w-4 h-4 text-sky-500" />}
                title="Dışa aktarma"
                description="Sistem verilerini arşivlemek veya başka araçlarda açmak için dışa aktarır."
              >
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void handleExport('json')}
                    disabled={Boolean(exportingFormat)}
                    className="h-9 rounded-xl px-3 text-xs font-medium gap-1.5"
                  >
                    {exportingFormat === 'json' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileJson className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    JSON
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => void handleExport('csv')}
                    disabled={Boolean(exportingFormat)}
                    className="h-9 rounded-xl px-3 text-xs font-medium gap-1.5"
                  >
                    {exportingFormat === 'csv' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    CSV
                  </Button>
                </div>
              </ActionPanel>
            </div>

            {/* Right Group */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Settings2 className="w-4 h-4 text-zinc-500" />
                <h3 className="text-xs font-semibold tracking-wide text-zinc-500">
                  Performans ve Temizlik
                </h3>
              </div>

              <ActionPanel
                icon={<DatabaseZap className="w-4 h-4 text-emerald-500" />}
                title="Veritabanı optimizasyonu"
                description="Kullanılmayan alanı temizler, dosya boyutunu düşürür ve veritabanını optimize eder."
              >
                <Button
                  variant="outline"
                  onClick={() => void handleVacuum()}
                  disabled={isVacuuming}
                  className="h-9 rounded-xl px-3.5 text-xs font-medium"
                >
                  {isVacuuming ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Çalışıyor
                    </>
                  ) : (
                    'Optimize Et'
                  )}
                </Button>
              </ActionPanel>

              <ActionPanel
                tone="danger"
                icon={<Archive className="w-4 h-4" />}
                title="Eski verileri arşivle"
                description="1 yıldan eski sipariş, gider ve Z-Raporu kayıtlarını kalıcı olarak siler. İşlem öncesi yedek almanız önerilir."
              >
                <Button
                  variant="destructive"
                  onClick={() => void handleArchive()}
                  disabled={isArchiving}
                  className="h-9 rounded-xl px-3.5 text-xs font-medium"
                >
                  {isArchiving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Temizleniyor
                    </>
                  ) : (
                    'Verileri Temizle'
                  )}
                </Button>
              </ActionPanel>
            </div>
          </div>

          {/* Footer Info */}
          <div
            className={cn(
              'rounded-2xl border border-dashed p-4 text-center',
              'bg-white/70 dark:bg-zinc-900/60 border-zinc-300/70 dark:border-zinc-700/70'
            )}
          >
            <div className="flex items-center justify-center gap-2 text-zinc-500 mb-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-semibold tracking-wide">Güvenlik Uyarısı</span>
            </div>

            <p className="text-xs text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Bakım işlemleri sırasında veritabanı kısa süreliğine kilitlenebilir. Özellikle
              “Verileri Temizle” işleminden önce manuel yedek almanız önerilir.
            </p>
          </div>
        </div>
      </ScrollArea>
    </Card>
  )
}
