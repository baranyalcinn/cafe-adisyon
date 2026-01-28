import { useState, memo } from 'react'
import { Pencil, Trash2, Star, MoreHorizontal, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@renderer/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/utils'
import { type Product } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ProductCardProps {
  product: Product
  onUpdate: (id: string, data: { name: string; price: number }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onToggleFavorite: (id: string, current: boolean) => Promise<void>
}

export const ProductCard = memo(function ProductCard({
  product,
  onUpdate,
  onDelete,
  onToggleFavorite
}: ProductCardProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(product.name)
  const [editPrice, setEditPrice] = useState((product.price / 100).toFixed(2))

  const handleSave = async (): Promise<void> => {
    if (!editName.trim() || !editPrice) return
    await onUpdate(product.id, {
      name: editName,
      price: Math.round(parseFloat(editPrice) * 100)
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="relative flex flex-col p-4 bg-background border-2 border-primary/20 rounded-2xl shadow-lg animate-in zoom-in-95 duration-200">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase">
              Ürün Adı
            </label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-8 font-medium"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase">
              Fiyat (₺)
            </label>
            <Input
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              className="h-8 font-bold text-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') setIsEditing(false)
              }}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" className="flex-1 h-8 font-bold" onClick={handleSave}>
              <Check className="w-3 h-3 mr-1" /> Kaydet
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 px-0 hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
              onClick={() => setIsEditing(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group relative flex flex-col p-5 bg-card border rounded-2xl transition-all duration-300',
        'hover:shadow-lg hover:-translate-y-1 hover:border-primary/20',
        product.isFavorite && 'border-warning/20 bg-warning/5 dark:bg-warning/10'
      )}
    >
      {/* Favorite Badge */}
      <button
        onClick={() => onToggleFavorite(product.id, product.isFavorite)}
        className={cn(
          'absolute top-3 right-3 p-1.5 rounded-full transition-all duration-200 z-10',
          product.isFavorite
            ? 'text-warning bg-warning/10 dark:bg-warning/30 opacity-100 scale-100'
            : 'text-muted-foreground/30 hover:text-warning hover:bg-warning/5 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100'
        )}
      >
        <Star className={cn('w-4 h-4', product.isFavorite && 'fill-current')} />
      </button>

      {/* Content */}
      <div className="flex-1 mb-4 space-y-1">
        <h3 className="font-bold text-base leading-tight pr-8">{product.name}</h3>
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-end justify-between">
        <div
          className="cursor-pointer group/price"
          onClick={() => setIsEditing(true)}
          title="Fiyatı düzenlemek için tıkla"
        >
          <span className="text-2xl font-black text-primary tracking-tight group-hover/price:underline decoration-dashed decoration-primary/30 underline-offset-4">
            {formatCurrency(product.price).replace('₺', '')}
          </span>
          <span className="text-xs font-bold text-muted-foreground ml-0.5">₺</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Pencil className="w-3.5 h-3.5 mr-2" />
              Düzenle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(product.id)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Ürünü Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
})
