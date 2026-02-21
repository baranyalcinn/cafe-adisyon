import { Minus, Plus } from 'lucide-react'
import { memo, useCallback } from 'react'

import { type OrderItem } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'

interface ItemRowProps {
  item: OrderItem
  selected: number
  onQtyChange: (itemId: string, qty: number) => void
}

export const ItemRow = memo(function ItemRow({ item, selected, onQtyChange }: ItemRowProps) {
  const totalLine = item.unitPrice * selected

  const inc = useCallback(
    () => onQtyChange(item.id, Math.min(selected + 1, item.quantity)),
    [item.id, item.quantity, selected, onQtyChange]
  )

  const dec = useCallback(
    () => onQtyChange(item.id, Math.max(selected - 1, 0)),
    [item.id, selected, onQtyChange]
  )

  const handleRowClick = useCallback(() => {
    if (selected <= 0) onQtyChange(item.id, 1)
    else onQtyChange(item.id, Math.min(selected + 1, item.quantity))
  }, [item.id, item.quantity, selected, onQtyChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleRowClick()
      }
    },
    [handleRowClick]
  )

  const isSelected = selected > 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      className={cn(
        // Padding'i p-3 yaparak yüksekliği daralttık
        'group relative flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-all duration-200 ease-in-out cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1',
        isSelected
          ? 'border-primary/40 bg-primary/[0.03] shadow-sm'
          : 'border-border/40 bg-card hover:border-border hover:bg-muted/30'
      )}
      title={!isSelected ? 'Seçmek için tıkla' : 'Artırmak için tekrar tıkla'}
    >
      {/* Sol Kısım: Ürün Bilgisi */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* Stok Rozeti - Boyutu küçültüldü (h-8 w-8) */}
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border font-mono text-[13px] font-bold transition-colors',
            isSelected
              ? 'border-primary/30 bg-primary text-primary-foreground shadow-sm'
              : 'border-border/50 bg-muted/50 text-muted-foreground group-hover:bg-muted'
          )}
          aria-label={`Toplam adet: ${item.quantity}`}
        >
          {item.quantity}
        </div>

        <div className="flex flex-col min-w-0 justify-center">
          <span className="truncate text-[15px] font-semibold text-foreground/90 leading-tight">
            {item.product?.name}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground mt-0.5">
            {formatCurrency(item.unitPrice)} / adet
          </span>
        </div>
      </div>

      {/* Sağ Kısım: Kontroller ve Fiyat */}
      {/* gap-4 yerine gap-2.5 kullanarak stepper'ı sağdaki fiyata iyice yaklaştırdık */}
      <div className="flex shrink-0 items-center gap-2.5">
        {/* Stepper Kontrolü - Boyutları hafifçe sıkılaştırıldı */}
        <div
          className={cn(
            'flex items-center rounded-full border bg-background p-0.5 shadow-sm transition-opacity',
            !isSelected &&
              'opacity-0 pointer-events-none group-hover:opacity-100 group-focus-visible:opacity-100'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
            onClick={dec}
            disabled={!isSelected}
            title="Azalt"
          >
            <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>

          <span className="w-5 text-center font-mono text-[13px] font-bold">{selected}</span>

          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
            onClick={inc}
            disabled={selected >= item.quantity}
            title="Artır"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Toplam Fiyat */}
        <div className="flex flex-col items-end min-w-[4.5rem]">
          <span
            className={cn(
              'font-mono text-[15px] font-bold transition-colors leading-tight',
              isSelected ? 'text-primary' : 'text-foreground/70'
            )}
          >
            {formatCurrency(totalLine)}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 mt-0.5">
            Toplam
          </span>
        </div>
      </div>
    </div>
  )
})
