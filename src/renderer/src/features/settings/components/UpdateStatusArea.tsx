import { Button } from '@/components/ui/button'
import { cafeApi } from '@/lib/api'
import { type UpdateInfo } from '@shared/types'
import { CheckCircle2, Download, RefreshCw } from 'lucide-react'
import React from 'react'

interface UpdateStatusAreaProps {
  status: string
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
  if (status === 'checking')
    return (
      <div className="flex items-center gap-2 py-3">
        <RefreshCw className="w-4 h-4 text-primary animate-spin" />
        <p className="text-[11px] font-semibold text-muted-foreground">Kontrol ediliyor...</p>
      </div>
    )

  if (status === 'available' || status === 'downloading')
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Download className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-bold">Yeni Sürüm Mevcut</p>
            <p className="text-[10px] text-primary/70">v{info?.version} indiriliyor...</p>
          </div>
        </div>
        <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-right text-primary font-bold">%{progress}</p>
      </div>
    )

  if (status === 'downloaded')
    return (
      <Button
        onClick={() => cafeApi.system.restart()}
        size="sm"
        className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] flex items-center gap-2"
      >
        <CheckCircle2 className="w-4 h-4" /> Yeniden Başlat ve Yükle
      </Button>
    )

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-emerald-500/10 rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div>
          <p className="text-[11px] font-bold">Sistem Güncel</p>
          <p className="text-[10px] text-muted-foreground">En son sürümdesiniz</p>
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
