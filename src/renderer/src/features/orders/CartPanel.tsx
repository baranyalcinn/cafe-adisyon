import { PremiumAmount } from '@/components/PremiumAmount'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useSound } from '@/hooks/useSound'
import type { Order } from '@/lib/api'
import { soundManager } from '@/lib/sound'
import { cn, formatCurrency } from '@/lib/utils'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import {
  Banknote,
  History as HistoryIcon,
  Lock,
  LockOpen,
  Receipt,
  ShoppingBag,
  Trash2,
  Wallet
} from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CartPaidItem } from './components/CartPaidItem'
import { CartUnpaidItem } from './components/CartUnpaidItem'

interface CartPanelProps {
  order: Order | null | undefined
  isLocked: boolean
  onPaymentClick: () => void
  onUpdateItem: (orderItemId: string, quantity: number) => void
  onRemoveItem: (orderItemId: string) => void
  onToggleLock: () => void
  onDeleteOrder: (orderId: string) => void
}

// Performans için regex işlemini dışarı aldık
const formatProductName = (name: string): string => {
  return name.replace(/([a-zğüşöçı])([A-ZĞÜŞÖÇİ])/g, '$1 $2')
}

type ProcessedCartItem = NonNullable<Order['items']>[number] & {
  formattedName: string
}

