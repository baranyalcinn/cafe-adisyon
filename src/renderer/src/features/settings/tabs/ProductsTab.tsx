import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useInventory } from '@/hooks/useInventory'
import { cafeApi } from '@/lib/api'
import { toast } from '@/store/useToastStore'
import { Plus } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { CategorySidebar } from './components/CategorySidebar'
import { ProductCard } from './components/ProductCard'

export function ProductsTab(): React.JSX.Element {
  const { products, categories, refetchProducts, refetchCategories } = useInventory()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)

  // İlk kategoriyi otomatik seç
  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id)
    }
  }, [categories, selectedCategoryId])

  const filteredProducts = useMemo(
    () => (selectedCategoryId ? products.filter((p) => p.categoryId === selectedCategoryId) : []),
    [products, selectedCategoryId]
  )

  // --- Kategori İşlemleri ---
  const handleAddCategory = async (name: string): Promise<void> => {
    try {
      await cafeApi.categories.create(name)
      refetchCategories()
    } catch {
      toast({ title: 'Hata', description: 'Kategori eklenemedi', variant: 'destructive' })
    }
  }

  const confirmDeleteCategory = async (): Promise<void> => {
    if (!deleteCategoryId) return
    try {
      await cafeApi.categories.delete(deleteCategoryId)
      if (selectedCategoryId === deleteCategoryId) {
        setSelectedCategoryId(
          categories.length > 1
            ? categories.find((c) => c.id !== deleteCategoryId)?.id || null
            : null
        )
      }
      refetchCategories()
      toast({ title: 'Başarılı', description: 'Kategori ve ürünleri silindi', variant: 'success' })
    } catch {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    } finally {
      setDeleteCategoryId(null)
    }
  }

  // --- Ürün İşlemleri ---
  const handleUpdateProduct = useCallback(
    async (
      id: string,
      data: { name?: string; price?: number; isFavorite?: boolean }
    ): Promise<void> => {
      try {
        await cafeApi.products.update(id, data)
        refetchProducts()
      } catch {
        toast({ title: 'Hata', description: 'Güncellenemedi', variant: 'destructive' })
      }
    },
    [refetchProducts]
  )

  const handleDeleteProduct = useCallback(
    async (id: string): Promise<void> => {
      if (!confirm('Ürünü silmek istediğinize emin misiniz?')) return
      try {
        await cafeApi.products.delete(id)
        refetchProducts()
      } catch {
        toast({ title: 'Hata', description: 'Silinemedi', variant: 'destructive' })
      }
    },
    [refetchProducts]
  )

  return (
    <div className="h-full flex flex-row overflow-hidden bg-background">
      {/* Sol Panel: Kategoriler */}
      <div className="w-72 h-full border-r bg-card/30 z-10">
        <CategorySidebar
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          onAddCategory={handleAddCategory}
          onUpdateCategory={(id, name) =>
            cafeApi.categories.update(id, { name }).then(refetchCategories)
          }
          onDeleteCategory={setDeleteCategoryId}
        />
      </div>

      {/* Sağ Panel: Ürün Grid */}
      <div className="flex-1 h-full bg-muted/10 overflow-y-auto custom-scrollbar">
        <div className="p-8 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {selectedCategoryId && (
              <QuickAddProductCard categoryId={selectedCategoryId} onSuccess={refetchProducts} />
            )}

            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onUpdate={handleUpdateProduct}
                onDelete={handleDeleteProduct}
                onToggleFavorite={(id, cur) =>
                  cafeApi.products.update(id, { isFavorite: !cur }).then(refetchProducts)
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* Kategori Silme Onay */}
      <Dialog open={!!deleteCategoryId} onOpenChange={(open) => !open && setDeleteCategoryId(null)}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>Kategori Silinsin Mi?</DialogTitle>
            <DialogDescription>
              Bu kategoriyi sildiğinizde içindeki <b>tüm ürünler</b> de kalıcı olarak silinecektir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteCategoryId(null)}>
              İptal
            </Button>
            <Button variant="destructive" className="rounded-xl" onClick={confirmDeleteCategory}>
              Kategoriyi Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==========================================
// ALT BİLEŞEN: HIZLI ÜRÜN EKLEME KARTI
// ==========================================
const QuickAddProductCard = memo(
  ({ categoryId, onSuccess }: { categoryId: string; onSuccess: () => void }) => {
    const [isAdding, setIsAdding] = useState(false)
    const [name, setName] = useState('')
    const [price, setPrice] = useState('')

    const handleAdd = async (): Promise<void> => {
      if (!name.trim() || !price) return
      try {
        await cafeApi.products.create({
          name,
          price: Math.round(parseFloat(price) * 100),
          categoryId,
          isFavorite: false
        })
        onSuccess()
        setName('')
        setPrice('')
        setIsAdding(false)
        toast({ title: 'Başarılı', description: 'Ürün eklendi', variant: 'success' })
      } catch {
        toast({ title: 'Hata', description: 'Eklenemedi', variant: 'destructive' })
      }
    }

    if (!isAdding) {
      return (
        <button
          onClick={() => setIsAdding(true)}
          className="group h-[160px] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-emerald-500/20 bg-emerald-500/[0.02] rounded-[2rem] hover:bg-emerald-500/[0.05] hover:border-emerald-500/40 transition-all active:scale-95"
        >
          <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600 group-hover:scale-110 transition-transform">
            <Plus size={24} strokeWidth={3} />
          </div>
          <span className="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.2em]">
            YENİ ÜRÜN
          </span>
        </button>
      )
    }

    return (
      <Card className="h-[160px] p-4 rounded-[2rem] border-emerald-500/30 bg-emerald-500/[0.03] flex flex-col gap-2 animate-in zoom-in-95 duration-200">
        <Input
          placeholder="Ürün Adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-sm bg-background border-emerald-500/20"
          autoFocus
        />
        <Input
          type="number"
          placeholder="Fiyat ₺"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="h-8 text-sm bg-background border-emerald-500/20"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <Button
            size="sm"
            onClick={handleAdd}
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
          >
            EKLE
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsAdding(false)}
            className="h-8 text-xs font-bold"
          >
            İPTAL
          </Button>
        </div>
      </Card>
    )
  }
)
