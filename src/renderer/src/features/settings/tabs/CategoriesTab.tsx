import { useState } from 'react'
import { Plus, Trash2, Tag, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { cafeApi } from '@/lib/api'
import { useInventory } from '@/hooks/useInventory'
import { toast } from '@/store/useToastStore'

export function CategoriesTab(): React.JSX.Element {
  const { categories, products, refetchCategories } = useInventory()
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
      refetchCategories()
      setNewCategoryName('')
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
      refetchCategories()
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
    <Card className="h-full flex flex-col border-0 shadow-none bg-transparent">
      {/* Header Section */}
      <div className="flex-none py-4 px-8 border-b bg-background/50 backdrop-blur z-10 w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Kategori Yönetimi</h2>
            <p className="text-sm text-muted-foreground">
              Kategorileri ve görsel simgelerini düzenleyin
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Input
                placeholder="Yeni kategori adı..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-48 h-9"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
            </div>
            <Button onClick={handleAddCategory} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Ekle
            </Button>
          </div>
        </div>
      </div>

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="group flex items-center justify-between p-4 rounded-xl border bg-card/50 hover:bg-card hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <span className="text-xl">
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
                  <h3 className="font-bold text-base">{cat.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <Layers className="w-3 h-3" />
                    <span>
                      {products.filter((p) => p.categoryId === cat.id).length} Ürün Mevcut
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-medium text-muted-foreground">Simge:</span>
                  <select
                    className="bg-muted border rounded-md px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
                    value={cat.icon || 'utensils'}
                    onChange={async (e) => {
                      await cafeApi.categories.update(cat.id, {
                        icon: e.target.value
                      })
                      refetchCategories()
                    }}
                  >
                    <option value="coffee">☕ Kahveler</option>
                    <option value="ice-cream-cone">🍦 Tatlılar</option>
                    <option value="cookie">🍪 Atıştırmalık</option>
                    <option value="utensils">🍽️ Yemekler</option>
                    <option value="wine">🍷 İçecekler</option>
                    <option value="cake">🎂 Pastalar</option>
                    <option value="sandwich">🥪 Sandviçler</option>
                  </select>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteCategory(cat.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-2xl">
              <Tag className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold">Henüz kategori yok</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Üst taraftaki kutudan yeni kategori oluşturun.
              </p>
            </div>
          )}
        </div>
      </div>

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
    </Card>
  )
}