export const CartPanel = React.memo(function CartPanel({
  order,
  isLocked,
  onPaymentClick,
  onUpdateItem,
  onRemoveItem,
  onToggleLock,
  onDeleteOrder
}: CartPanelProps): React.JSX.Element {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const { playAdd, playRemove, playClick } = useSound()

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = debounceTimers.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const items = order?.items ?? []

  // Unpaid ve Paid listeyi ayrı üret (render içinde tekrar filter/some yapmayalım)
  const { unpaidItems, paidItems } = useMemo(() => {
    if (!items.length) {
      return { unpaidItems: [] as ProcessedCartItem[], paidItems: [] as ProcessedCartItem[] }
    }

    const unpaidItems: ProcessedCartItem[] = []
    const paidMap = new Map<string, ProcessedCartItem>()

    for (const item of items) {
      const formattedName = formatProductName(item.product?.name || 'Yeni Ürün')

      if (!item.isPaid) {
        unpaidItems.push({
          ...item,
          formattedName
        })
        continue
      }

      const existing = paidMap.get(item.productId)
      if (existing) {
        paidMap.set(item.productId, {
          ...existing,
          quantity: existing.quantity + item.quantity
        })
      } else {
        paidMap.set(item.productId, {
          ...item,
          formattedName
        })
      }
    }

    return {
      unpaidItems,
      paidItems: Array.from(paidMap.values())
    }
  }, [items])

  // Totaller
  const total = order?.totalAmount || 0
  const paidAmount = order?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const remainingAmount = Math.max(0, total - paidAmount)

  const handleUpdateQuantity = useCallback(
    (orderItemId: string, _productId: string, newQuantity: number): void => {
      if (isLocked) {
        soundManager.playError()
        return
      }

      const item = order?.items?.find((i) => i.id === orderItemId)
      if (item?.isPaid) {
        soundManager.playError()
        return
      }

      const currentQuantity = item?.quantity || 0
      if (newQuantity > currentQuantity) {
        playAdd()
      } else {
        playRemove()
      }

      // Timer key olarak orderItemId kullan (daha güvenli)
      const existingTimer = debounceTimers.current.get(orderItemId)
      if (existingTimer) clearTimeout(existingTimer)

      if (newQuantity <= 0) {
        const isLastUnpaidItem = unpaidItems.length === 1 && unpaidItems[0]?.id === orderItemId

        if (isLastUnpaidItem) {
          if (paidAmount > 0) {
            // Ödeme alınmışsa adisyon SİLİNEMEZ! Sadece ürün silinir.
            // Sipariş zaten veritabanında olduğu için sadece ürünün silinmesi yeterli.
            onRemoveItem(orderItemId)
          } else {
            setShowDeleteDialog(true)
          }
        } else {
          onRemoveItem(orderItemId)
        }
        return
      }

      const timer = setTimeout(() => {
        onUpdateItem(orderItemId, newQuantity)
        debounceTimers.current.delete(orderItemId)
      }, 300)

      debounceTimers.current.set(orderItemId, timer)
    },
    [isLocked, order?.items, unpaidItems, onRemoveItem, onUpdateItem, playAdd, playRemove]
  )

  const handleConfirmDelete = useCallback((): void => {
    if (!order || paidAmount > 0) return
    onDeleteOrder(order.id)
    setShowDeleteDialog(false)
  }, [order, onDeleteOrder, paidAmount])

  const hasItems = unpaidItems.length > 0 || paidItems.length > 0
  const hasPaidItems = paidItems.length > 0

  return (
    <div className="w-96 bg-background border-l border-border flex flex-col h-full animate-in slide-in-from-right duration-500 relative overflow-hidden shadow-2xl gpu-accelerated">
      {/* Header */}
      <div className="shrink-0 h-14 px-6 border-b border-border bg-background z-20 flex items-center justify-between">
        <h2 className="text-base font-black tracking-tight flex items-center gap-2 text-foreground min-w-0">
          Adisyon
        </h2>

        <div className="flex items-center gap-1.5 relative z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleLock}
            className={cn(
              'h-9 w-9 rounded-xl transition-all duration-300',
              isLocked
                ? 'text-amber-500 bg-amber-500/15 border border-amber-500/20 shadow-sm'
                : 'text-foreground/80 hover:text-foreground hover:bg-muted/80'
            )}
            title={isLocked ? 'Masayı Aç' : 'Masayı Kilitle'}
            aria-label={isLocked ? 'Masayı Aç' : 'Masayı Kilitle'}
          >
            {isLocked ? (
              <Lock className="w-4 h-4" strokeWidth={2.5} />
            ) : (
              <LockOpen className="w-4 h-4" strokeWidth={2.5} />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-9 w-9 rounded-xl transition-all duration-300',
              !hasItems || paidAmount > 0
                ? 'opacity-0 pointer-events-none'
                : 'text-foreground/80 hover:text-destructive hover:bg-destructive/15 hover:border-destructive/20'
            )}
            onClick={() => setShowDeleteDialog(true)}
            disabled={!hasItems || paidAmount > 0}
            title={paidAmount > 0 ? 'Ödeme alınmış adisyon silinemez' : 'Masayı Boşalt'}
            aria-label="Masayı Boşalt"
          >
            <Trash2 className="w-4 h-4" strokeWidth={2.5} />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-hidden relative z-10 flex flex-col">
        {hasItems ? (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted-foreground/10 hover:scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
            <div className="p-4 flex flex-col min-h-min space-y-2">
              {/* Unpaid Items */}
              <div className="space-y-1">
                {unpaidItems.map((item) => (
                  <CartUnpaidItem
                    key={item.id}
                    item={item}
                    isLocked={isLocked}
                    onUpdateQuantity={handleUpdateQuantity}
                  />
                ))}
              </div>

              {/* Paid Items */}
              {hasPaidItems && (
                <div className="mt-6 pt-4 border-t border-dashed border-border/35">
                  <div className="flex items-center gap-2 mb-3 px-1 text-muted-foreground/65">
                    <HistoryIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black tracking-[0.18em]">
                      ÖDENMİŞ KALEMLER
                    </span>
                  </div>

                  <div className="space-y-1 opacity-90">
                    {paidItems.map((item) => (
                      <CartPaidItem key={`${item.productId}-paid-group`} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-5 border-2 border-dashed border-muted-foreground/20">
              <ShoppingBag className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-base font-black text-foreground/70 mb-1">Adisyon Boş</h3>
            <p className="text-xs font-medium text-muted-foreground/60 max-w-[220px] leading-relaxed">
              Soldan ürün seçerek başlayın.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {hasItems && (
        <div className="shrink-0 px-5 py-4 bg-background/85 backdrop-blur-xl border-t border-border/10 z-20 rounded-t-[2rem] shadow-[0_-16px_40px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_-16px_40px_-12px_rgba(0,0,0,0.35)]">
          <div className="space-y-4">
            {paidAmount > 0 && (
              <div className="space-y-2 px-1">
                <div className="flex justify-between items-center text-[13px]">
                  <div className="flex items-center gap-2 text-muted-foreground/80 font-bold tracking-tight">
                    <Receipt className="w-3.5 h-3.5" />
                    Ara Toplam
                  </div>
                  <span className="text-foreground/90 font-black tabular-nums tracking-tight">
                    {formatCurrency(total)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[13px]">
                  <div className="flex items-center gap-2 text-emerald-600/80 dark:text-emerald-400/80 font-bold tracking-tight">
                    <Wallet className="w-3.5 h-3.5" />
                    Ödenen
                  </div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black tabular-nums tracking-tight">
                    -{formatCurrency(paidAmount)}
                  </span>
                </div>

                <div className="h-px bg-border/10 w-full mt-1" />
              </div>
            )}

            <div className="flex justify-between items-end gap-3 px-1">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black text-muted-foreground/90 tracking-[0.16em] mb-1 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  Ödenecek
                </span>
                <PremiumAmount amount={remainingAmount} size="2xl" fontWeight="black" />
              </div>

              <Button
                size="lg"
                className="h-11 px-5 text-sm font-black rounded-2xl shadow-lg shadow-primary/20 bg-primary text-primary-foreground active:scale-95 transition-all shrink-0"
                onClick={() => {
                  playClick()
                  onPaymentClick()
                }}
                disabled={remainingAmount <= 0}
              >
                <Banknote className="w-4 h-4 mr-2" />
                ÖDEME AL
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Silme Modalı */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent
          className="sm:max-w-[400px] p-0 overflow-hidden border-none bg-transparent shadow-none outline-none"
          aria-describedby={undefined}
        >
          <VisuallyHidden.Root asChild>
            <DialogTitle>Adisyonu Sil</DialogTitle>
          </VisuallyHidden.Root>

          <div className="group bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-destructive/10 rounded-3xl flex items-center justify-center mx-auto rotate-12 group-hover:rotate-0 transition-transform duration-500 shadow-inner">
                <Trash2 className="w-10 h-10 text-destructive" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tight text-foreground">
                  Adisyonu Sil?
                </h3>
                <p className="text-muted-foreground/70 leading-relaxed font-medium">
                  Bu işlem adisyondaki tüm ürünleri silecek ve masayı boşaltacaktır. Emin misiniz?
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    playClick()
                    setShowDeleteDialog(false)
                  }}
                  className="flex-1 h-12 rounded-2xl font-bold border-border/50 hover:bg-muted/50"
                >
                  Vazgeç
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => {
                    playRemove()
                    handleConfirmDelete()
                  }}
                  className="flex-1 h-12 rounded-2xl font-black tracking-wider shadow-lg shadow-destructive/20 active:scale-95"
                >
                  Evet, Sil
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
})
