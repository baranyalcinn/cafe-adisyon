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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn, formatCurrency } from '@/lib/utils'
import { soundManager } from '@/lib/sound'
import { Order } from '@/lib/api'

interface CartPanelProps {
  order: Order | null | undefined
  tableName: string
  isLocked: boolean
  onPaymentClick: () => void
  onUpdateItem: (orderItemId: string, quantity: number) => void
  onRemoveItem: (orderItemId: string) => void
  onToggleLock: () => void
  onDeleteOrder: (orderId: string) => void
}

export function CartPanel({
  order,
  tableName,
  isLocked,
  onPaymentClick,
  onUpdateItem,
  onRemoveItem,
  onToggleLock,
  onDeleteOrder
}: CartPanelProps): React.JSX.Element {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Debounce refs for quantity updates
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Calculate totals from order data
  const total = order?.totalAmount || 0
  const paidAmount = order?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const remainingAmount = total - paidAmount

  const handleUpdateQuantity = useCallback(
    (orderItemId: string, productId: string, newQuantity: number): void => {
      if (isLocked) {
        soundManager.playError()
        return
      }

      const item = order?.items?.find((i) => i.id === orderItemId)
      if (item?.isPaid) {
        soundManager.playError()
        return
      }

      soundManager.playBeep()

      // Clear existing timer for this product
      const existingTimer = debounceTimers.current.get(productId)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      if (newQuantity <= 0) {
        // Assume removal
        onRemoveItem(orderItemId)
      } else {
        const timer = setTimeout(() => {
          onUpdateItem(orderItemId, newQuantity)
          debounceTimers.current.delete(productId)
        }, 300)

        debounceTimers.current.set(productId, timer)
      }
    },
    [isLocked, order?.items, onRemoveItem, onUpdateItem]
  )

  const handleConfirmDelete = async (): Promise<void> => {
    if (order) {
      onDeleteOrder(order.id)
      setShowDeleteDialog(false)
    }
  }

  return (
    <div className="w-96 glass-panel border-l flex flex-col h-full animate-in slide-in-from-right duration-700 relative overflow-hidden shadow-2xl">
      {/* Premium Glass Effect Background */}


      <div className="p-4 border-b relative z-10 bg-background/95 border-l-4 border-l-primary/30">
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-black tracking-tighter text-foreground/90 uppercase italic">
              {tableName}
            </h3>
            {order?.items && order.items.length > 0 && (
              <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-black rounded-full border border-primary/20">
                {order.items.reduce((sum, item) => sum + item.quantity, 0)} Ürün
              </span>
            )}
          </div>
          {order?.items && order.items.length > 0 && (
            <Button
              variant={isLocked ? 'default' : 'secondary'}
              size="sm"
              onClick={onToggleLock}
              className={cn(
                'h-9 gap-2.5 rounded-2xl px-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300',
                isLocked
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30 ring-2 ring-amber-500/20'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
              )}
            >
              {isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Kilitli
                </>
              ) : (
                <>
                  <LockOpen className="w-3.5 h-3.5" />
                  Kilitle
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative z-10 flex flex-col">
        {order?.items && order.items.length > 0 ? (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 flex flex-col gap-3">
              {[...order.items]
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
                  // If product field is missing in optimistic update, use what we have or placeholder
                  const productName = item.product?.name || 'Yeni Ürün'

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center gap-3 py-2 px-3 rounded-xl border transition-all duration-300 relative overflow-hidden hover:shadow-md hover:scale-[1.01]',
                        item.isPaid
                          ? 'bg-emerald-500/[0.05] border-emerald-500/10 opacity-60 border-l-4 border-l-emerald-500/50'
                          : 'bg-card/90 border-white/5 hover:bg-card hover:border-primary/10 border-l-4 border-l-primary/40 shadow-sm'
                      )}
                    >
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {item.isPaid && (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          )}
                          <div className="flex flex-col min-w-0">
                            <p
                              className={cn(
                                'font-bold text-[15px] tracking-tight leading-snug line-clamp-2',
                                item.isPaid ? 'text-muted-foreground' : 'text-foreground/90'
                              )}
                            >
                              {productName.replace(/([a-z])([A-Z])/g, '$1 $2')}
                              {item.quantity > 1 && (
                                <span className="ml-2 text-[13px] font-black text-rose-500 tabular-nums">
                                  x{item.quantity}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right min-w-[75px] shrink-0">
                          <p className="text-sm font-black text-foreground/80 tabular-nums">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </p>
                        </div>
                      </div>

                      {/* Always visible quantity controls for unpaid items */}
                      {!item.isPaid && (
                        <div className="flex items-center gap-1 bg-background/90 rounded-xl p-0.5 border border-white/10 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-lg hover:bg-red-500/10 text-red-500/60 hover:text-red-500"
                            onClick={() =>
                              handleUpdateQuantity(item.id, item.productId, item.quantity - 1)
                            }
                            disabled={isLocked}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-5 text-center font-black text-[11px] tabular-nums">
                            {item.quantity}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-lg hover:bg-emerald-500/10 text-emerald-500/60 hover:text-emerald-500"
                            onClick={() =>
                              handleUpdateQuantity(item.id, item.productId, item.quantity + 1)
                            }
                            disabled={isLocked}
                          >
                            <Plus className="w-3 h-3" />
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

      <div className="p-2 border-t space-y-2 glass-panel relative z-10">
        {/* Decorative gradient divider */}
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="space-y-2">
          {paidAmount > 0 && (
            <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
              <span className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-widest">
                Ara Toplam (Ödenen)
              </span>
              <span className="text-sm font-bold text-emerald-600 tabular-nums">
                {formatCurrency(paidAmount)}
              </span>
            </div>
          )}

          {/* Total Amount Card with Gradient */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="flex justify-between items-end relative z-10">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">
                  {paidAmount > 0 ? 'Ödenecek Kalan' : 'Genel Toplam'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-primary">₺</span>
                <span className="text-3xl font-black text-foreground tabular-nums tracking-tighter">
                  {formatCurrency(remainingAmount).replace('₺', '')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Button
          className={cn(
            'w-full gap-5 h-16 text-lg font-black uppercase tracking-[0.25em] rounded-[1.25rem] shadow-2xl transition-all active:scale-[0.98] group/pay relative overflow-hidden',
            remainingAmount > 0
              ? 'bg-primary text-primary-foreground hover:shadow-primary/40'
              : 'bg-muted text-muted-foreground outline-none'
          )}
          size="lg"
          disabled={!order?.items || order.items.length === 0 || remainingAmount <= 0}
          onClick={onPaymentClick}
        >
          <CreditCard className="w-7 h-7" />
          <span>ÖDEME AL</span>
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
