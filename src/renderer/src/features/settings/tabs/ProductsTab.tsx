import { useState, useMemo } from 'react'
import { Plus, Pencil, Check, X, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cafeApi, type Category, type Product } from '@/lib/api'
import { toast } from '@/store/useToastStore'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'

interface ProductsTabProps {
  products: Product[]
  categories: Category[]
  onRefresh: () => Promise<void>
}

export function ProductsTab({
  products,
  categories,
  onRefresh
}: ProductsTabProps): React.JSX.Element {
  const [newProductName, setNewProductName] = useState('')
  const [newProductPrice, setNewProductPrice] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  // Category Editing State
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false)

  // Product Editing State
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editName, setEditName] = useState('')

  // Initialize selected category if needed
  if (!selectedCategoryId && categories.length > 0) {
    setSelectedCategoryId(categories[0].id)
  }

  const filteredProducts = useMemo(() => {
    return selectedCategoryId
      ? products.filter((p) => p.categoryId === selectedCategoryId)
      : products
  }, [products, selectedCategoryId])

  const startEditingCategory = (category: Category): void => {
    setEditingCategoryId(category.id)
    setEditCategoryName(category.name)
  }

  const handleUpdateCategory = async (id: string): Promise<void> => {
    if (!editCategoryName.trim()) return
    try {
      await cafeApi.categories.update(id, { name: editCategoryName })
      setEditingCategoryId(null)
      await onRefresh()
    } catch (error) {
      console.error('Failed to update category:', error)
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
      if (selectedCategoryId === deleteCategoryId) {
        setSelectedCategoryId(categories.length > 1 ? categories[0].id : null)
      }
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

  const handleAddProduct = async (): Promise<void> => {
    if (!newProductName.trim() || !newProductPrice || !selectedCategoryId) return
    try {
      await cafeApi.products.create({
        name: newProductName,
        price: Math.round(parseFloat(newProductPrice) * 100),
        categoryId: selectedCategoryId,
        isFavorite: false
      })
      setNewProductName('')
      setNewProductPrice('')
      await onRefresh()
      toast({ title: 'Başarılı', description: 'Ürün başarıyla eklendi', variant: 'success' })
    } catch (error) {
      console.error('Failed to add product:', error)
      toast({
        title: 'Hata',
        description: 'Ürün eklenemedi: ' + String(error),
        variant: 'destructive'
      })
    }
  }

  const handleUpdateProduct = async (id: string): Promise<void> => {
    if (!editPrice || !editName.trim()) return
    try {
      await cafeApi.products.update(id, {
        name: editName,
        price: Math.round(parseFloat(editPrice) * 100)
      })
      setEditingProductId(null)
      setEditPrice('')
      setEditName('')
      await onRefresh()
    } catch (error) {
      console.error('Failed to update product:', error)
      toast({
        title: 'Hata',
        description: 'Ürün güncellenemedi',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteProduct = async (id: string): Promise<void> => {
    try {
      await cafeApi.products.delete(id)
      await onRefresh()
    } catch (error) {
      console.error('Failed to delete product:', error)
      toast({
        title: 'Hata',
        description: 'Ürün silinemedi: ' + String(error),
        variant: 'destructive'
      })
    }
  }

  const handleToggleFavorite = async (id: string, currentStatus: boolean): Promise<void> => {
    try {
      await cafeApi.products.update(id, { isFavorite: !currentStatus })
      await onRefresh()
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ürün Yönetimi</CardTitle>
              <CardDescription>Kategori ve ürünleri yönetin</CardDescription>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                  selectedCategoryId === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                {editingCategoryId === cat.id ? (
                  <>
                    <Input
                      value={editCategoryName}
                      onChange={(e) => setEditCategoryName(e.target.value)}
                      className="h-6 w-32 px-1 py-0 text-sm bg-background text-foreground"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateCategory(cat.id)
                        if (e.key === 'Escape') setEditingCategoryId(null)
                      }}
                    />
                    <button
                      className="p-1 hover:text-green-500 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUpdateCategory(cat.id)
                      }}
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      className="p-1 hover:text-red-500 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingCategoryId(null)
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <span>{cat.name}</span>
                    <span className="text-xs opacity-70">
                      ({products.filter((p) => p.categoryId === cat.id).length})
                    </span>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                      <button
                        className="p-1 hover:text-primary transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          startEditingCategory(cat)
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        className="p-1 hover:text-destructive transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCategory(cat.id)
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-muted-foreground text-sm">Kategori ekleyin</p>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto">
          {/* Add Product Form */}
          {selectedCategoryId && (
            <div className="flex gap-2 mb-4 p-3 bg-muted rounded-lg">
              <Input
                placeholder="Ürün adı..."
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="₺ Fiyat"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
                className="w-28"
              />
              <Button onClick={handleAddProduct} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Ekle
              </Button>
            </div>
          )}

          {/* Products List */}
          <ScrollArea className="h-[400px]">
            <div className="divide-y divide-border/50 pr-3">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="group flex items-center justify-between py-4 px-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 mr-4">
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    {editingProductId === product.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 max-w-[200px]"
                        placeholder="Ürün adı"
                      />
                    ) : (
                      <span className="font-medium">{product.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingProductId === product.id ? (
                      <>
                        <Input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-24 h-8"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-emerald-500"
                          onClick={() => handleUpdateProduct(product.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingProductId(null)
                            setEditPrice('')
                            setEditName('')
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-primary font-semibold mr-2">
                          {formatCurrency(product.price)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-7 w-7 transition-colors ${
                            product.isFavorite
                              ? 'text-yellow-500 hover:text-yellow-600 opacity-100'
                              : 'opacity-0 group-hover:opacity-100'
                          }`}
                          onClick={() => handleToggleFavorite(product.id, product.isFavorite)}
                        >
                          <Star className={`w-4 h-4 ${product.isFavorite ? 'fill-current' : ''}`} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setEditingProductId(product.id)
                            setEditPrice((product.price / 100).toFixed(2))
                            setEditName(product.name)
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && selectedCategoryId && (
                <p className="text-muted-foreground text-center py-8">
                  Bu kategoride henüz ürün yok
                </p>
              )}
              {!selectedCategoryId && (
                <p className="text-muted-foreground text-center py-8">
                  Ürünleri görmek için bir kategori seçin
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Delete Category Confirmation Dialog */}
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
