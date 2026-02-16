import { useEffect } from 'react'
import { toast } from '@/store/useToastStore'
import { Button } from '@/components/ui/button'

export function UpdateNotifier(): null {
  useEffect(() => {
    // Listen for update available
    const removeAvailableListener = window.electron.ipcRenderer.on('update-available', () => {
      toast({
        title: 'Güncelleme Mevcut',
        description: 'Yeni bir sürüm indiriliyor...',
        duration: 5000
      })
    })

    // Listen for update downloaded
    const removeDownloadedListener = window.electron.ipcRenderer.on('update-downloaded', () => {
      toast({
        title: 'Güncelleme Hazır',
        description: 'Yüklemek için uygulamayı yeniden başlatın.',
        duration: Infinity, // Keep open until user clicks
        action: (
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={() => window.electron.ipcRenderer.send('restart_app')}
          >
            Yeniden Başlat
          </Button>
        )
      })
    })

    return () => {
      removeAvailableListener()
      removeDownloadedListener()
    }
  }, [])

  return null
}
