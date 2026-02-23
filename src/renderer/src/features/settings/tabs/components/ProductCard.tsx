import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type Product } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { Check, MoreHorizontal, Pencil, Star, Trash2, X } from 'lucide-react'
import { memo, useState } from 'react'

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
  const [editPrice, setEditPrice] = useState((product.price / 100).toString())

  const handleSave = async (): Promise<void> => {
    if (!editName.trim() || !editPrice) return
    const sanitizedPrice = editPrice.replace(',', '.') // Virgül desteği
    await onUpdate(product.id, {
      name: editName,
      price: Math.round(parseFloat(sanitizedPrice) * 100)
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="relative flex flex-col p-5 bg-white dark:bg-zinc-800 border-2 border-indigo-500 rounded-2xl shadow-xl animate-in zoom-in-95 duration-200 z-20">
        <div className="space-y-3">
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground  tracking-[0.15em] mb-1">
              ÜRÜN ADI
            </h3>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-8 font-medium"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground  tracking-[0.15em] mb-1">
              FİYAT (₺)
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
        'group relative flex flex-col p-5 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl transition-all duration-300 text-left',
        'hover:shadow-xl hover:-translate-y-1 hover:border-indigo-500',
        product.isFavorite &&
          'border-orange-400 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30'
      )}
    >
      {/* Favorite Badge */}
      <button
        onClick={() => onToggleFavorite(product.id, product.isFavorite)}
        className={cn(
          'absolute top-3 right-3 p-2 rounded-xl transition-all duration-200 z-10',
          product.isFavorite
            ? 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 opacity-100 scale-100 border border-orange-200 dark:border-orange-800'
            : 'text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/50 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100'
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
          className="cursor-pointer group/price flex items-baseline"
          onClick={() => setIsEditing(true)}
          title="Fiyatı düzenlemek için tıkla"
        >
          <span className="text-2xl font-black text-zinc-900 dark:text-white tabular-nums tracking-tight group-hover/price:underline decoration-dashed decoration-zinc-400 dark:decoration-zinc-600 underline-offset-4 transition-colors">
            {formatCurrency(product.price).replace('₺', '')}
          </span>
          <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1">₺</span>
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
