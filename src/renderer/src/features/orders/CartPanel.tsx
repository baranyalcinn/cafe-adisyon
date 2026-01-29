import React, { useState, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Trash2, CheckCircle, Lock, LockOpen, ShoppingBag } from 'lucide-react'
import { useSound } from '@/hooks/useSound'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn, formatCurrency } from '@/lib/utils'
import { soundManager } from '@/lib/sound'
import { Order } from '@/lib/api'
import { QuantitySelector } from '@/components/ui/QuantitySelector'
import { useFlyingCartStore } from '@/stores/useFlyingCartStore'

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
  const cartTargetRef = useRef<HTMLDivElement>(null)
  const setTargetRect = useFlyingCartStore((state) => state.setTargetRect)
  const { playAdd, playRemove, playClick } = useSound()

  React.useEffect((): (() => void) => {
    const updateRect = (): void => {
      if (cartTargetRef.current) {
        setTargetRect(cartTargetRef.current.getBoundingClientRect())
      }
    }

    // Initial update with a small delay to ensure layout is stable
    const timer = setTimeout(updateRect, 100)
    window.addEventListener('resize', updateRect)

    return () => {
      window.removeEventListener('resize', updateRect)
      clearTimeout(timer)
    }
  }, [setTargetRect])

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

      // Determine if it's an increment or decrement for sound feedback
      const currentQuantity = item?.quantity || 0
      const isIncrease = newQuantity > currentQuantity

      if (isIncrease) {
        playAdd()
      } else {
        playRemove()
      }

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
    [isLocked, order?.items, onUpdateItem, onRemoveItem, playAdd, playRemove]
  )

  const handleConfirmDelete = async (): Promise<void> => {
    if (order) {
      onDeleteOrder(order.id)
      setShowDeleteDialog(false)
    }
  }

  return (
    <div
      className="w-96 glass-panel cart-panel-accent border-l border-border/30 !border-t-0 flex flex-col h-full animate-in slide-in-from-right duration-700 relative overflow-hidden shadow-2xl"
      style={{ willChange: 'transform' }}
    >
      {/* Premium Glass Effect Background */}

      <div className="shrink-0 p-4 pb-2 z-20">
        <div className="relative rounded-2xl bg-muted/30 border border-white/5 p-3.5 pr-2.5 flex items-center justify-between gap-3 overflow-hidden shadow-sm">
          {/* Ambient Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />

          {/* Left: Icon & Info */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex flex-col min-w-0 relative z-10">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-sm font-bold leading-none tracking-tight text-foreground">
                  Adisyon
                </h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span>{order?.items?.length || 0} Ürün</span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-0.5 relative z-10">
            {/* Toggle Lock Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleLock}
              className={cn(
                'h-8 w-8 rounded-lg transition-colors',
                isLocked
                  ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                  : 'text-muted-foreground/40 hover:text-foreground hover:bg-muted/60'
              )}
              title={isLocked ? 'Masayı Aç' : 'Masayı Kilitle'}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
            </Button>

            {/* Clear Table Button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 rounded-lg transition-colors',
                !order?.items?.length
                  ? 'opacity-0 pointer-events-none'
                  : 'text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10'
              )}
              onClick={() => setShowDeleteDialog(true)}
              disabled={!order?.items || order.items.length === 0}
              title="Masayı Boşalt"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative z-10 flex flex-col">
        {order?.items && order.items.length > 0 ? (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 flex flex-col gap-2">
              <AnimatePresence mode="popLayout" initial={false}>
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
                      <motion.div
                        layout
                        key={item.id}
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95, transition: { duration: 0.2 } }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className={cn(
                          'premium-item flex flex-wrap items-center justify-between gap-x-2 gap-y-2 py-2 px-2.5 pl-3.5',
                          item.isPaid ? 'opacity-50' : ''
                        )}
                      >
                        {/* Premium Status Strip */}
                        <div
                          className={cn(
                            'absolute left-0 top-0 bottom-0 w-1 transition-colors duration-300',
                            item.isPaid ? 'bg-success/50' : 'bg-primary/50'
                          )}
                        />

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
                            <div className="px-2.5 py-1 bg-success/15 rounded-lg border border-success/20 flex items-center gap-1.5 shadow-sm">
                              <CheckCircle className="w-3 h-3 text-success animate-in zoom-in duration-300" />
                              <span className="text-[10px] font-black text-success uppercase tracking-tighter">
                                ÖDENDİ
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
              </AnimatePresence>
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

      <div className="p-4 border-t border-border/10 bg-background/50 relative z-10">
        <div className="flex flex-col gap-3.5 mb-3.5">
          {/* Combined Balance Card - Paid & Remaining in same box */}
          <div className="relative group p-6 premium-card ambient-glow overflow-hidden">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-primary/5 blur-2xl" />

            <div className="relative z-10 flex items-end justify-between">
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-[0.1em] mb-1">
                  {paidAmount > 0 ? 'Ödenecek Kalan' : 'Toplam'}
                </span>
                <span className="text-4xl font-black text-foreground tabular-nums tracking-tighter leading-none pt-1">
                  {formatCurrency(remainingAmount)}
                </span>
              </div>

              {/* Paid Status inside the same box on the right */}
              {paidAmount > 0 && (
                <div className="flex flex-col items-end text-right animate-in fade-in slide-in-from-right-2 duration-500">
                  <span className="text-[10px] font-bold text-success/60 uppercase tracking-widest mb-1">
                    Ödenen
                  </span>
                  <span className="text-lg font-black text-success tabular-nums leading-none">
                    {formatCurrency(paidAmount)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Button
          className="premium-button group/pay active:scale-95 transition-all hover:scale-[1.02] shadow-xl hover:shadow-primary/25"
          disabled={!order?.items || order.items.length === 0 || remainingAmount <= 0}
          onClick={() => {
            playClick()
            onPaymentClick()
          }}
        >
          <span className="relative z-10 uppercase tracking-widest text-sm">Ödeme Al</span>
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center transition-transform duration-300 group-hover/pay:scale-110 relative z-10">
            <CheckCircle className="w-4 h-4" />
          </div>
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
