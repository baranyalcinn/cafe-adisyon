import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { cafeApi, type Category, type Product } from '@/lib/api'
import { toast } from '@/store/useToastStore'

interface CategoriesTabProps {
  categories: Category[]
  products: Product[] // Needed for counting products per category
  onRefresh: () => Promise<void>
}

export function CategoriesTab({
  categories,
  products,
  onRefresh
}: CategoriesTabProps): React.JSX.Element {
  const [newCategoryName, setNewCategoryName] = useState('')
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false)

  const handleAddCategory = async (): Promise<void> => {
    if (!newCategoryName.trim()) {
      toast({ title: 'Uyarı', description: 'Lütfen bir kategori adı girin', variant: 'warning' })
      return
    }
    try {
      await cafeApi.categories.create(newCategoryName)
      setNewCategoryName('')
      await onRefresh()
      toast({ title: 'Başarılı', description: 'Kategori başarıyla eklendi', variant: 'success' })
    } catch (error) {
      console.error('Failed to add category:', error)
      toast({
        title: 'Hata',
        description: 'Kategori eklenirken hata oluştu: ' + String(error),
        variant: 'destructive'
      })
    }
  }

  const handleDeleteCategory = (id: string): void => {
    setDeleteCategoryId(id)
    setShowDeleteCategoryDialog(true)
  }

  const confirmDeleteCategory = async (): Promise<void> => {
    if (!deleteCategoryId) return
    try {
      await cafeApi.categories.delete(deleteCategoryId)
      await onRefresh()
    } catch (error) {
      console.error('Failed to delete category:', error)
      toast({
        title: 'Hata',
        description: 'Kategori silinemedi: ' + String(error),
        variant: 'destructive'
      })
    } finally {
      setShowDeleteCategoryDialog(false)
      setDeleteCategoryId(null)
    }
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Kategori Yönetimi</CardTitle>
              <CardDescription>Kategorileri ve simgelerini yönetin</CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Yeni kategori..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-48"
              />
              <Button onClick={handleAddCategory}>
                <Plus className="w-4 h-4 mr-2" />
                Ekle
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-[400px]">
            <div className="divide-y divide-border/50 pr-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="group flex items-center justify-between py-4 px-3 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-lg">
                        {cat.icon === 'coffee' && '☕'}
                        {cat.icon === 'ice-cream-cone' && '🍦'}
                        {cat.icon === 'cookie' && '🍪'}
                        {cat.icon === 'utensils' && '🍽️'}
                        {cat.icon === 'wine' && '🍷'}
                        {cat.icon === 'cake' && '🎂'}
                        {cat.icon === 'sandwich' && '🥪'}
                        {!cat.icon && '🍽️'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">{cat.name}</span>
                      <p className="text-xs text-muted-foreground">
                        {products.filter((p) => p.categoryId === cat.id).length} ürün
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <select
                      className="bg-muted rounded px-2 py-1 text-sm"
                      value={cat.icon || 'utensils'}
                      onChange={async (e) => {
                        await cafeApi.categories.update(cat.id, { icon: e.target.value })
                        await onRefresh()
                      }}
                    >
                      <option value="coffee">☕</option>
                      <option value="ice-cream-cone">🍦</option>
                      <option value="cookie">🍪</option>
                      <option value="utensils">🍽️</option>
                      <option value="wine">🍷</option>
                      <option value="cake">🎂</option>
                      <option value="sandwich">🥪</option>
                    </select>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleDeleteCategory(cat.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  Henüz kategori yok. &quot;Ekle&quot; butonuna tıklayın.
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={showDeleteCategoryDialog} onOpenChange={setShowDeleteCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategori Silinsin Mi?</DialogTitle>
            <DialogDescription>
              Bu kategoriyi sildiğinizde içindeki tüm ürünler de silinecektir. Bu işlem geri
              alınamaz. Onaylıyor musunuz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteCategoryDialog(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={confirmDeleteCategory}>
              Kategoriyi Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
