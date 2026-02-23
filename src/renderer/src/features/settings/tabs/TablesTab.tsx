import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle
} from '@/components/ui/dialog'
import { useTables } from '@/hooks/useTables'
import { cafeApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from '@/store/useToastStore'
import { AlertTriangle, LayoutGrid, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

export function TablesTab(): React.JSX.Element {
  const { data: tables = [], refetch } = useTables()

  const handleAddTable = async (): Promise<void> => {
    try {
      // Auto-generate table name based on existing tables
      const existingNumbers = tables.map((t) => {
        const match = t.name.match(/\d+/)
        return match ? parseInt(match[0]) : 0
      })
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
      const newTableName = `Masa ${nextNumber}`

      await cafeApi.tables.create(newTableName)
      refetch() // Refresh list
      toast({ title: 'Başarılı', description: 'Yeni masa oluşturuldu', variant: 'success' })
    } catch (error) {
      console.error('Failed to add table:', error)
      toast({
        title: 'Hata',
        description: 'Masa oluşturulamadı: ' + String(error),
        variant: 'destructive'
      })
    }
  }

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    tableId: string | null
    isWarning: boolean
  }>({
    isOpen: false,
    tableId: null,
    isWarning: false
  })

  const handleDeleteTable = async (id: string, force = false): Promise<void> => {
    const table = tables.find((t) => t.id === id)

    if (table?.hasOpenOrder && !force) {
      setDeleteDialog({ isOpen: true, tableId: id, isWarning: true })
      return
    }

    try {
      await cafeApi.tables.delete(id)
      refetch() // Refresh list
      toast({ title: 'Başarılı', description: 'Masa başarıyla silindi', variant: 'success' })
      setDeleteDialog({ isOpen: false, tableId: null, isWarning: false })
    } catch (error) {
      console.error('Failed to delete table:', error)
      toast({
        title: 'Hata',
        description: 'Masa silinemedi: ' + String(error),
        variant: 'destructive'
      })
    }
  }

  return (
    <Card className="h-full flex flex-col border-0 shadow-none bg-zinc-50 dark:bg-zinc-950">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
          {/* Add Table Quick Card */}
          <div
            role="button"
            className="group flex flex-col items-center justify-center aspect-[4/3] rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-100 hover:border-primary hover:bg-white dark:hover:bg-zinc-900 transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1"
            onClick={handleAddTable}
          >
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 border-2 border-transparent group-hover:border-primary/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-sm">
              <Plus className="w-6 h-6 text-zinc-400 group-hover:text-primary" />
            </div>
            <span className="text-xs font-black tracking-tight text-zinc-500 group-hover:text-primary">
              Masa Ekle
            </span>
          </div>

          {/* Table Cards */}
          {tables.map((table) => (
            <div
              key={table.id}
              className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-zinc-900 border-2 shadow-sm hover:shadow-xl hover:-translate-y-1.5 hover:border-primary transition-all duration-300 aspect-[4/3]"
            >
              <div className="flex items-start justify-between">
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-primary border-2 border-transparent group-hover:border-primary/20 transition-colors">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-all bg-white dark:bg-zinc-800 border-2 border-transparent hover:border-destructive hover:bg-destructive shadow-sm hover:text-white"
                  onClick={() => handleDeleteTable(table.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div>
                <h3 className="font-bold text-lg">{table.name}</h3>
                <p
                  className={cn(
                    'text-[10px] font-black tracking-tight',
                    table.hasOpenOrder ? 'text-amber-600' : 'text-emerald-600'
                  )}
                >
                  {table.hasOpenOrder ? 'Dolu / Ürün Var' : 'Boş / Müsait'}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.isOpen}
          onOpenChange={(open) => !open && setDeleteDialog((prev) => ({ ...prev, isOpen: false }))}
        >
          <DialogContent className="sm:max-w-[440px] rounded-3xl border-2 bg-white dark:bg-zinc-950 p-0 overflow-hidden shadow-2xl">
            <div
              className={cn(
                'h-3 w-full',
                deleteDialog.isWarning ? 'bg-amber-500' : 'bg-destructive'
              )}
            />

            <div className="p-8">
              <div className="flex items-center gap-5 mb-6">
                <div
                  className={cn(
                    'p-4 rounded-2xl border-2',
                    deleteDialog.isWarning
                      ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-200 dark:border-amber-900'
                      : 'bg-destructive/5 text-destructive border-destructive/20'
                  )}
                >
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black tracking-tighter">
                    {deleteDialog.isWarning ? 'Dikkat: Masa Dolu!' : 'Masayı Sil'}
                  </DialogTitle>
                  <DialogDescription className="text-zinc-500 font-bold mt-1 italic">
                    Bu işlem geri alınamaz.
                  </DialogDescription>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-5 border-2 border-border/60 mb-8">
                <p className="text-sm font-bold text-foreground leading-relaxed">
                  {deleteDialog.isWarning
                    ? 'Bu masada aktif sipariş ve ürünler bulunmaktadır. Masayı silmek tüm verilerin kaybolmasına neden olabilir. Yine de silmek istiyor musunuz?'
                    : 'Bu masayı silmek istediğinizden emin misiniz?'}
                </p>
              </div>

              <DialogFooter className="flex-row gap-4 sm:gap-0">
                <Button
                  variant="ghost"
                  className="flex-1 h-14 rounded-2xl border-2 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 font-black tracking-tight text-xs"
                  onClick={() =>
                    setDeleteDialog({ isOpen: false, tableId: null, isWarning: false })
                  }
                >
                  Vazgeç
                </Button>
                <Button
                  variant="destructive"
                  className={cn(
                    'flex-1 h-14 rounded-2xl font-black tracking-tight text-xs shadow-lg shadow-destructive/20 border-2 border-transparent',
                    deleteDialog.isWarning ? 'bg-amber-600 hover:bg-amber-700' : ''
                  )}
                  onClick={() =>
                    deleteDialog.tableId && handleDeleteTable(deleteDialog.tableId, true)
                  }
                >
                  {deleteDialog.isWarning ? 'Evet, Yine de Sil' : 'Masayı Sil'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {tables.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <LayoutGrid className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold">Henüz masa yok</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              İşletmenizi yapılandırmak için yukarıdaki butonla veya hızlı ekleme kartı ile yeni
              masalar oluşturun.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
