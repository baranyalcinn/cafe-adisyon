import { Button } from '@/components/ui/button'
import { toast } from '@/store/useToastStore'
import { type UpdateInfo } from '@shared/types'
import { AlertTriangle } from 'lucide-react'
import { useEffect } from 'react'

export function UpdateNotifier(): null {
  useEffect(() => {
    // Listen for update available
    const removeAvailableListener = window.api.on('update-available', (info: unknown) => {
      const updateInfo = info as UpdateInfo
      toast({
        title: `Güncelleme Mevcut: v${updateInfo.version}`,
        description: 'Yeni sürüm arka planda indiriliyor...',
        duration: 5000
      })
    })

    // Listen for update downloaded
    const removeDownloadedListener = window.api.on('update-downloaded', (info: unknown) => {
      const updateInfo = info as UpdateInfo
      const isSafe = updateInfo.safeToUpdate !== false

      toast({
        title: 'Güncelleme Hazır',
        description: isSafe
          ? 'Yüklemek için uygulamayı yeniden başlatın.'
          : 'Açık siparişleriniz olduğu için şu an güncellenemez.',
        duration: Infinity,
        variant: isSafe ? 'default' : 'destructive',
        action: (
          <div className="flex flex-col gap-2 w-full">
            {isSafe ? (
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() => window.api.system.restart()}
              >
                Yeniden Başlat
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-xs bg-destructive/20 p-2 rounded text-destructive-foreground">
                <AlertTriangle className="w-4 h-4" />
                <span>Siparişleri tamamladıktan sonra kapatıp açın.</span>
              </div>
            )}
          </div>
        )
      })
    })

    // Listen for update error
    const removeErrorListener = window.api.on('update-error', (error: unknown) => {
      console.error('Update Error:', error)
    })

    return () => {
      removeAvailableListener()
      removeDownloadedListener()
      removeErrorListener()
    }
  }, [])

  return null
}
