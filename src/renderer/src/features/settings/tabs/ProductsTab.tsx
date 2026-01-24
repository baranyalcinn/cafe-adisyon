import { useState, useMemo, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cafeApi } from '@/lib/api'
import { useInventoryStore } from '@/store/useInventoryStore'
import { toast } from '@/store/useToastStore'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { CategorySidebar } from './components/CategorySidebar'
import { ProductCard } from './components/ProductCard'
import { Input } from '@/components/ui/input'

export function ProductsTab(): React.JSX.Element {
  const products = useInventoryStore((state) => state.products)
  const categories = useInventoryStore((state) => state.categories)
  const addProduct = useInventoryStore((state) => state.addProduct)
  const updateProduct = useInventoryStore((state) => state.updateProduct)
  const removeProduct = useInventoryStore((state) => state.removeProduct)
  const addCategory = useInventoryStore((state) => state.addCategory)
  const updateCategory = useInventoryStore((state) => state.updateCategory)
  const removeCategory = useInventoryStore((state) => state.removeCategory)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  // Category Delete State
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false)

  // Quick Add State (Local to the grid card)
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [newProductPrice, setNewProductPrice] = useState('')

  // Initialize selected category if needed
  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id)
    }
  }, [categories, selectedCategoryId])

  const filteredProducts = useMemo(() => {
    return selectedCategoryId ? products.filter((p) => p.categoryId === selectedCategoryId) : []
  }, [products, selectedCategoryId])

  // --- Category Handlers ---
  const handleAddCategory = async (name: string): Promise<void> => {
    try {
      const category = await cafeApi.categories.create(name)
      addCategory(category)
    } catch {
      toast({ title: 'Hata', description: 'Kategori eklenemedi', variant: 'destructive' })
    }
  }

  const handleUpdateCategory = async (id: string, name: string): Promise<void> => {
    try {
      const category = await cafeApi.categories.update(id, { name })
      updateCategory(category)
    } catch {
      toast({ title: 'Hata', description: 'Kategori güncellenemedi', variant: 'destructive' })
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
      removeCategory(deleteCategoryId)
      toast({ title: 'Başarılı', description: 'Kategori silindi', variant: 'success' })
    } catch {
      toast({ title: 'Hata', description: 'Kategori silinemedi', variant: 'destructive' })
    } finally {
      setShowDeleteCategoryDialog(false)
      setDeleteCategoryId(null)
    }
  }

  // --- Product Handlers ---
  const handleAddProduct = async (): Promise<void> => {
    if (!newProductName.trim() || !newProductPrice || !selectedCategoryId) return
    try {
      const product = await cafeApi.products.create({
        name: newProductName,
        price: Math.round(parseFloat(newProductPrice) * 100),
        categoryId: selectedCategoryId,
        isFavorite: false
      })
      addProduct(product)
      setNewProductName('')
      setNewProductPrice('')
      setIsAddingProduct(false)
      toast({ title: 'Başarılı', description: 'Ürün eklendi', variant: 'success' })
    } catch {
      toast({ title: 'Hata', description: 'Ürün eklenemedi', variant: 'destructive' })
    }
  }

  const handleUpdateProduct = async (
    id: string,
    data: { name: string; price: number }
  ): Promise<void> => {
    try {
      const product = await cafeApi.products.update(id, data)
      updateProduct(product)
      toast({ title: 'Başarılı', description: 'Ürün güncellendi', variant: 'success' })
    } catch {
      toast({ title: 'Hata', description: 'Ürün güncellenemedi', variant: 'destructive' })
    }
  }

  const handleDeleteProduct = async (id: string): Promise<void> => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return
    try {
      await cafeApi.products.delete(id)
      removeProduct(id)
      toast({ title: 'Başarılı', description: 'Ürün silindi', variant: 'success' })
    } catch {
      toast({ title: 'Hata', description: 'Ürün silinemedi', variant: 'destructive' })
    }
  }

  const handleToggleFavorite = async (id: string, current: boolean): Promise<void> => {
    try {
      const product = await cafeApi.products.update(id, { isFavorite: !current })
      updateProduct(product)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <>
      <Card className="h-full flex flex-row overflow-hidden border-0 shadow-none bg-transparent">
        {/* Left Sidebar */}
        <div className="w-64 h-full bg-background border-r flex-shrink-0 z-10">
          <CategorySidebar
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        </div>

        {/* Right Content */}
        <div className="flex-1 h-full bg-background flex flex-col">
          {/* Header / Context Bar */}
          <div className="h-14 border-b bg-background/50 backdrop-blur px-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">
                {categories.find((c) => c.id === selectedCategoryId)?.name || 'Kategori Seçin'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {filteredProducts.length} Ürün listeleniyor
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
              {/* Add Product Card */}
              {selectedCategoryId && (
                <div
                  className={`group flex flex-col justify-center items-center p-4 border-2 border-dashed rounded-2xl bg-muted/20 hover:bg-muted/40 transition-all duration-200 cursor-pointer min-h-[140px] ${isAddingProduct ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'}`}
                  onClick={() => !isAddingProduct && setIsAddingProduct(true)}
                >
                  {isAddingProduct ? (
                    <div
                      className="w-full space-y-3 animate-in fade-in zoom-in-95"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-xs font-bold text-primary uppercase text-center">
                        Yeni Ürün Ekle
                      </p>
                      <Input
                        placeholder="Ürün Adı"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        className="h-8 text-sm bg-background"
                        autoFocus
                      />
                      <Input
                        type="number"
                        placeholder="Fiyat ₺"
                        value={newProductPrice}
                        onChange={(e) => setNewProductPrice(e.target.value)}
                        className="h-8 text-sm bg-background"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddProduct()
                          if (e.key === 'Escape') setIsAddingProduct(false)
                        }}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" className="h-8 text-xs" onClick={handleAddProduct}>
                          Ekle
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => setIsAddingProduct(false)}
                        >
                          İptal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Plus className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <span className="font-bold text-sm text-muted-foreground">
                        Yeni Ürün Ekle
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Product Cards */}
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onUpdate={handleUpdateProduct}
                  onDelete={handleDeleteProduct}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Dialogs */}
      <Dialog open={showDeleteCategoryDialog} onOpenChange={setShowDeleteCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategori Silinsin Mi?</DialogTitle>
            <DialogDescription>
              Bu kategoriyi sildiğinizde içindeki tüm ürünler de silinecektir.
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
