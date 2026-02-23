import { Button } from '@/components/ui/button'
import { cafeApi } from '@/lib/api'
import { type UpdateInfo } from '@shared/types'
import { AlertCircle, CheckCircle2, Download, RefreshCw } from 'lucide-react'
import React from 'react'

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
  onCheck: () => void
}

export const UpdateStatusArea = ({
  status,
  progress,
  info,
  onCheck
}: UpdateStatusAreaProps): React.ReactNode => {
  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 py-2">
        <RefreshCw className="w-4 h-4 text-primary animate-spin" />
        <p className="text-[11px] font-semibold text-muted-foreground">
          Güncellemeler kontrol ediliyor...
        </p>
      </div>
    )
  }

  if (status === 'available') {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Download className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold">Yeni sürüm hazır</p>
            <p className="text-[10px] text-muted-foreground truncate">
              v{info?.version} indirilmeye hazır
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => cafeApi.system.downloadUpdate?.()}
          className="h-8 px-3 rounded-lg text-[10px] font-bold"
        >
          İndir
        </Button>
      </div>
    )
  }

  if (status === 'downloading') {
    const pct = Math.round(progress)

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Download className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-bold">İndiriliyor</p>
            <p className="text-[10px] text-primary/70">v{info?.version ?? '-'} indiriliyor...</p>
          </div>
        </div>

        <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="text-[10px] text-right text-primary font-bold">%{pct}</p>
      </div>
    )
  }

  if (status === 'downloaded') {
    return (
      <Button
        onClick={() => cafeApi.system.restart()}
        size="sm"
        className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] flex items-center gap-2"
      >
        <CheckCircle2 className="w-4 h-4" />
        Yeniden Başlat ve Yükle
      </Button>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-500/10 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-rose-600">Güncelleme hatası</p>
            <p className="text-[10px] text-muted-foreground">Tekrar deneyebilirsiniz</p>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={onCheck}
          size="sm"
          className="h-8 px-3 text-[10px] font-bold rounded-lg hover:bg-rose-500/10"
        >
          Tekrar Dene
        </Button>
      </div>
    )
  }

  // idle + not-available
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1.5 bg-emerald-500/10 rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold">Sistem Güncel</p>
          <p className="text-[10px] text-muted-foreground">
            {status === 'not-available' ? 'Yeni sürüm bulunamadı' : 'En son sürümdesiniz'}
          </p>
        </div>
      </div>

      <Button
        variant="ghost"
        onClick={onCheck}
        size="sm"
        className="h-8 px-3 text-[10px] font-bold rounded-lg hover:bg-emerald-500/10"
      >
        Denetle
      </Button>
    </div>
  )
}
