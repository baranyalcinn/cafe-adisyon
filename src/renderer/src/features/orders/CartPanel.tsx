import React, { useState, useCallback, useRef } from 'react'
import {
  Minus,
  Plus,
  Trash2,
  CreditCard,
  CheckCircle,
  Lock,
  LockOpen,
  ShoppingBag,
  ReceiptText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCartStore } from '@/store/useCartStore'
import { useOrderStore } from '@/store/useOrderStore'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn, formatCurrency } from '@/lib/utils'
import { soundManager } from '@/lib/sound'

interface CartPanelProps {
  onPaymentClick: () => void
  tableName: string
}

export function CartPanel({ onPaymentClick, tableName }: CartPanelProps): React.JSX.Element {
  const { items, getTotal } = useCartStore()
  const { currentOrder, updateOrderItem, removeOrderItem, deleteOrder, isLocked, toggleLock } =
    useOrderStore()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Debounce refs for quantity updates
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const total = getTotal()
  const paidAmount = currentOrder?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const remainingAmount = total - paidAmount

  // Get orderItem from currentOrder by productId
  const getOrderItem = useCallback(
    (productId: string): { id: string; isPaid?: boolean; productId: string } | undefined => {
      return currentOrder?.items?.find((item) => item.productId === productId)
    },
    [currentOrder?.items]
  )

  const getOrderItemId = useCallback(
    (productId: string): string | null => {
      const orderItem = getOrderItem(productId)
      return orderItem?.id || null
    },
    [getOrderItem]
  )

  const isItemPaid = useCallback(
    (productId: string): boolean => {
      const orderItem = getOrderItem(productId)
      return orderItem?.isPaid ?? false
    },
    [getOrderItem]
  )

  const handleRemoveItem = useCallback(
    (productId: string): void => {
      if (isLocked) {
        soundManager.playError()
        return
      }
      if (isItemPaid(productId)) {
        soundManager.playError()
        return
      }

      if (items.length === 1 && currentOrder) {
        setShowDeleteDialog(true)
      } else {
        const orderItemId = getOrderItemId(productId)
        if (orderItemId) {
          removeOrderItem(orderItemId)
        }
      }
    },
    [isLocked, isItemPaid, items.length, currentOrder, getOrderItemId, removeOrderItem]
  )

  // Debounced quantity update (300ms delay)
  const handleUpdateQuantity = useCallback(
    (productId: string, newQuantity: number): void => {
      if (isLocked) {
        soundManager.playError()
        return
      }
      if (isItemPaid(productId)) {
        soundManager.playError()
        return
      }

      const orderItemId = getOrderItemId(productId)
      if (!orderItemId) return

      soundManager.playBeep()

      // Clear existing timer for this product
      const existingTimer = debounceTimers.current.get(productId)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      if (newQuantity <= 0) {
        // Immediate removal, no debounce
        handleRemoveItem(productId)
      } else {
        // Set new debounced call
        const timer = setTimeout(async () => {
          await updateOrderItem(orderItemId, newQuantity)
          debounceTimers.current.delete(productId)
        }, 300)

        debounceTimers.current.set(productId, timer)
      }
    },
    [isLocked, isItemPaid, getOrderItemId, updateOrderItem, handleRemoveItem]
  )

  const handleConfirmDelete = async (): Promise<void> => {
    if (currentOrder) {
      await deleteOrder(currentOrder.id)
      setShowDeleteDialog(false)
    }
  }

  return (
    <div className="w-96 glass-panel border-l flex flex-col h-full animate-in slide-in-from-right duration-500 relative overflow-hidden">
      {/* Subtle background detail */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="p-8 border-b relative z-10 bg-background/50">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-xl font-bold tracking-tight text-foreground/90">{tableName}</h3>
          {currentOrder?.items && currentOrder.items.length > 0 && (
            <Button
              variant={isLocked ? 'default' : 'secondary'}
              size="sm"
              onClick={toggleLock}
              className={cn(
                'h-8 gap-2 rounded-full px-4 text-[10px] font-bold uppercase tracking-wider transition-all',
                isLocked
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-accent/50 text-muted-foreground hover:text-foreground'
              )}
            >
              {isLocked ? (
                <>
                  <Lock className="w-3 h-3" />
                  Kilitli
                </>
              ) : (
                <>
                  <LockOpen className="w-3 h-3" />
                  Kilitle
                </>
              )}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ReceiptText className="w-3 h-3 text-muted-foreground" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Adisyon Detayı
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative z-10 flex flex-col">
        {currentOrder?.items && currentOrder.items.length > 0 ? (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 flex flex-col gap-3">
              {[...currentOrder.items]
                .sort((a, b) => {
                  const aIsPaid = a.isPaid ? 1 : 0
                  const bIsPaid = b.isPaid ? 1 : 0
                  return (
                    aIsPaid - bIsPaid ||
                    (a.product?.name || '').localeCompare(b.product?.name || '', undefined, {
                      numeric: true
                    })
                  )
                })
                .map((item) => {
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200',
                        item.isPaid
                          ? 'bg-emerald-500/5 border-emerald-500/10 opacity-50 grayscale-[0.5]'
                          : 'bg-background border-white/5 hover:bg-accent/5 group/item'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {item.isPaid && (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          )}
                          <p
                            className={cn(
                              'font-bold text-sm uppercase tracking-tight leading-tight',
                              item.isPaid && 'line-through text-muted-foreground'
                            )}
                          >
                            {item.product?.name || 'Ürün'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] font-bold text-muted-foreground/60 tabular-nums">
                            {formatCurrency(item.unitPrice)}
                          </p>
                          <span className="text-[10px] font-bold text-primary/40">×</span>
                          <p className="text-[10px] font-bold text-primary/80 tabular-nums">
                            {item.quantity} Adet
                          </p>
                        </div>
                      </div>

                      {!item.isPaid && (
                        <div className="flex items-center gap-1 bg-background/50 rounded-2xl p-1 border border-white/5 group-hover/item:border-primary/20 transition-all">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl hover:bg-primary/10 text-primary/60 hover:text-primary"
                            onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                            disabled={isLocked}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </Button>
                          <span className="w-7 text-center font-bold text-sm tabular-nums">
                            {item.quantity}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl hover:bg-primary/10 text-primary/60 hover:text-primary"
                            onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                            disabled={isLocked}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}

                      {item.isPaid && (
                        <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-500 tabular-nums">
                            ÖDENDİ
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-700">
            <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-6 relative group">
              <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <ShoppingBag className="w-8 h-8 text-primary/30 group-hover:text-primary/50 transition-colors" />
            </div>
            <h4 className="text-base font-bold text-foreground/70 uppercase tracking-widest">
              Sepet Boş
            </h4>
            <p className="text-xs text-muted-foreground mt-3 max-w-[220px] leading-relaxed font-medium">
              Masaya sipariş eklemek için menüden seçim yapın.
            </p>
          </div>
        )}
      </div>

      <div className="p-8 border-t space-y-6 glass-panel relative z-10">
        <div className="space-y-3">
          {paidAmount > 0 && (
            <div className="flex justify-between items-center px-2 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <span className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-widest">
                Ara Toplam (Ödenen)
              </span>
              <span className="text-sm font-bold text-emerald-600 tabular-nums">
                {formatCurrency(paidAmount)}
              </span>
            </div>
          )}

          <div className="flex justify-between items-end px-2 pt-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">
                {paidAmount > 0 ? 'Ödenecek Kalan' : 'Genel Toplam'}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-primary">₺</span>
              <span className="text-4xl font-bold text-foreground tabular-nums tracking-tighter">
                {formatCurrency(remainingAmount).replace('₺', '')}
              </span>
            </div>
          </div>
        </div>

        <Button
          className={cn(
            'w-full gap-4 h-16 text-base font-bold uppercase tracking-widest rounded-2xl shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99]',
            remainingAmount > 0
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
          size="lg"
          disabled={!currentOrder?.items || currentOrder.items.length === 0 || remainingAmount <= 0}
          onClick={onPaymentClick}
        >
          <CreditCard className="w-6 h-6" />
          ÖDEME AL
        </Button>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px] rounded-[2rem] border-none bg-card/95 backdrop-blur-2xl p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-3xl bg-destructive/10 flex items-center justify-center mb-6 border border-destructive/20">
              <Trash2 className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-2xl font-black tracking-tight text-foreground">
              Masa Boşaltılsın mı?
            </h3>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              Masadaki son ürünü siliyorsunuz. Bu işlem masayı tamamen boşaltacak ve adisyonu
              kapatacaktır.
            </p>
          </div>
          <div className="flex gap-3 mt-8">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(false)}
              className="flex-1 h-12 rounded-2xl font-bold"
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="flex-[2] h-12 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-destructive/20"
            >
              Masayı Boşalt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
