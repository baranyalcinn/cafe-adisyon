import { Plus, Trash2, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cafeApi } from '@/lib/api'
import { toast } from '@/store/useToastStore'
import { useTables } from '@/hooks/useTables'

export function TablesTab(): React.JSX.Element {
  const { data: tables = [], refetch } = useTables()
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

  const handleDeleteTable = async (id: string): Promise<void> => {
    try {
      await cafeApi.tables.delete(id)
      refetch() // Refresh list
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
                <p className="text-xs text-muted-foreground">Aktif</p>
              </div>
            </div>
          ))}
        </div>

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
