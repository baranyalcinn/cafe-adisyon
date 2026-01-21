import { useState } from 'react'
import { Archive, Download, DatabaseZap, HardDrive, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cafeApi } from '@/lib/api'

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
    ) {
      return
    }

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
    <div className="space-y-6">
      {/* Result Message */}
      {lastResult && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            lastResult.success
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600'
              : 'bg-red-500/10 border border-red-500/20 text-red-600'
          }`}
        >
          {lastResult.success ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm">{lastResult.message}</span>
        </div>
      )}

      {/* Archive Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5" />
            Veri Arşivleme
          </CardTitle>
          <CardDescription>
            1 yıldan eski siparişleri ve işlemleri silerek veritabanını temizleyin. Z-Raporları
            korunur.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button
            variant="destructive"
            onClick={handleArchive}
            disabled={isArchiving}
            className="gap-2"
          >
            <Archive className="w-4 h-4" />
            {isArchiving ? 'Arşivleniyor...' : '1 Yıldan Eski Verileri Temizle'}
          </Button>
        </CardContent>
      </Card>

      {/* Export Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Veri Dışa Aktarma
          </CardTitle>
          <CardDescription>Eski verileri silmeden önce yedek olarak dışa aktarın.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Aktarılıyor...' : 'JSON Olarak İndir'}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Aktarılıyor...' : 'CSV Olarak İndir'}
          </Button>
        </CardContent>
      </Card>

      {/* Database Health Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseZap className="w-5 h-5" />
            Veritabanı Sağlığı
          </CardTitle>
          <CardDescription>Veritabanını optimize edin ve dosya boyutunu küçültün.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button variant="outline" onClick={handleVacuum} disabled={isVacuuming} className="gap-2">
            <DatabaseZap className="w-4 h-4" />
            {isVacuuming ? 'Optimize Ediliyor...' : 'VACUUM Çalıştır'}
          </Button>
        </CardContent>
      </Card>

      {/* Backup Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Manuel Yedekleme
          </CardTitle>
          <CardDescription>
            Veritabanının anlık yedeğini backups klasörüne kaydedin.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button variant="outline" onClick={handleBackup} disabled={isBacking} className="gap-2">
            <HardDrive className="w-4 h-4" />
            {isBacking ? 'Yedekleniyor...' : 'Şimdi Yedekle'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
