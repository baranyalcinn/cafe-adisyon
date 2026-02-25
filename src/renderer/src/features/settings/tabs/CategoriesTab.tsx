'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useInventory } from '@/hooks/useInventory'
import { cafeApi } from '@/lib/api'
import { toast } from '@/store/useToastStore'
import { Plus, Tag, Trash2 } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// ============================================================================
// Constants & Helpers
// ============================================================================

const ICON_OPTIONS = [
  { value: 'coffee', emoji: '☕', label: 'Kahveler' },
  { value: 'ice-cream-cone', emoji: '🍦', label: 'Tatlılar' },
  { value: 'cookie', emoji: '🍪', label: 'Atıştırmalık' },
  { value: 'utensils', emoji: '🍽️', label: 'Yemekler' },
  { value: 'wine', emoji: '🍷', label: 'İçecekler' },
  { value: 'cake', emoji: '🎂', label: 'Pastalar' },
  { value: 'sandwich', emoji: '🥪', label: 'Sandviçler' }
]

function getCategoryEmoji(icon: string | null): string {
  const found = ICON_OPTIONS.find((opt) => opt.value === icon)
  return found ? found.emoji : '🍽️'
}

// ============================================================================
// Styles
// ============================================================================

const STYLES = {
  layout: 'h-full flex flex-col bg-zinc-50 dark:bg-zinc-900/40 overflow-hidden',
  mainArea: 'flex-1 overflow-y-auto p-8 custom-scrollbar',
  gridContainer: 'max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4',

  // Header Actions
  headerWrapper: 'flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500',
  headerInput:
    'w-56 h-10 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl focus:border-indigo-500 focus:ring-0 font-bold transition-all text-sm',
  addBtn:
    'gap-2 font-black px-5 rounded-xl h-10 bg-zinc-950 dark:bg-zinc-50 text-white dark:text-black hover:bg-zinc-900 dark:hover:bg-white active:scale-95 transition-all text-xs tracking-tight shadow-sm',

  // Category Card
  card: 'group flex items-center justify-between p-5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm hover:border-indigo-500 hover:-translate-y-1 hover:shadow-lg transition-all duration-300',
  iconBox:
    'w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-3xl shadow-inner border-2 border-zinc-200 dark:border-zinc-800 transition-colors group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 group-hover:border-indigo-200 dark:group-hover:border-indigo-800',
  cardTitle:
    'font-black text-xl tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors',
  countBadge:
    'px-3 py-1 rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[11px] font-black tracking-tight border border-zinc-200 dark:border-zinc-600',

  // Card Actions
  selectTrigger:
    'w-14 h-12 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-colors focus:ring-0 [&>svg]:hidden flex items-center justify-center font-bold text-center',
  deleteBtn:
    'h-12 w-12 rounded-xl text-zinc-400 dark:text-zinc-500 hover:text-white hover:bg-red-500 hover:border-red-500 transition-colors ml-2',

  // Empty State
  emptyBox:
    'col-span-full flex flex-col items-center justify-center h-80 text-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl bg-white dark:bg-zinc-800/50',
  emptyIconBox:
    'w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-6 border-2 border-zinc-200 dark:border-zinc-800',
  emptyTitle: 'text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight',
  emptyText: 'text-base text-zinc-500 dark:text-zinc-400 max-w-sm mt-2 font-medium'
} as const

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * PORTAL AKSİYONLARI (Header Alanı)
 * İçinde input onChange olduğu için memo ile sarmalamak hatalıdır, doğal bırakıldı.
 */
const CategoriesHeaderActions = ({
  name,
  setName,
  onAdd
}: {
  name: string
  setName: (name: string) => void
  onAdd: () => void
}): React.JSX.Element => (
  <div className={STYLES.headerWrapper}>
    <div className="relative group">
      <Input
        placeholder="Yeni kategori adı..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={STYLES.headerInput}
        onKeyDown={(e) => e.key === 'Enter' && onAdd()}
      />
    </div>
    <Button onClick={onAdd} size="sm" className={STYLES.addBtn}>
      <Plus className="w-4 h-4" strokeWidth={3} />
      Kategori Ekle
    </Button>
  </div>
)

/** Kategori Yoksa Gösterilecek Boş Ekran */
const EmptyState = (): React.JSX.Element => (
  <div className={STYLES.emptyBox}>
    <div className={STYLES.emptyIconBox}>
      <Tag className="w-10 h-10 text-zinc-400" />
    </div>
    <h3 className={STYLES.emptyTitle}>Kategori Bulunmuyor</h3>
    <p className={STYLES.emptyText}>
      Sistemi yapılandırmak için sağ üstteki alandan ilk kategorinizi ekleyin.
    </p>
  </div>
)

