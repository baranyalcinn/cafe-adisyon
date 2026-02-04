import { Plus, Trash2, LayoutGrid, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle
} from '@/components/ui/dialog'
import { cafeApi } from '@/lib/api'
import { toast } from '@/store/useToastStore'
import { useTables } from '@/hooks/useTables'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function TablesTab(): React.JSX.Element {
  const { data: tables = [], refetch, isLoading } = useTables(false)
  // We can keep useTableStore if needed for other things, but here we just need data.
  // const { tables, addTable, removeTable } = useTableStore() // Removed

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
    <Card className="h-full flex flex-col border-0 shadow-none bg-transparent">
      {/* Header Section */}
      <div className="flex-none py-4 px-8 border-b bg-background/50 backdrop-blur z-10 w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Masa Yönetimi</h2>
            <p className="text-sm text-muted-foreground">
              İşletmenizdeki masaları ekleyin, düzenleyin ve yönetin
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            Yenile
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
          {/* Add Table Quick Card */}
          <div
            role="button"
            className="group flex flex-col items-center justify-center aspect-[4/3] rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer"
            onClick={handleAddTable}
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">
              Masa Ekle
            </span>
          </div>

          {/* Table Cards */}
          {tables.map((table) => (
            <div
              key={table.id}
              className="group relative flex flex-col justify-between p-4 rounded-xl bg-card border shadow-sm hover:shadow-md hover:border-primary/20 transition-all aspect-[4/3]"
            >
              <div className="flex items-start justify-between">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteTable(table.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div>
                <h3 className="font-bold text-lg">{table.name}</h3>
                <p
                  className={cn(
                    'text-[10px] font-black uppercase tracking-wider',
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
          <DialogContent className="sm:max-w-[440px] rounded-3xl border-white/10 bg-background/95 backdrop-blur-xl p-0 overflow-hidden shadow-2xl">
            <div
              className={cn(
                'h-2 w-full',
                deleteDialog.isWarning ? 'bg-amber-500' : 'bg-destructive'
              )}
            />

            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={cn(
                    'p-3 rounded-2xl',
                    deleteDialog.isWarning
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-destructive/10 text-destructive'
                  )}
                >
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black tracking-tight">
                    {deleteDialog.isWarning ? 'Dikkat: Masa Dolu!' : 'Masayı Sil'}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground font-medium mt-1">
                    Bu işlemi geri alamazsınız.
                  </DialogDescription>
                </div>
              </div>

              <div className="bg-muted/30 rounded-2xl p-4 border border-border/50 mb-8">
                <p className="text-sm font-bold text-foreground leading-relaxed">
                  {deleteDialog.isWarning
                    ? 'Bu masada aktif sipariş ve ürünler bulunmaktadır. Masayı silmek tüm verilerin kaybolmasına neden olabilir. Yine de silmek istiyor musunuz?'
                    : 'Bu masayı silmek istediğinizden emin misiniz?'}
                </p>
              </div>

              <DialogFooter className="flex-row gap-3 sm:gap-0">
                <Button
                  variant="ghost"
                  className="flex-1 h-12 rounded-xl border-transparent hover:bg-muted font-bold"
                  onClick={() =>
                    setDeleteDialog({ isOpen: false, tableId: null, isWarning: false })
                  }
                >
                  Vazgeç
                </Button>
                <Button
                  variant="destructive"
                  className={cn(
                    'flex-1 h-12 rounded-xl font-bold shadow-lg shadow-destructive/20',
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
