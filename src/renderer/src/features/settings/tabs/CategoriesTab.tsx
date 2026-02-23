import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { memo, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// ==========================================
// PORTAL AKSİYONLARI (Header Alanı)
// ==========================================
const CategoriesHeaderActions = memo(
  ({
    name,
    setName,
    onAdd
  }: {
    name: string
    setName: (name: string) => void
    onAdd: () => void
  }) => {
    return (
      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
        <Input
          placeholder="Yeni kategori adı..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-48 h-9 bg-background/50 rounded-xl border-border/40 focus:ring-primary/20"
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        />
        <Button
          onClick={onAdd}
          size="sm"
          className="gap-2 font-black px-4 rounded-xl h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-[10px] tracking-widest "
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          EKLE
        </Button>
      </div>
    )
  }
)

export function CategoriesTab(): React.JSX.Element {
  const { categories, products, refetchCategories } = useInventory()
  const [newCategoryName, setNewCategoryName] = useState('')
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setHeaderTarget(document.getElementById('settings-header-actions'))
  }, [])

  const handleAddCategory = async (): Promise<void> => {
    if (!newCategoryName.trim()) return
    try {
      await cafeApi.categories.create(newCategoryName)
      refetchCategories()
      setNewCategoryName('')
      toast({ title: 'Başarılı', description: 'Kategori oluşturuldu', variant: 'success' })
    } catch {
      toast({ title: 'Hata', description: 'Kategori eklenemedi', variant: 'destructive' })
    }
  }

  const confirmDeleteCategory = async (): Promise<void> => {
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
  }

  return (
    <div className="h-full flex flex-col bg-muted/10 overflow-hidden">
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
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="group flex items-center justify-between p-5 rounded-[2rem] border border-border/40 bg-card shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex items-center gap-5">
                {/* Kategori İkonu (Emoji) */}
                <div className="w-16 h-16 rounded-[1.5rem] bg-muted/30 flex items-center justify-center text-3xl shadow-inner border border-border/10 group-hover:scale-105 transition-transform">
                  {getCategoryEmoji(cat.icon ?? null)}
                </div>

                <div className="space-y-1">
                  <h3 className="font-black text-lg tracking-tight text-foreground/90">
                    {cat.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black  tracking-widest border border-primary/10">
                      {products.filter((p) => p.categoryId === cat.id).length} ÜRÜN
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Simge Seçici */}
                <Select
                  value={cat.icon || 'utensils'}
                  onValueChange={async (val) => {
                    await cafeApi.categories.update(cat.id, { icon: val })
                    refetchCategories()
                  }}
                >
                  <SelectTrigger className="w-12 h-10 bg-muted/20 border-none rounded-xl focus:ring-0">
                    <SelectValue placeholder="İkon" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="rounded-xl cursor-pointer py-2.5"
                      >
                        <span className="flex items-center gap-3 font-bold text-xs">
                          <span className="text-lg">{opt.emoji}</span> {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => setDeleteCategoryId(cat.id)}
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </Button>
              </div>
            </div>
          ))}

          {/* Boş Durum (Empty State) */}
          {categories.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center h-80 text-center border-2 border-dashed border-border/40 rounded-[3rem] bg-card/30">
              <div className="w-20 h-20 rounded-full bg-muted/40 flex items-center justify-center mb-6">
                <Tag className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-black text-foreground/80 tracking-tight">
                Kategori Bulunmuyor
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs mt-2 font-medium">
                Sistemi yapılandırmak için üst panelden ilk kategorinizi oluşturun.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Kategori Silme Diyaloğu */}
      <Dialog open={!!deleteCategoryId} onOpenChange={(open) => !open && setDeleteCategoryId(null)}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-2">
              <Trash2 size={28} />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">
              Kategori Silinsin Mi?
            </DialogTitle>
            <DialogDescription className="text-base font-medium">
              Bu kategoriyi sildiğinizde içindeki <b>tüm ürünler</b> de kalıcı olarak silinecektir.
              Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-4">
            <Button
              variant="ghost"
              className="rounded-xl font-bold"
              onClick={() => setDeleteCategoryId(null)}
            >
              İPTAL
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl font-black px-8 shadow-lg shadow-destructive/20"
              onClick={confirmDeleteCategory}
            >
              KATEGORİYİ SİL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==========================================
// YARDIMCI SABİTLER VE FONKSİYONLAR
// ==========================================
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
