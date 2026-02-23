import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
    <div className="h-full flex flex-row overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Sol Panel: Kategoriler */}
      <div className="w-72 h-full border-r-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_15px_-3px_rgba(0,0,0,0.05)]">
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
      <div className="flex-1 h-full bg-zinc-50 dark:bg-zinc-950/50 overflow-y-auto custom-scrollbar">
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
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl bg-white dark:bg-zinc-950 rounded-2xl [&>button:last-child]:hidden">
          <div className="bg-red-600 p-8 text-white">
            <div className="flex items-center gap-6">
              <div className="flex-none w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center ring-4 ring-white/10 shadow-inner">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-trash-2 text-white"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </div>
              <DialogHeader className="space-y-1.5 text-left">
                <DialogTitle className="text-2xl font-black tracking-tight text-white">
                  Kategoriyi Silinsin mi?
                </DialogTitle>
                <DialogDescription className="text-base text-white/80 font-medium">
                  Bu işlem geri alınamaz
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="p-8 bg-zinc-50 dark:bg-zinc-900/40">
            <p className="text-base text-zinc-600 dark:text-zinc-300 font-medium mb-6">
              Bu kategoriyi sildiğinizde içindeki{' '}
              <b className="text-zinc-900 dark:text-white">tüm ürünler</b> de kalıcı olarak
              silinecektir. Silmek istediğinize emin misiniz?
            </p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                variant="ghost"
                className="rounded-xl font-bold h-12 px-6 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800"
                onClick={() => setDeleteCategoryId(null)}
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                className="rounded-xl font-black h-12 px-8 shadow-sm hover:scale-105 active:scale-95 transition-all bg-red-600 hover:bg-red-700 tracking-tight"
                onClick={confirmDeleteCategory}
              >
                Kalıcı Olarak Sil
              </Button>
            </div>
          </div>
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
        const sanitizedPrice = price.replace(',', '.')
        await cafeApi.products.create({
          name,
          price: Math.round(parseFloat(sanitizedPrice) * 100),
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
          className="group h-[160px] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 rounded-2xl hover:bg-white dark:hover:bg-zinc-800 hover:border-indigo-500 transition-all active:scale-95 shadow-sm"
        >
          <div className="p-3 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 group-hover:text-indigo-600 group-hover:scale-110 transition-colors duration-300">
            <Plus size={24} strokeWidth={3} />
          </div>
          <span className="text-[11px] font-black text-zinc-500 dark:text-zinc-400 group-hover:text-indigo-600 tracking-tight transition-colors">
            Yeni Ürün
          </span>
        </button>
      )
    }

    return (
      <Card className="h-[160px] p-4 rounded-2xl border-2 border-indigo-500 bg-white dark:bg-zinc-800 flex flex-col gap-2 shadow-xl animate-in zoom-in-95 duration-200">
        <Input
          placeholder="Ürün Adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 text-sm font-bold bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 focus:border-indigo-500 focus:ring-0 rounded-lg"
          autoFocus
        />
        <Input
          type="number"
          placeholder="Fiyat ₺"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="h-10 text-sm font-bold bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 focus:border-indigo-500 focus:ring-0 rounded-lg"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <Button
            size="sm"
            onClick={handleAdd}
            className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black shadow-sm tracking-tight"
          >
            Ekle
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsAdding(false)}
            className="h-9 text-xs font-bold rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-white tracking-tight"
          >
            İptal
          </Button>
        </div>
      </Card>
    )
  }
)
