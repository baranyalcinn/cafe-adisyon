import { useEffect } from 'react'
import { toast } from '@/store/useToastStore'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface UpdateInfo {
  version: string
  releaseNotes?: string | Array<{ version: string; note: string }>
  safeToUpdate?: boolean
}

export function UpdateNotifier(): null {
  useEffect(() => {
    // Listen for update available
    const removeAvailableListener = window.electron.ipcRenderer.on(
      'update-available',
      (_event, info: UpdateInfo) => {
        toast({
          title: `Güncelleme Mevcut: v${info.version}`,
          description: 'Yeni sürüm arka planda indiriliyor...',
          duration: 5000
        })
      }
    )

    // Listen for update downloaded
    const removeDownloadedListener = window.electron.ipcRenderer.on(
      'update-downloaded',
      (_event, info: UpdateInfo) => {
        const isSafe = info.safeToUpdate !== false // Default to true if undefined

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
                  onClick={() => window.electron.ipcRenderer.send('restart_app')}
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
      }
    )

    // Listen for update error
    const removeErrorListener = window.electron.ipcRenderer.on(
      'update-error',
      (_event, error: { message: string }) => {
        console.error('Update Error:', error)
        // Optional: Show toast for error only if critical
      }
    )

    return () => {
      removeAvailableListener()
      removeDownloadedListener()
      removeErrorListener()
    }
  }, [])

  return null
}
