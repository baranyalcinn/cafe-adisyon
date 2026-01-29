import React, { useState, useCallback, useRef } from 'react'
import { Trash2, CreditCard, CheckCircle, Lock, LockOpen, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn, formatCurrency } from '@/lib/utils'
import { soundManager } from '@/lib/sound'
import { Order } from '@/lib/api'
import { QuantitySelector } from '@/components/ui/QuantitySelector'

interface CartPanelProps {
  order: Order | null | undefined
  isLocked: boolean
  onPaymentClick: () => void
  onUpdateItem: (orderItemId: string, quantity: number) => void
  onRemoveItem: (orderItemId: string) => void
  onToggleLock: () => void
  onDeleteOrder: (orderId: string) => void
}

export function CartPanel({
  order,
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

  // Enter key to confirm delete dialog
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (showDeleteDialog && e.key === 'Enter') {
        e.preventDefault()
        if (order) {
          onDeleteOrder(order.id)
          setShowDeleteDialog(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showDeleteDialog, order, onDeleteOrder])

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
        // Check if this is the last unpaid item
        const unpaidItems = order?.items?.filter((i) => !i.isPaid) || []
        const isLastUnpaidItem = unpaidItems.length === 1 && unpaidItems[0].id === orderItemId

        if (isLastUnpaidItem) {
          // Show confirmation dialog for closing the table
          setShowDeleteDialog(true)
        } else {
          // Just remove the item normally
          onRemoveItem(orderItemId)
        }
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
    <div className="w-96 glass-panel cart-panel-accent border-l border-border/30 !border-t-0 flex flex-col h-full animate-in slide-in-from-right duration-700 relative overflow-hidden shadow-2xl">
      {/* Premium Glass Effect Background */}

      <div className="z-10 relative h-14 px-5 border-b border-border/10 bg-background/50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <h3 className="text-[17px] font-bold tracking-tight text-foreground/90">Adisyon</h3>
          {order?.items && order.items.length > 0 && (
            <span className="px-2 py-0.5 bg-muted/40 text-muted-foreground text-[11px] font-semibold rounded-lg border border-border/5">
              {order.items.reduce((sum, item) => sum + item.quantity, 0)} Ürün
            </span>
          )}
        </div>
        {order?.items && order.items.length > 0 && (
          <Button
            variant={isLocked ? 'default' : 'ghost'}
            size="sm"
            onClick={onToggleLock}
            className={cn(
              'h-8 gap-2 rounded-lg px-3 text-[11px] font-semibold transition-all duration-300',
              isLocked
                ? 'bg-warning/90 hover:bg-warning text-white shadow-sm'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/50'
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

      <div className="flex-1 min-h-0 overflow-hidden relative z-10 flex flex-col">
        {order?.items && order.items.length > 0 ? (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 flex flex-col gap-2">
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
                        'flex flex-wrap items-center justify-between gap-x-2 gap-y-2 py-2 px-2.5 rounded-xl border transition-all duration-200 relative overflow-hidden',
                        item.isPaid
                          ? 'bg-success/[0.03] border-success/10 opacity-50 border-l-2 border-l-success/40'
                          : 'bg-card/80 border-white/5 hover:bg-card hover:border-primary/10 border-l-2 border-l-primary/30 hover:shadow-sm'
                      )}
                    >
                      {/* Name and Quantity Group */}
                      <div className="flex items-baseline gap-1 flex-1 min-w-[160px]">
                        <div className="shrink-0 flex justify-start min-w-[1.1rem]">
                          {item.quantity > 1 && (
                            <span className="text-[13px] font-black text-rose-600 tabular-nums">
                              x{item.quantity}
                            </span>
                          )}
                        </div>
                        <p
                          className={cn(
                            'font-bold text-[14px] tracking-tight leading-snug break-words',
                            item.isPaid ? 'text-muted-foreground' : 'text-foreground/90'
                          )}
                        >
                          {productName.replace(/([a-z])([A-Z])/g, '$1 $2')}
                        </p>
                      </div>

                      {/* Price and Controls Group */}
                      <div className="flex items-center gap-3 ml-auto">
                        <p className="text-[13px] font-bold text-foreground/80 tabular-nums">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </p>

                        {!item.isPaid ? (
                          <QuantitySelector
                            quantity={item.quantity}
                            onUpdate={(newQty) =>
                              handleUpdateQuantity(item.id, item.productId, newQty)
                            }
                            isLocked={isLocked}
                          />
                        ) : (
                          <div className="px-2 py-0.5 bg-success/10 rounded-md border border-success/15 flex items-center gap-1">
                            <CheckCircle className="w-2.5 h-2.5 text-success" />
                            <span className="text-[9px] font-bold text-success uppercase">
                              Ödendi
                            </span>
                          </div>
                        )}
                      </div>
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
            <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-success/10 border border-success/10 backdrop-blur-sm">
              <span className="text-[10px] font-bold text-success/80 uppercase tracking-widest">
                Ara Toplam (Ödenen)
              </span>
              <span className="text-sm font-bold text-success tabular-nums">
                {formatCurrency(paidAmount)}
              </span>
            </div>
          )}

          {/* Total Amount Card with Improved Gradient */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background/40 to-muted/20 border border-primary/20 p-4 backdrop-blur-md shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="flex justify-between items-end relative z-10">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-primary/80 uppercase tracking-[0.15em] mb-0.5">
                  {paidAmount > 0 ? 'Ödenecek Kalan' : 'Genel Toplam'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-primary/70">₺</span>
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
