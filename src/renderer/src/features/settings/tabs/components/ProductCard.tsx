'use client'

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
import { toCents, toLira } from '@shared/utils/currency'
import { Check, MoreHorizontal, Pencil, Star, Trash2, X } from 'lucide-react'
import React, { memo, useCallback, useState } from 'react'

// ============================================================================
// Types
// ============================================================================

interface ProductCardProps {
  product: Product
  onUpdate: (id: string, data: { name: string; price: number }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onToggleFavorite: (id: string, current: boolean) => Promise<void>
}

// ============================================================================
// Styles (Centralized)
// ============================================================================

const STYLES = {
  // Normal Mode
  cardBase:
    'group relative flex flex-col p-5 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl transition-all duration-300 text-left hover:shadow-xl hover:-translate-y-1 hover:border-indigo-500',
  cardFavorite: 'border-orange-400 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30',

  favBtn: 'absolute top-3 right-3 p-2 rounded-xl transition-all duration-200 z-10',
  favBtnActive:
    'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 opacity-100 scale-100 border border-orange-200 dark:border-orange-800',
  favBtnInactive:
    'text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/50 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100',

  title: 'font-bold text-base leading-tight pr-8',
  priceWrap: 'cursor-pointer group/price flex items-baseline',
  priceValue:
    'text-2xl font-black text-zinc-900 dark:text-white tabular-nums tracking-tight group-hover/price:underline decoration-dashed decoration-zinc-400 dark:decoration-zinc-600 underline-offset-4 transition-colors',
  priceCurrency: 'text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1',

  // Edit Mode
  editWrap:
    'relative flex flex-col p-5 bg-white dark:bg-zinc-800 border-2 border-indigo-500 rounded-2xl shadow-xl animate-in zoom-in-95 duration-200 z-20',
  editLabel: 'text-[11px] font-bold text-muted-foreground tracking-widest mb-1',
  editInputName: 'h-8 font-medium',
  editInputPrice: 'h-8 font-bold text-lg',
  editActionRow: 'flex gap-2 pt-2',
  saveBtn: 'flex-1 h-8 font-bold',
  cancelBtn:
    'h-8 w-8 px-0 hover:bg-destructive/10 hover:text-destructive transition-all duration-300'
} as const

// ============================================================================
// Main Component
// ============================================================================

export const ProductCard = memo(function ProductCard({
  product,
  onUpdate,
  onDelete,
  onToggleFavorite
}: ProductCardProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [editName, setEditName] = useState<string>('')
  const [editPrice, setEditPrice] = useState<string>('')

  // ============================================================================
  // Handlers (Memoized to prevent memory leaks in large lists)
  // ============================================================================

  const handleOpenEdit = useCallback((): void => {
    // Stale state koruması: Edit modu açılırken her zaman en güncel veriyi al
    setEditName(product.name)
    setEditPrice(toLira(product.price).toString())
    setIsEditing(true)
  }, [product.name, product.price])

  const handleCloseEdit = useCallback((): void => {
    setIsEditing(false)
  }, [])

  const handleSave = useCallback(async (): Promise<void> => {
    if (!editName.trim() || !editPrice) return
    await onUpdate(product.id, {
      name: editName,
      price: toCents(editPrice)
    })
    setIsEditing(false)
  }, [editName, editPrice, onUpdate, product.id])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') void handleSave()
      if (e.key === 'Escape') handleCloseEdit()
    },
    [handleSave, handleCloseEdit]
  )

  const handleToggleFav = useCallback((): void => {
    void onToggleFavorite(product.id, product.isFavorite)
  }, [onToggleFavorite, product.id, product.isFavorite])

  const handleDelete = useCallback((): void => {
    void onDelete(product.id)
  }, [onDelete, product.id])

  // ============================================================================
  // Render: Edit Mode
  // ============================================================================

  if (isEditing) {
    return (
      <div className={STYLES.editWrap}>
        <div className="space-y-3">
          <div>
            <h3 className={STYLES.editLabel}>Ürün Adı</h3>
            <Input
              value={editName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                setEditName(e.target.value)
              }
              className={STYLES.editInputName}
              autoFocus
            />
          </div>
          <div>
            <label className={STYLES.editLabel}>Fiyat (₺)</label>
            <Input
              type="number"
              value={editPrice}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                setEditPrice(e.target.value)
              }
              max={9999}
              min={0}
              className={STYLES.editInputPrice}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className={STYLES.editActionRow}>
            <Button size="sm" className={STYLES.saveBtn} onClick={handleSave}>
              <Check className="w-3 h-3 mr-1" /> Kaydet
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={STYLES.cancelBtn}
              onClick={handleCloseEdit}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // Render: Normal Mode
  // ============================================================================

  return (
    <div className={cn(STYLES.cardBase, product.isFavorite && STYLES.cardFavorite)}>
      {/* Favorite Badge */}
      <button
        onClick={handleToggleFav}
        className={cn(
          STYLES.favBtn,
          product.isFavorite ? STYLES.favBtnActive : STYLES.favBtnInactive
        )}
      >
        <Star className={cn('w-4 h-4', product.isFavorite && 'fill-current')} />
      </button>

      {/* Content */}
      <div className="flex-1 mb-4 space-y-1">
        <h3 className={STYLES.title}>{product.name}</h3>
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-end justify-between">
        <div
          className={STYLES.priceWrap}
          onClick={handleOpenEdit}
          title="Fiyatı düzenlemek için tıkla"
        >
          <span className={STYLES.priceValue}>
            {formatCurrency(product.price).replace('₺', '').trim()}
          </span>
          <span className={STYLES.priceCurrency}>₺</span>
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
            <DropdownMenuItem onClick={handleOpenEdit}>
              <Pencil className="w-3.5 h-3.5 mr-2" />
              Düzenle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleDelete}
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
