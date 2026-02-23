import { Button } from '@/components/ui/button'
import { cafeApi } from '@/lib/api'
import { type UpdateInfo } from '@shared/types'
import { AlertCircle, CheckCircle2, Download, Loader2, RefreshCw } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { toast } from 'sonner'

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

interface UpdateStatusAreaProps {
  status: UpdateStatus
  progress: number
  info: UpdateInfo | null
  onCheck: () => void | Promise<void>
}

export const UpdateStatusArea = ({
  status,
  progress,
  info,
  onCheck
}: UpdateStatusAreaProps): React.JSX.Element => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  const versionText = useMemo(() => (info?.version ? `v${info.version}` : 'Yeni sürüm'), [info])

  const pct = Math.max(0, Math.min(100, Math.round(progress || 0)))

  const handleDownload = async (): Promise<void> => {
    try {
      setIsDownloading(true)
      await Promise.resolve(cafeApi.system.downloadUpdate?.())
    } catch {
      toast.error('İndirme başlatılamadı')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleRestart = async (): Promise<void> => {
    try {
      setIsRestarting(true)
      await Promise.resolve(cafeApi.system.restart())
    } catch {
      toast.error('Yeniden başlatma başarısız')
      setIsRestarting(false)
    }
  }

  const handleRetry = async (): Promise<void> => {
    try {
      setIsRetrying(true)
      await Promise.resolve(onCheck())
    } finally {
      setIsRetrying(false)
    }
  }

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2.5 py-1">
        <RefreshCw className="w-4 h-4 text-primary animate-spin" />
        <p className="text-[13px] font-medium text-muted-foreground">
          Güncellemeler kontrol ediliyor…
        </p>
      </div>
    )
  }

  if (status === 'available') {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/10 shrink-0">
            <Download className="w-4 h-4 text-primary" />
          </div>

          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground">Yeni sürüm hazır</p>
            <p className="text-xs text-muted-foreground truncate">
              {versionText} indirilmeye hazır
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => void handleDownload()}
          disabled={isDownloading}
          className="h-8 px-3.5 rounded-lg text-xs font-medium shrink-0"
        >
          {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'İndir'}
        </Button>
      </div>
    )
  }

  if (status === 'downloading') {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/10 shrink-0">
            <Download className="w-4 h-4 text-primary" />
          </div>

          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground">İndiriliyor</p>
            <p className="text-xs text-primary/70 truncate">{versionText} indiriliyor…</p>
          </div>
        </div>

        <div
          className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Güncelleme indirme ilerlemesi"
        >
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="text-xs text-right text-primary font-semibold">%{pct}</p>
      </div>
    )
  }

  if (status === 'downloaded') {
    return (
      <Button
        onClick={() => void handleRestart()}
        size="sm"
        disabled={isRestarting}
        className="w-full h-10 rounded-xl font-medium text-[13px] flex items-center gap-2"
      >
        {isRestarting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CheckCircle2 className="w-4 h-4" />
        )}
        Yeniden Başlat ve Yükle
      </Button>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/10 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>

          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-rose-600 dark:text-rose-400">
              Güncelleme hatası
            </p>
            <p className="text-xs text-muted-foreground truncate">Tekrar deneyebilirsiniz</p>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={() => void handleRetry()}
          size="sm"
          disabled={isRetrying}
          className="h-8 px-3 text-xs font-medium rounded-lg hover:bg-rose-500/10 shrink-0"
        >
          {isRetrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Tekrar Dene'}
        </Button>
      </div>
    )
  }

  // idle + not-available
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/10 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>

        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground">
            {status === 'not-available' ? 'Sistem Güncel' : 'Güncelleme denetlenmedi'}
          </p>
          <p className="text-xs text-muted-foreground">
            {status === 'not-available' ? 'Yeni sürüm bulunamadı' : 'Manuel olarak kontrol edin'}
          </p>
        </div>
      </div>

      <Button
        variant="ghost"
        onClick={() => void onCheck()}
        size="sm"
        className="h-8 px-3 text-xs font-medium rounded-lg hover:bg-emerald-500/10 shrink-0"
      >
        Denetle
      </Button>
    </div>
  )
}