/** Silme Onay Diyaloğu */
const DeleteCategoryDialog = ({
  isOpen,
  onClose,
  onConfirm
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}): React.JSX.Element => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl bg-white dark:bg-zinc-950 rounded-2xl [&>button:last-child]:hidden">
      <div className="bg-red-600 p-8 text-white">
        <div className="flex items-center gap-6">
          <div className="flex-none w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center ring-4 ring-white/10 shadow-inner">
            <Trash2 className="w-8 h-8 text-white" />
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
            onClick={onClose}
          >
            İptal
          </Button>
          <Button
            variant="destructive"
            className="rounded-xl font-black h-12 px-8 shadow-sm hover:scale-105 active:scale-95 transition-all bg-red-600 hover:bg-red-700 tracking-tight"
            onClick={onConfirm}
          >
            Kalıcı Olarak Sil
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
)

// ============================================================================
// Main Component
// ============================================================================

export function CategoriesTab(): React.JSX.Element {
  const { categories, products, refetchCategories } = useInventory()
  const [newCategoryName, setNewCategoryName] = useState('')
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setHeaderTarget(document.getElementById('settings-header-actions'))
  }, [])

  const handleAddCategory = useCallback(async (): Promise<void> => {
    if (!newCategoryName.trim()) return
    try {
      await cafeApi.categories.create(newCategoryName)
      refetchCategories()
      setNewCategoryName('')
      toast({ title: 'Başarılı', description: 'Kategori oluşturuldu', variant: 'success' })
    } catch {
      toast({ title: 'Hata', description: 'Kategori eklenemedi', variant: 'destructive' })
    }
  }, [newCategoryName, refetchCategories])

  const confirmDeleteCategory = useCallback(async (): Promise<void> => {
    if (!deleteCategoryId) return
    try {
      await cafeApi.categories.delete(deleteCategoryId)
      refetchCategories()
      toast({ title: 'Başarılı', description: 'Kategori silindi', variant: 'success' })
    } catch {
      toast({ title: 'Hata', description: 'Silinemedi', variant: 'destructive' })
    } finally {
      setDeleteCategoryId(null)
    }
  }, [deleteCategoryId, refetchCategories])

  return (
    <div className={STYLES.layout}>
      {/* Header Actions via Portal */}
      {headerTarget &&
        createPortal(
          <CategoriesHeaderActions
            name={newCategoryName}
            setName={setNewCategoryName}
            onAdd={handleAddCategory}
          />,
          headerTarget
        )}

      {/* Ana Liste Alanı */}
      <div className={STYLES.mainArea}>
        <div className={STYLES.gridContainer}>
          {categories.map((cat) => (
            <div key={cat.id} className={STYLES.card}>
              <div className="flex items-center gap-5 pt-1">
                {/* Kategori İkonu (Emoji) */}
                <div className={STYLES.iconBox}>{getCategoryEmoji(cat.icon ?? null)}</div>

                {/* Kategori Bilgileri */}
                <div className="space-y-1.5">
                  <h3 className={STYLES.cardTitle}>{cat.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={STYLES.countBadge}>
                      {products.filter((p) => p.categoryId === cat.id).length} Ürün
                    </span>
                  </div>
                </div>
              </div>

              {/* Aksiyon Butonları */}
              <div className="flex items-center gap-2">
                {/* İkon Seçici */}
                <Select
                  value={cat.icon || 'utensils'}
                  onValueChange={async (val) => {
                    await cafeApi.categories.update(cat.id, { icon: val })
                    refetchCategories()
                  }}
                >
                  <SelectTrigger className={STYLES.selectTrigger}>
                    <SelectValue placeholder="İkon" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 shadow-2xl p-2 min-w-[140px]">
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="rounded-xl cursor-pointer py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-100 dark:focus:bg-zinc-800 font-bold"
                      >
                        <span className="flex items-center gap-3 text-sm">
                          <span className="text-xl">{opt.emoji}</span> {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sil Butonu */}
                <Button
                  size="icon"
                  variant="ghost"
                  className={STYLES.deleteBtn}
                  onClick={() => setDeleteCategoryId(cat.id)}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          ))}

          {/* Boş Durum */}
          {categories.length === 0 && <EmptyState />}
        </div>
      </div>

      {/* Kategori Silme Diyaloğu */}
      <DeleteCategoryDialog
        isOpen={!!deleteCategoryId}
        onClose={() => setDeleteCategoryId(null)}
        onConfirm={confirmDeleteCategory}
      />
    </div>
  )
}
