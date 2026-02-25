'use client'

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
import { Plus, Trash2 } from 'lucide-react'
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { CategorySidebar } from './components/CategorySidebar'
import { ProductCard } from './components/ProductCard'

interface ProductUpdateData {
  name?: string
  price?: number
  isFavorite?: boolean
}

// ============================================================================
// Styles
// ============================================================================

const STYLES = {
  container: 'h-full flex flex-row overflow-hidden bg-zinc-50 dark:bg-zinc-950',
  sidebarWrap:
    'w-72 h-full border-r-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_15px_-3px_rgba(0,0,0,0.05)]',
  gridArea: 'flex-1 h-full bg-zinc-50 dark:bg-zinc-950/50 overflow-y-auto custom-scrollbar',
  gridPadding: 'p-8 pb-24',
  productGrid:
    'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6',

  // Quick Add Card
  quickAddBtn:
    'group h-[160px] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 rounded-2xl hover:bg-white dark:hover:bg-zinc-800 hover:border-indigo-500 transition-all active:scale-95 shadow-sm',
  quickAddIcon:
    'p-3 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 group-hover:text-indigo-600 group-hover:scale-110 transition-colors duration-300',
  quickAddInput:
    'h-10 text-sm font-bold bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 focus:border-indigo-500 focus:ring-0 rounded-lg',

  // Dialog
  dialogRedHeader: 'bg-red-600 p-8 text-white',
  dialogIconBox:
    'flex-none w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center ring-4 ring-white/10 shadow-inner'
} as const

// ============================================================================
// Sub-Components
// ============================================================================

/** * Kategori Silme Onay Diyaloğu
 */
const DeleteCategoryDialog = memo(
  ({
    categoryId,
    onClose,
    onConfirm
  }: {
    categoryId: string | null
    onClose: () => void
    onConfirm: () => Promise<void>
  }): React.JSX.Element => (
    <Dialog open={!!categoryId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl bg-white dark:bg-zinc-950 rounded-2xl [&>button:last-child]:hidden">
        <div className={STYLES.dialogRedHeader}>
          <div className="flex items-center gap-6">
            <div className={STYLES.dialogIconBox}>
              <Trash2 size={32} strokeWidth={2.5} className="text-white" />
            </div>
            <DialogHeader className="space-y-1.5 text-left">
              <DialogTitle className="text-2xl font-black tracking-tight text-white">
                Kategoriyi Sil?
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
            silinecektir.
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button variant="ghost" className="rounded-xl font-bold h-12 px-6" onClick={onClose}>
              İptal
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl font-black h-12 px-8 shadow-sm hover:scale-105 transition-all"
              onClick={onConfirm}
            >
              Kalıcı Olarak Sil
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
)
DeleteCategoryDialog.displayName = 'DeleteCategoryDialog'

/** * Hızlı Ürün Ekleme Kartı
 */
const QuickAddProductCard = memo(
  ({ categoryId, onSuccess }: { categoryId: string; onSuccess: () => void }): React.JSX.Element => {
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
        <button onClick={() => setIsAdding(true)} className={STYLES.quickAddBtn}>
          <div className={STYLES.quickAddIcon}>
            <Plus size={24} strokeWidth={3} />
          </div>
          <span className="text-[11px] font-black text-zinc-500 tracking-tight">Yeni Ürün</span>
        </button>
      )
    }

    return (
      <Card className="h-[160px] p-4 rounded-2xl border-2 border-indigo-500 flex flex-col gap-2 shadow-xl animate-in zoom-in-95 duration-200">
        <Input
          placeholder="Ürün Adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={STYLES.quickAddInput}
          autoFocus
        />
        <Input
          type="number"
          placeholder="Fiyat ₺"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={STYLES.quickAddInput}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <Button size="sm" onClick={handleAdd} className="h-9 bg-indigo-600 font-black">
            Ekle
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsAdding(false)}
            className="h-9 font-bold text-zinc-500"
          >
            İptal
          </Button>
        </div>
      </Card>
    )
  }
)
QuickAddProductCard.displayName = 'QuickAddProductCard'

// ============================================================================
// Main Component
// ============================================================================

export function ProductsTab(): React.JSX.Element {
  const { products, categories, refetchProducts, refetchCategories } = useInventory()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)

  // İlk kategoriyi akıllıca seç
  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id)
    }
  }, [categories, selectedCategoryId])

  const filteredProducts = useMemo(
    () => (selectedCategoryId ? products.filter((p) => p.categoryId === selectedCategoryId) : []),
    [products, selectedCategoryId]
  )

  // --- Handlers ---

  const handleAddCategory = useCallback(
    async (name: string): Promise<void> => {
      try {
        await cafeApi.categories.create(name)
        refetchCategories()
      } catch {
        toast({ title: 'Hata', description: 'Kategori eklenemedi', variant: 'destructive' })
      }
    },
    [refetchCategories]
  )

  const confirmDeleteCategory = useCallback(async (): Promise<void> => {
    if (!deleteCategoryId) return
    try {
      await cafeApi.categories.delete(deleteCategoryId)
      if (selectedCategoryId === deleteCategoryId) {
        setSelectedCategoryId(categories.find((c) => c.id !== deleteCategoryId)?.id || null)
      }
      refetchCategories()
      toast({ title: 'Başarılı', description: 'Kategori silindi', variant: 'success' })
    } catch {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    } finally {
      setDeleteCategoryId(null)
    }
  }, [deleteCategoryId, selectedCategoryId, categories, refetchCategories])

  const handleUpdateProduct = useCallback(
    async (id: string, data: ProductUpdateData): Promise<void> => {
      try {
        // cafeApi artık 'any' yerine tam olarak ne gönderildiğini biliyor
        await cafeApi.products.update(id, data)
        refetchProducts()
      } catch (error) {
        console.error('Ürün güncelleme hatası:', error)
        toast({
          title: 'Hata',
          description: 'Ürün bilgileri güncellenemedi.',
          variant: 'destructive'
        })
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
    <div className={STYLES.container}>
      <div className={STYLES.sidebarWrap}>
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

      <div className={STYLES.gridArea}>
        <div className={STYLES.gridPadding}>
          <div className={STYLES.productGrid}>
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

      <DeleteCategoryDialog
        categoryId={deleteCategoryId}
        onClose={() => setDeleteCategoryId(null)}
        onConfirm={confirmDeleteCategory}
      />
    </div>
  )
}
