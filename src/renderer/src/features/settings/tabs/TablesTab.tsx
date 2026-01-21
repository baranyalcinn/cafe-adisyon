import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cafeApi, type Table } from '@/lib/api'
import { toast } from '@/store/useToastStore'
import { useTableStore } from '@/store/useTableStore'

interface TablesTabProps {
  tables: Table[]
  onRefresh: () => Promise<void>
}

export function TablesTab({ tables, onRefresh }: TablesTabProps): React.JSX.Element {
  const { refreshTableStatus } = useTableStore()

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
      await onRefresh()
      refreshTableStatus()
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
      await onRefresh()
      refreshTableStatus()
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Masalar ({tables.length})</CardTitle>
          <CardDescription>Masa ekle veya sil</CardDescription>
        </div>
        <Button onClick={handleAddTable} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Yeni Masa Ekle
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {tables.map((table) => (
            <div
              key={table.id}
              className="group flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-accent transition-colors"
            >
              <span className="font-medium">{table.name}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                onClick={() => handleDeleteTable(table.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        {tables.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            Henüz masa yok. &quot;Yeni Masa Ekle&quot; butonuna tıklayın.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
